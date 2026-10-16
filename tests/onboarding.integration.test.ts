import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { randomBytes } from "node:crypto";
import { initialConversation } from "../src/lib/onboarding/state";
import {
  createSession,
  getSession,
  extractWithModel,
} from "../src/lib/onboarding/server";
import {
  queueCharity,
  prepareCharity,
  charityIdentity,
  cachedCharityDocument,
} from "../src/lib/onboarding/intelligence";
import type { Candidate } from "../src/app/sorp-public-model";
const url = process.env.CONSOLE_DATABASE_URL || "";
if (
  !/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:55432\/onboarding_test$/.test(url)
)
  throw new Error("Use only the isolated local onboarding_test database.");
const db = new Pool({ connectionString: url });
after(async () => {
  await db.end();
});
const candidate = {
  name: "Synthetic Test Charity",
  locality: "Test",
  latestIncome: null,
  financialYearEnd: "",
  accountingBasis: "unknown",
  accountingBasisConfidence: "unknown",
  summary: "Synthetic test only",
  registrationNumber: "1234567",
  jurisdiction: "England and Wales",
  entityType: "registered_charity",
  website: "https://charity.example",
  officialUrl:
    "https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/1234567",
  reportUrl: "https://charity.example/annual.pdf",
  reportTitle: "Synthetic annual report",
  reportPeriod: "2025",
  publicReadiness: { impactReport: { found: false, title: "", url: "" } },
  sources: [],
} as Candidate;
test("additive migration applies in an isolated real PostgreSQL database", async () => {
  await db.query("DROP SCHEMA IF EXISTS research_console CASCADE");
  await db.query("CREATE SCHEMA research_console");
  await db.query(
    await readFile(
      new URL(
        "../migrations/012_conversational_onboarding.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
test("F: duplicate confirmation and concurrent workers retrieve and store once; cache reused", async () => {
  const first = await queueCharity(candidate),
    second = await queueCharity(candidate);
  assert.equal(first, second);
  let reads = 0,
    downloads = 0,
    writes = 0;
  const dependencies = {
    checkRobots: async () => ({ delay: 0, notice: null }),
    fetchPublic: async (url: string) => {
      reads++;
      return {
        url,
        status: 200,
        type: "text/html",
        body: "<html><title>Synthetic</title><main>Our mission is to help.</main></html>",
      };
    },
    fetchDocument: async () => {
      downloads++;
      return Buffer.from("%PDF-1.7\nsynthetic\n%%EOF");
    },
    storage: () =>
      ({
        send: async () => {
          writes++;
        },
      }) as never,
  };
  process.env.CHARITY_DOCUMENT_DOWNLOAD_ENABLED = "true";
  process.env.CHARITY_DOCUMENT_BUCKET = "synthetic";
  await Promise.all([
    prepareCharity(first, dependencies),
    prepareCharity(first, dependencies),
  ]);
  await prepareCharity(first, dependencies);
  assert.equal(reads, 2);
  assert.equal(downloads, 1);
  assert.equal(writes, 1);
  const {
    rows: [stored],
  } = await db.query(
    "SELECT * FROM research_console.charity_documents WHERE charity_identity=$1",
    [first],
  );
  assert.equal(stored.status, "stored");
  assert.match(stored.sha256, /^[a-f0-9]{64}$/);
  assert.ok(stored.object_key.endsWith(stored.sha256 + ".pdf"));
  assert.ok(stored.retrieved_at);
  const {
    rows: [job],
  } = await db.query(
    "SELECT * FROM research_console.charity_intelligence WHERE identity=$1",
    [first],
  );
  assert.equal(job.attempts, 1);
  assert.equal(job.profile.analysisPerformed, false);
  // A retry never downloads an already stored source again.
  await db.query(
    "UPDATE research_console.charity_intelligence SET status='failed',next_attempt_at=now() WHERE identity=$1",
    [first],
  );
  await prepareCharity(first, dependencies);
  assert.equal(downloads, 1);
});
test("F: missing sources fail gracefully with a bounded retry schedule", async () => {
  const c = { ...candidate, registrationNumber: "7654321", reportUrl: "" },
    id = await queueCharity(c);
  await prepareCharity(id, {
    checkRobots: async () => {
      throw new Error("blocked");
    },
    fetchPublic: async () => {
      throw new Error("must not fetch");
    },
    fetchDocument: async () => {
      throw new Error("must not download");
    },
    storage: () => null,
  });
  const {
    rows: [job],
  } = await db.query(
    "SELECT * FROM research_console.charity_intelligence WHERE identity=$1",
    [id],
  );
  assert.equal(job.status, "failed");
  assert.equal(job.attempts, 1);
  assert.ok(new Date(job.next_attempt_at) > new Date());
  assert.ok(job.profile.limitations.length);
  await prepareCharity(id);
  const {
    rows: [again],
  } = await db.query(
    "SELECT attempts FROM research_console.charity_intelligence WHERE identity=$1",
    [id],
  );
  assert.equal(again.attempts, 1);
});
test("canonical identity rejects untrusted regulators and invalid numbers", () => {
  assert.throws(() =>
    charityIdentity({
      ...candidate,
      officialUrl: "https://evil.example/1234567",
    }),
  );
  assert.throws(() =>
    charityIdentity({ ...candidate, registrationNumber: "unknown" }),
  );
  assert.equal(charityIdentity(candidate), "ccew:1234567");
});
test("private drafts require the unguessable cookie and expire", async () => {
  const id = await createSession({ utm_source: "synthetic" });
  assert.equal(id.length, 64);
  const request = (token: string) =>
    new Request("https://sorp2026.org", {
      headers: { cookie: `sorp_onboarding=${token}` },
    });
  assert.equal((await getSession(request(id)))?.id, id);
  assert.equal(
    await getSession(request(randomBytes(32).toString("hex"))),
    undefined,
  );
  await db.query(
    "UPDATE research_console.onboarding_sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [id],
  );
  assert.equal(await getSession(request(id)), undefined);
});
test("model extraction sends bounded facts, no tools/history; evidence and global budget enforced", async () => {
  const original = globalThis.fetch;
  process.env.OPENAI_API_KEY = "synthetic-test-not-a-real-key";
  const id = await createSession({});
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.equal(body.tools, undefined);
    assert.equal(body.max_output_tokens, 1400);
    assert.equal(JSON.parse(body.input).history, undefined);
    return Response.json({
      status: "completed",
      output: [
        {
          content: [
            {
              text: JSON.stringify({
                facts: [
                  { field: "name", value: "Sarah Jones", quote: "Sarah Jones" },
                  {
                    field: "email",
                    value: "invented@example.com",
                    quote: "invented@example.com",
                  },
                  {
                    field: "charities",
                    value: "Brainstrust",
                    quote: "Brainstrust",
                  },
                ],
              }),
            },
          ],
        },
      ],
    });
  };
  try {
    const patch = await extractWithModel(
      "Sarah Jones works with Brainstrust",
      initialConversation(),
      id,
    );
    assert.equal(patch.name, "Sarah Jones");
    assert.equal(patch.email, undefined);
    assert.deepEqual(patch.charities, ["Brainstrust"]);
    process.env.SORP_ONBOARDING_DAILY_USD = "0";
    await assert.rejects(
      () => extractWithModel("Again", initialConversation(), id),
      /budget/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    delete process.env.OPENAI_API_KEY;
    delete process.env.SORP_ONBOARDING_DAILY_USD;
  }
});

test("cached PDF access is account-scoped and validates stored checksums", async () => {
  const identity = charityIdentity(candidate),
    bytes = Buffer.from("%PDF-1.7\nsynthetic\n%%EOF");
  await db.query(
    `INSERT INTO research_console.onboarding_profiles(account_id,facts,messages,charity_identity,attribution) VALUES('synthetic-private-a','{}','[]',$1,'{}')`,
    [identity],
  );
  process.env.CHARITY_DOCUMENT_ENDPOINT = "https://objects.example";
  process.env.CHARITY_DOCUMENT_BUCKET = "synthetic";
  process.env.CHARITY_DOCUMENT_ACCESS_KEY_ID = "synthetic";
  process.env.CHARITY_DOCUMENT_SECRET_ACCESS_KEY = "synthetic";
  const original = S3Client.prototype.send;
  S3Client.prototype.send = (async () => ({
    Body: Readable.from([bytes]),
    ContentLength: bytes.length,
  })) as unknown as typeof original;
  try {
    assert.equal(
      await cachedCharityDocument("synthetic-private-b", candidate.reportUrl),
      null,
    );
    assert.equal(
      await cachedCharityDocument(
        "synthetic-private-a",
        candidate.reportUrl,
        "ccew:7654321",
      ),
      null,
    );
    const document = await cachedCharityDocument(
      "synthetic-private-a",
      candidate.reportUrl,
      identity,
    );
    assert.deepEqual(document?.bytes, bytes);
    await db.query(
      "UPDATE research_console.charity_documents SET sha256='invalid' WHERE charity_identity=$1",
      [identity],
    );
    await assert.rejects(
      () => cachedCharityDocument("synthetic-private-a", candidate.reportUrl),
      /checksum/,
    );
  } finally {
    S3Client.prototype.send = original;
    for (const key of [
      "CHARITY_DOCUMENT_ENDPOINT",
      "CHARITY_DOCUMENT_BUCKET",
      "CHARITY_DOCUMENT_ACCESS_KEY_ID",
      "CHARITY_DOCUMENT_SECRET_ACCESS_KEY",
    ])
      delete process.env[key];
  }
});
