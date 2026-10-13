// Contract test only: mocked OpenAI responses + real disposable local Postgres.
// This does not substitute for scripts/console-verify-openai.ts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query } from "../src/lib/console/db";
import { discoverFirm } from "../src/lib/console/discovery";
import { createFirm, report } from "../src/lib/console/repository";
import { startResearch, runResearch } from "../src/lib/console/research";
import { response, aiUsageSummary } from "../src/lib/console/openai-response";
const db = new URL(process.env.CONSOLE_DATABASE_URL ?? "");
assert.equal(db.hostname, "127.0.0.1");
assert.equal(db.port, "5433");
process.env.OPENAI_API_KEY = "local-contract-test-not-a-real-key";
const id = randomUUID();
const paragraphs = [
  "Our dedicated charity team provides charity accounts, audit, VAT, governance and payroll services. [1]",
  "Jane Wilson FCA is the senior charity audit partner responsible for charity accounting services. [2]",
  "Our article explains Charity SORP 2026 and the three-tier reporting framework for charities. [3]",
];
const text = paragraphs.join("\n\n");
const urls = [
  "https://qa-ai.example/charities",
  "https://qa-ai.example/team/jane-wilson",
  "https://qa-ai.example/insights/sorp",
];
let calls = 0;
let mode = "success";
globalThis.fetch = async (input, init) => {
  assert.equal(input, "https://api.openai.com/v1/responses");
  const body = JSON.parse(String(init?.body));
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 12000);
  assert.ok(
    !JSON.stringify(body).includes("local-contract-test-not-a-real-key"),
  );
  calls++;
  if (mode === "transport-error") throw new TypeError("fetch failed");
  if (mode === "unauthorised")
    return Response.json(
      { error: { message: "secret error deliberately not surfaced" } },
      { status: 401 },
    );
  if (body.tools) {
    assert.equal(body.tools[0].type, "web_search");
    assert.equal(body.max_tool_calls, 8);
    return Response.json({
      id: "search-" + id,
      status: "completed",
      usage: { input_tokens: 900, output_tokens: 400 },
      output: [
        { type: "web_search_call", status: "completed" },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text,
              annotations: paragraphs.map((p, i) => ({
                type: "url_citation",
                url: urls[i],
                title: "QA source " + i,
                start_index: text.indexOf(`[${i + 1}]`),
                end_index: text.indexOf(`[${i + 1}]`) + 3,
              })),
            },
          ],
        },
      ],
    });
  }
  assert.equal(body.text.format.type, "json_schema");
  if (body.text.format.schema.properties.candidates)
    return Response.json({
      id: "identity-" + id,
      status: "completed",
      usage: { input_tokens: 200, output_tokens: 100 },
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                candidates: [
                  {
                    name: "QA AI " + id,
                    website: "https://qa-ai.example/",
                    description: "Cited official-domain identity.",
                  },
                ],
              }),
            },
          ],
        },
      ],
    });
  const extraction = {
    identity_matches: true,
    coverage: ["services", "people", "sorp", "clients", "recognition"].map(
      (category) => ({
        category,
        checked: true,
        limitation: "Contract fixture: searched this category.",
      }),
    ),
    evidence: [
      { passage_id: 0, category: "services" },
      { passage_id: 1, category: "people" },
      { passage_id: 2, category: "sorp" },
    ],
    people: [
      {
        passage_id: 1,
        name: "Jane Wilson",
        role: "senior charity audit partner",
        qualifications: ["FCA"],
      },
    ],
  };
  return Response.json({
    id: "extract-" + id,
    status: "completed",
    usage: { input_tokens: 800, output_tokens: 300 },
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(extraction) }],
      },
    ],
  });
};
async function main() {
  const discovery = await discoverFirm("QA unknown " + id);
  assert.equal(discovery.candidates.length, 1);
  assert.equal(calls, 2);
  const cachedDiscovery = await discoverFirm("QA unknown " + id);
  assert.deepEqual(cachedDiscovery.candidates, discovery.candidates);
  assert.equal(calls, 2);
  const { firm } = await createFirm(
    {
      ...discovery.candidates[0],
      distinct: true,
    },
    "Local AI contract test",
  );
  assert.ok(firm);
  const run = await startResearch(firm.id, "Local AI contract test", {
    refresh: true,
  });
  await runResearch(run.id);
  const saved = await report(firm.id);
  assert.equal(saved.runs[0].status, "collected");
  assert.equal(saved.evidence.length, 3);
  assert.equal(saved.people.length, 1);
  assert.ok(saved.assessments[0].total > 0);
  assert.equal(Object.keys(saved.assessments[0].scores).length, 5);
  const [assessment] = await query<{
    awards: Array<{ evidence_id: string; source_url: string; points: number }>;
  }>("SELECT awards FROM research_console.assessments WHERE run_id=$1", [
    run.id,
  ]);
  assert.equal(
    assessment.awards.reduce((s, a) => s + a.points, 0),
    saved.assessments[0].total,
  );
  assert.ok(
    assessment.awards.every((a) =>
      saved.evidence.some(
        (e) => e.id === a.evidence_id && e.url === a.source_url,
      ),
    ),
  );
  const usage = await query<{
    status: string;
    estimated_usd: string;
    response_id: string;
  }>(
    "SELECT status,estimated_usd,response_id FROM research_console.ai_usage WHERE run_id=$1",
    [run.id],
  );
  assert.equal(usage.length, 2);
  assert.ok(
    usage.every(
      (u) =>
        u.status === "completed" &&
        Number(u.estimated_usd) > 0 &&
        u.response_id,
    ),
  );
  const cached = await startResearch(firm.id, "Local cache test");
  assert.equal(cached.id, run.id);
  assert.equal(cached.created, false);
  assert.equal(calls, 4);
  await query(
    "UPDATE research_console.evidence SET state='Questionable' WHERE id=$1",
    [saved.evidence[0].id],
  );
  const retry = await startResearch(
    firm.id,
    "Local flagged-evidence cache test",
  );
  assert.equal(retry.created, true);
  assert.notEqual(retry.id, run.id);
  mode = "unauthorised";
  await runResearch(retry.id);
  const failed = await report(firm.id);
  assert.equal(failed.runs[0].status, "failed");
  assert.ok(
    (failed.runs[0].limitations as string[]).some((l) => l.includes("401")),
  );
  assert.equal(failed.assessments.length, 1);
  assert.equal(failed.evidence.length, 3);
  assert.ok(!JSON.stringify(failed).includes("secret error deliberately"));
  const rejected = await query<{ estimated_usd: string }>(
    "SELECT estimated_usd FROM research_console.ai_usage WHERE run_id=$1",
    [retry.id],
  );
  assert.equal(Number(rejected[0].estimated_usd), 0);
  mode = "transport-error";
  await assert.rejects(
    response("Transport failure test", {
      purpose: "transport-test",
      search: true,
    }),
    /fetch failed/,
  );
  const callCount = calls;
  process.env.CONSOLE_AI_DAILY_USD = "0";
  await assert.rejects(
    response("No paid request should happen", {
      purpose: "budget-test",
      search: true,
    }),
    /spending limit/,
  );
  assert.equal(calls, callCount);
  const summary = await aiUsageSummary();
  assert.ok(
    Number(summary.month_usd) > 3,
    "Unknown failure charge keeps its reservation",
  );
  console.log(
    "PASS mocked-provider + real local Postgres: citation storage, scoring, people, report, usage, caching, flagged evidence, HTTP failure preservation and zero-budget stop. NOT a live OpenAI test.",
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
