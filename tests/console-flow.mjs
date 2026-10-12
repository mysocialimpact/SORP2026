import assert from "node:assert/strict";
import { chromium } from "playwright";
import ExcelJS from "exceljs";
import pg from "pg";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
const base = "http://127.0.0.1:3000";
const client = new pg.Client({
  connectionString: "postgresql://postgres@127.0.0.1:5433/postgres",
});
await client.connect();
// This literal loopback connection points only to the disposable QA container.
await client.query("DROP SCHEMA IF EXISTS research_console CASCADE");
await client.query(
  fs.readFileSync("migrations/001_research_console.sql", "utf8"),
);
for(const migration of ['002_console_completion.sql','003_icaew_benchmark.sql'])await client.query(fs.readFileSync('migrations/'+migration,'utf8'));
await client.query(
  execFileSync(process.execPath, ["scripts/console-seed.mjs"], {
    encoding: "utf8",
  }),
);
async function call(path, body, cookie = "console_qa=owner", origin = base) {
  const r = await fetch(base + "/api/console/" + path, {
    method: body ? "POST" : "GET",
    headers: { cookie, origin, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const data = await r.json();
  return { status: r.status, data };
}
let checks = 0;
const ok = (condition, message) => {
  assert.ok(condition, message);
  console.log("PASS", message);
  checks++;
};
for (const path of [
  "dashboard/",
  "firms/",
  "export/?format=xlsx",
  "methodology/",
  "imports/",
  "runs/00000000-0000-0000-0000-000000000000/",
]) {
  ok(
    (await call(path, undefined, "")).status === 401,
    "Unauthenticated " + path,
  );
  ok(
    (await call(path, undefined, "console_qa=other")).status === 403,
    "Other user " + path,
  );
}
ok(
  (
    await call(
      "firms/",
      { name: "Cross-site fixture" },
      "console_qa=owner",
      "https://evil.example",
    )
  ).status === 403,
  "Cross-site writes blocked",
);
const anon = await fetch(base + "/console/", { redirect: "manual" });
ok(
  [307, 308].includes(anon.status) &&
    anon.headers.get("location")?.includes("/console/login"),
  "Private page redirects before serving console",
);
const bad = await fetch(base + "/console/firms/", {
  headers: { cookie: "console_qa=other" },
  redirect: "manual",
});
ok(
  bad.headers.get("location")?.includes("unauthorised"),
  "Wrong identity receives unauthorised page",
);
const before = (await call("dashboard/")).data;
ok(before.baseline === null, "Baseline explicitly unverified");
ok(
  before.counts.researched === 0,
  "Imported candidates not counted as researched",
);
const f = (
  await call("firms/", {
    name: "QA Evidence Practice",
    website: "https://example.org",
  })
).data.firm;
ok(!!f.id, "New firm persisted");
const duplicate = (
  await call("firms/", {
    name: " QA   Evidence Practice ",
    website: "https://www.example.org",
  })
).data;
ok(duplicate.matches[0].id === f.id, "Name/domain duplicates identified");
ok(
  (
    await call(`firms/${f.id}/people/`, {
      name: "QA Specialist",
      role: "QA role",
      dcha: "true",
      source_url: "https://example.org/people",
    })
  ).status === 200,
  "Source-linked specialist can be saved",
);
ok(
  (
    await call(`firms/${f.id}/offices/`, {
      address: "QA address",
      town: "QA town",
      country: "England",
      source_url: "https://example.org/offices",
    })
  ).status === 200,
  "Source-linked office can be saved",
);
let ev = (
  await call(`firms/${f.id}/evidence/`, {
    title: "QA fixture source",
    summary: "Explicit test fixture, not real firm research.",
    source_type: "Firm website",
    category: "services",
    url: "https://example.org/charities",
    accessed_at: "2026-10-12",
  })
).data;
ok(!!ev.id, "Raw evidence persisted");
const scores = { services: 18, people: 0, sorp: 0, clients: 0, recognition: 0 };
const reasons = Object.fromEntries(
  Object.keys(scores).map((k) => [
    k,
    "QA fixture assessment: category checked; only service evidence supplied.",
  ]),
);
const refs = {
  services: [ev.id],
  people: [],
  sorp: [],
  clients: [],
  recognition: [],
};
const assessment = {
  scores,
  reasons,
  evidence_ids: refs,
  complete: true,
  confidence: "Low",
  sorp: "None found",
  gaps: "Test data only",
};
ok(
  (await call(`firms/${f.id}/assessment/`, { ...assessment, complete: false }))
    .status === 400,
  "Incomplete work cannot be scored",
);
ok(
  (
    await call(`firms/${f.id}/assessment/`, {
      ...assessment,
      evidence_ids: { ...refs, services: [] },
    })
  ).status === 400,
  "Positive scores need sources",
);
ok(
  (await call(`firms/${f.id}/assessment/`, assessment)).status === 200,
  "Traceable manual assessment saved",
);
await call(`firms/${f.id}/assessment/`, {
  ...assessment,
  scores: { ...scores, services: 20 },
});
let report = (await call(`firms/${f.id}/`)).data;
ok(
  report.assessments.length === 2 &&
    report.assessments[1].total === 18 &&
    report.assessments[0].total === 20,
  "Score edit preserves original assessment",
);
ok(report.evidence.length === 1, "Raw evidence separate from scoring history");
await call(`firms/${f.id}/review/`, {
  decision: "Note",
  notes: "QA private note",
});
await call(`firms/${f.id}/review/`, { decision: "Approved", notes: "QA only" });
report = (await call(`firms/${f.id}/`)).data;
ok(
  report.firm.status === "Approved" &&
    report.reviews.some((r) => r.notes === "QA private note"),
  "Review notes and approval persisted",
);
await call(`firms/${f.id}/flag/`, { id: ev.id, state: "Questionable" });
report = (await call(`firms/${f.id}/`)).data;
ok(
  report.firm.status === "Ready for Marcus" &&
    report.evidence[0].state === "Questionable",
  "Questionable evidence invalidates approval",
);
const methods = (await call("methodology/")).data;
await call("methodology/", {
  boundaries: [0, 10, 30, 50, 70, 100],
  notes: "QA boundary revision, scores must remain unchanged.",
});
report = (await call(`firms/${f.id}/`)).data;
ok(
  report.methods.length === methods.length + 1 &&
    report.assessments[0].total === 20,
  "Boundary revision preserves scores and methodology history",
);
const f2 = (await call("firms/", { name: "QA Second Practice" })).data.firm;
await call(`firms/${f2.id}/review/`, {
  decision: "Research completed — unscored",
  notes: "QA sufficient source review, scoring remains outstanding.",
});
ok(
  (await call(`firms/${f2.id}/`)).data.firm.research_completed_at !== null,
  "Research completion independent from scoring",
);
ok(
  (await call("compare/?ids=" + [f.id, f2.id].join(","))).data.length === 2,
  "Two firms can be compared",
);
ok(
  (await call("firms/?q=QA%20Evidence")).data.rows.some((x) => x.id === f.id),
  "Server-side search finds firm",
);
ok((await call("firms/?queue=true")).data.total > 0, "Queue is populated");
const csv =
  "Firm name,Website,Location,Postcode\nQA Import Practice,https://example.net,London,SW1A 1AA\nQA Evidence Practice,https://example.org,London,SW1A 1AA";
let form = new FormData();
form.append("file", new File([csv], "qa.csv", { type: "text/csv" }));
let resp = await fetch(base + "/api/console/imports/", {
  method: "POST",
  headers: { cookie: "console_qa=owner", origin: base },
  body: form,
});
let batch = await resp.json();
ok(resp.ok && batch.summary.candidates === 2, "CSV preview reads rows");
batch = (await call("imports/" + batch.id + "/", {})).data;
ok(
  batch.summary.imported === 1 && batch.summary.duplicates === 1,
  "Import skips duplicate without overwriting",
);
ok(
  (await call("imports/" + batch.id + "/", {})).data.summary.imported === 1,
  "Reimport is idempotent",
);
const book = new ExcelJS.Workbook();
book.addWorksheet("Candidates").addRows([
  ["Firm name", "Website"],
  ["QA Workbook Practice", "https://example.edu"],
]);
form = new FormData();
form.append("file", new File([await book.xlsx.writeBuffer()], "qa.xlsx"));
resp = await fetch(base + "/api/console/imports/", {
  method: "POST",
  headers: { cookie: "console_qa=owner", origin: base },
  body: form,
});
batch = await resp.json();
ok(resp.ok && batch.summary.candidates === 1, "XLSX preview works");
resp = await fetch(base + "/api/console/export/?format=xlsx", {
  headers: { cookie: "console_qa=owner" },
});
const exportBook = new ExcelJS.Workbook();
await exportBook.xlsx.load(await resp.arrayBuffer());
ok(
  exportBook.worksheets.some((s) => s.name === "evidence") &&
    exportBook.worksheets.some((s) => s.name === "assessments"),
  "XLSX export preserves evidence and scores separately",
);
resp = await fetch(base + "/api/console/export/?format=csv", {
  headers: { cookie: "console_qa=owner" },
});
ok((await resp.text()).includes("QA Evidence Practice"), "CSV export works");
const protectedQuery = await client.query(
  "SELECT count(*)::int count FROM research_console.history WHERE firm_id=$1",
  [f.id],
);
ok(
  protectedQuery.rows[0].count >= 5,
  "Recoverable change trail persisted in Postgres",
);
const mergeSource = (await call("firms/", { name: "QA Merge Source" })).data
  .firm;
const mergeTarget = (await call("firms/", { name: "QA Merge Target" })).data
  .firm;
const mergeEvidence = (
  await call(`firms/${mergeSource.id}/evidence/`, {
    title: "Merge provenance",
    summary: "QA merge fixture, not public research.",
    source_type: "Internal note",
  })
).data;
await call(`firms/${mergeSource.id}/merge/`, { target: mergeTarget.id });
const mergedReport = (await call(`firms/${mergeTarget.id}/`)).data;
ok(
  mergedReport.evidence.some((e) => e.id === mergeEvidence.id),
  "Confirmed merge retains source evidence",
);
ok(
  mergedReport.history
    .find((h) => h.entity === "merge")
    .previous.moved.evidence.includes(mergeEvidence.id),
  "Merge history records exact moved identities for recovery",
);
const browser = await chromium.launch({
  executablePath: fs.existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined,
  args: ["--no-sandbox"],
});
for (const width of [1440, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
  });
  await context.addCookies([{ name: "console_qa", value: "owner", url: base }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/console/");
  await page.getByText("unique firms in your database.").waitFor();
  ok(
    await page
      .locator("h1")
      .innerText()
      .then((s) => s.includes("charity-accounting")),
    "Mission loads at width " + width,
  );
  ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    "No horizontal overflow at " + width,
  );
  await page.screenshot({
    path: `/tmp/console-mission-${width}.png`,
    fullPage: true,
    animations: "disabled",
  });
  const audit = await new AxeBuilder({ page }).analyze();
  ok(
    audit.violations.filter((v) => ["serious", "critical"].includes(v.impact))
      .length === 0,
    "Mission accessibility at " + width,
  );
  await page
    .getByLabel("Accountancy firm name or website")
    .fill("Burton Sweet");
  await page.getByRole("button", { name: "Check this accountant" }).click();
  await page.getByText("Possible existing records").waitFor();
  ok(
    (await page
      .getByRole("link", { name: "View existing research / refresh" })
      .count()) === 1,
    "Check-accountant entry point finds existing research at " + width,
  );
  await page.goto(base + "/console/firm/" + f.id + "/");
  await page
    .getByRole("heading", { name: "QA Evidence Practice", exact: true })
    .waitFor();
  await page
    .getByText("Dedicated charity services", { exact: true })
    .first()
    .click();
  ok(
    await page
      .getByText(
        "QA fixture assessment: category checked; only service evidence supplied.",
        { exact: true },
      )
      .first()
      .isVisible(),
    "Score explanation expands at " + width,
  );
  await page.screenshot({
    path: `/tmp/console-report-${width}.png`,
    fullPage: true,
    animations: "disabled",
  });
  ok(errors.length === 0, "No browser exceptions at " + width);
  await context.close();
}
await browser.close();
await client.end();
console.log(`${checks} console checks passed.`);
