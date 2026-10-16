import "server-only";
import { createHash } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { lookup } from "node:dns/promises";
import { load } from "cheerio";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { query } from "@/lib/console/db";
import {
  fetchPublic,
  checkRobots,
  safeResearchUrl,
  assertPublicAddress,
  agent,
} from "@/lib/console/fetch-public";
import type { Candidate } from "@/app/sorp-public-model";
export function charityIdentity(candidate: Candidate) {
  const url = safeResearchUrl(candidate.officialUrl);
  const regulator =
    url.hostname.endsWith(".charitycommission.gov.uk") ||
    url.hostname === "register-of-charities.charitycommission.gov.uk"
      ? "ccew"
      : url.hostname === "www.oscr.org.uk" || url.hostname === "oscr.org.uk"
        ? "oscr"
        : url.hostname === "www.charitycommissionni.org.uk" ||
            url.hostname === "charitycommissionni.org.uk"
          ? "ccni"
          : "";
  const number = candidate.registrationNumber
    .replace(/[\s-]/g, "")
    .toUpperCase();
  if (!regulator || !/^(?:SC|NIC)?\d{5,8}$/.test(number) || !candidate.name)
    throw new Error(
      "A regulator and charity number are needed for a reliable match.",
    );
  return `${regulator}:${number}`;
}
export async function queueCharity(candidate: Candidate) {
  const identity = charityIdentity(candidate);
  await query(
    `INSERT INTO research_console.charity_intelligence(identity,candidate) VALUES($1,$2) ON CONFLICT(identity) DO NOTHING`,
    [identity, JSON.stringify(candidate)],
  );
  return identity;
}
/** Public HTTPS, DNS pinned, bounded binary retrieval. Never follows a redirect blindly. */
export async function fetchDocument(input: string, depth = 0): Promise<Buffer> {
  const url = safeResearchUrl(input);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length) throw new Error("No public address");
  addresses.forEach((a) => assertPublicAddress(a.address));
  const result = await new Promise<{ bytes: Buffer; location?: string }>(
    (resolve, reject) => {
      const req = httpsRequest(
        url,
        {
          headers: {
            "user-agent": agent,
            accept: "application/pdf",
            "accept-encoding": "identity",
          },
          lookup: (_h, options, cb) =>
            options.all
              ? cb(null, [addresses[0]])
              : cb(null, addresses[0].address, addresses[0].family),
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
            res.resume();
            resolve({ bytes: Buffer.alloc(0), location: res.headers.location });
            return;
          }
          if (
            res.statusCode !== 200 ||
            !String(res.headers["content-type"]).includes("application/pdf")
          ) {
            res.resume();
            reject(new Error("No accessible PDF"));
            return;
          }
          const chunks: Buffer[] = [];
          let count = 0;
          res.on("data", (b: Buffer) => {
            count += b.length;
            if (count > 8_000_000) res.destroy(new Error("Document too large"));
            else chunks.push(b);
          });
          res.on("error", reject);
          res.on("end", () => resolve({ bytes: Buffer.concat(chunks) }));
        },
      );
      const timer = setTimeout(
        () => req.destroy(new Error("Document timed out")),
        10000,
      );
      req.on("close", () => clearTimeout(timer));
      req.on("error", reject);
      req.end();
    },
  );
  if (result.location) {
    const next = safeResearchUrl(new URL(result.location, url).href);
    if (depth >= 2 || next.hostname !== url.hostname)
      throw new Error("Document redirect requires review");
    await checkRobots(next.href);
    return fetchDocument(next.href, depth + 1);
  }
  if (result.bytes.subarray(0, 5).toString() !== "%PDF-")
    throw new Error("Invalid PDF");
  return result.bytes;
}
function storage() {
  const endpoint = process.env.CHARITY_DOCUMENT_ENDPOINT;
  if (
    !endpoint ||
    !process.env.CHARITY_DOCUMENT_BUCKET ||
    !process.env.CHARITY_DOCUMENT_ACCESS_KEY_ID ||
    !process.env.CHARITY_DOCUMENT_SECRET_ACCESS_KEY
  )
    return null;
  safeResearchUrl(endpoint);
  return new S3Client({
    endpoint,
    region: process.env.CHARITY_DOCUMENT_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.CHARITY_DOCUMENT_ACCESS_KEY_ID,
      secretAccessKey: process.env.CHARITY_DOCUMENT_SECRET_ACCESS_KEY,
    },
  });
}
export async function prepareCharity(
  identity: string,
  dependencies = { fetchPublic, checkRobots, fetchDocument, storage },
) {
  const [job] = await query<{ candidate: Candidate }>(
    `UPDATE research_console.charity_intelligence SET status='running',attempts=attempts+1,lease_until=now()+interval '5 minutes' WHERE identity=$1 AND attempts<3 AND next_attempt_at<=now() AND (status IN ('queued','failed','partial') OR (status='running' AND lease_until<now())) RETURNING candidate`,
    [identity],
  );
  if (!job) return;
  const c = job.candidate;
  const sources: {
    url: string;
    retrievedAt: string;
    title: string;
    text: string;
  }[] = [];
  const limitations: string[] = [];
  const documents = new Map<
    string,
    { kind: string; title: string; publicationDate: string | null }
  >();
  if (c.reportUrl)
    documents.set(c.reportUrl, {
      kind: "accounts-and-trustees-report",
      title: c.reportTitle || "Filed accounts and trustees’ report",
      publicationDate: c.reportPeriod || null,
    });
  if (
    c.publicReadiness?.impactReport?.found &&
    c.publicReadiness.impactReport.url
  )
    documents.set(c.publicReadiness.impactReport.url, {
      kind: "impact-report",
      title: c.publicReadiness.impactReport.title || "Impact report",
      publicationDate: null,
    });
  const robots = new Map();
  try {
    const pages = [c.officialUrl, c.website].filter(Boolean);
    for (let i = 0; i < Math.min(pages.length, 4); i++) {
      const url = safeResearchUrl(pages[i]);
      try {
        const policy = await dependencies.checkRobots(url.href, robots);
        // Real publisher crawl delay; bounded pages and absolute per-page timeout.
        await new Promise((resolve) => setTimeout(resolve, policy.delay));
        const page = await dependencies.fetchPublic(url.href);
        if (page.status !== 200 || !page.type.includes("html"))
          throw new Error("Page unavailable");
        const $ = load(page.body);
        $("script,style,nav,footer,header").remove();
        sources.push({
          url: page.url,
          retrievedAt: new Date().toISOString(),
          title: $("title").text().slice(0, 200),
          text:
            $("main").text().replace(/\s+/g, " ").trim().slice(0, 4000) ||
            $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000),
        });
        $("a[href]").each((_index, element) => {
          const label = $(element).text().replace(/\s+/g, " ").trim();
          try {
            const href = safeResearchUrl(
              new URL($(element).attr("href")!, url).href,
            );
            if (href.hostname !== url.hostname) return;
            if (
              /\.pdf(?:\?|$)/i.test(href.href) &&
              /annual|accounts|trustees|impact report/i.test(label) &&
              documents.size < 6
            )
              documents.set(href.href, {
                kind: /impact/i.test(label) ? "impact-report" : "annual-report",
                title: label.slice(0, 200),
                publicationDate: null,
              });
            else if (
              pages.length < 4 &&
              /about us|our (?:mission|impact)|annual reports/i.test(label) &&
              !pages.includes(href.href)
            )
              pages.push(href.href);
          } catch {
            /* Ignore unsafe links. */
          }
        });
      } catch {
        limitations.push(`Could not retrieve ${url.hostname}.`);
      }
    }
    const s3 = dependencies.storage();
    let downloads = 0;
    for (const [url, doc] of [...documents].slice(0, 6)) {
      try {
        safeResearchUrl(url);
        const [cached] = await query<{ object_key: string }>(
          "SELECT object_key FROM research_console.charity_documents WHERE charity_identity=$1 AND source_url=$2",
          [identity, url],
        );
        if (cached?.object_key) continue;
        await query(
          `INSERT INTO research_console.charity_documents(charity_identity,source_url,kind,title,publication_date,status) VALUES($1,$2,$3,$4,$5,'located') ON CONFLICT(charity_identity,source_url) DO NOTHING`,
          [identity, url, doc.kind, doc.title, doc.publicationDate],
        );
        if (
          !s3 ||
          process.env.CHARITY_DOCUMENT_DOWNLOAD_ENABLED !== "true" ||
          downloads >= 2
        )
          continue;
        const policy = await dependencies.checkRobots(url, robots);
        await new Promise((resolve) => setTimeout(resolve, policy.delay));
        downloads++;
        const bytes = await dependencies.fetchDocument(url),
          digest = createHash("sha256").update(bytes).digest("hex");
        const key = `charity-intelligence/${identity.replace(":", "/")}/${digest}.pdf`;
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.CHARITY_DOCUMENT_BUCKET,
            Key: key,
            Body: bytes,
            ContentType: "application/pdf",
            Metadata: { sha256: digest },
          }),
          { abortSignal: AbortSignal.timeout(10000) },
        );
        await query(
          `UPDATE research_console.charity_documents SET object_key=$3,sha256=$4,bytes=$5,retrieved_at=now(),status='stored' WHERE charity_identity=$1 AND source_url=$2`,
          [identity, url, key, digest, bytes.length],
        );
      } catch {
        limitations.push(`A public document could not be downloaded.`);
      }
    }
    if (!s3)
      limitations.push(
        "Document storage is not connected; source links are retained.",
      );
    await query(
      `UPDATE research_console.charity_intelligence SET status=$2,profile=$3,lease_until=null,next_attempt_at=now()+interval '1 hour',updated_at=now() WHERE identity=$1`,
      [
        identity,
        sources.length ? (limitations.length ? "partial" : "ready") : "failed",
        JSON.stringify({
          sources,
          limitations,
          preparedAt: new Date().toISOString(),
          analysisPerformed: false,
        }),
      ],
    );
    if (!sources.length)
      await query(
        "UPDATE research_console.charity_intelligence SET next_attempt_at=now()+interval '1 hour' WHERE identity=$1",
        [identity],
      );
  } catch {
    await query(
      "UPDATE research_console.charity_intelligence SET status='failed',lease_until=null,next_attempt_at=now()+interval '1 hour',updated_at=now() WHERE identity=$1",
      [identity],
    );
  }
}

/** Read public cached bytes only for the charity linked to the verified account. */
export async function cachedCharityDocument(
  accountId: string,
  sourceUrl: string,
  expectedIdentity?: string,
) {
  const [document] = await query<{
    charity_identity: string;
    object_key: string;
    sha256: string;
    bytes: number;
    title: string;
    retrieved_at: string;
  }>(
    `SELECT d.* FROM research_console.charity_documents d JOIN research_console.onboarding_profiles p ON p.charity_identity=d.charity_identity WHERE p.account_id=$1 AND d.source_url=$2 AND d.status='stored' AND d.object_key IS NOT NULL`,
    [accountId, sourceUrl],
  );
  if (
    !document ||
    (expectedIdentity && document.charity_identity !== expectedIdentity) ||
    document.bytes > 8_000_000
  )
    return null;
  const s3 = storage();
  if (!s3) return null;
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.CHARITY_DOCUMENT_BUCKET,
      Key: document.object_key,
    }),
    { abortSignal: AbortSignal.timeout(10000) },
  );
  if (!result.Body || (result.ContentLength || 0) > 8_000_000) return null;
  const parts: Uint8Array[] = [];
  let size = 0;
  for await (const part of result.Body as AsyncIterable<Uint8Array>) {
    size += part.byteLength;
    if (size > 8_000_000) throw new Error("Stored document exceeds limit");
    parts.push(part);
  }
  const bytes = Buffer.concat(parts);
  if (createHash("sha256").update(bytes).digest("hex") !== document.sha256)
    throw new Error("Stored document checksum mismatch");
  return { ...document, bytes };
}
