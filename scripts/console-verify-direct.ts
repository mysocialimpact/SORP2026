// Real website fallback regression check; does not claim name discovery or AI validation.
import assert from "node:assert/strict";
import { query } from "../src/lib/console/db";
import { startResearch, runResearch } from "../src/lib/console/research";
async function main() {
  if (process.env.VERCEL_ENV !== "preview")
    throw new Error("Use only the isolated preview database.");
  if (process.env.OPENAI_API_KEY)
    throw new Error(
      "OpenAI is configured: run console-verify-openai.ts instead.",
    );
  const firms = await query<{ id: string; name: string; website: string }>(
    "SELECT id,name,website FROM research_console.firms WHERE merged_into IS NULL AND domain IN ('fraserpowell.co.uk','burton-sweet.co.uk') ORDER BY name",
  );
  assert.equal(firms.length, 2);
  for (const firm of firms) {
    const run = await startResearch(
      firm.id,
      "Live direct-website regression verification",
      { refresh: true },
    );
    assert.ok(run.created);
    await runResearch(run.id);
    const [state] = await query(
      "SELECT status,stage,limitations FROM research_console.runs WHERE id=$1",
      [run.id],
    );
    const [counts] = await query(
      "SELECT (SELECT count(*)::int FROM research_console.sources WHERE run_id=$1 AND status='Examined') sources,(SELECT count(*)::int FROM research_console.evidence WHERE run_id=$1) evidence,(SELECT count(*)::int FROM research_console.people WHERE firm_id=$2) people",
      [run.id, firm.id],
    );
    const [assessment] = await query(
      "SELECT total,scores,awards FROM research_console.assessments WHERE run_id=$1",
      [run.id],
    );
    console.log(
      JSON.stringify({
        liveDirectTest: firm.name,
        website: firm.website,
        runId: run.id,
        ...state,
        ...counts,
        total: assessment?.total ?? null,
        scores: assessment?.scores ?? null,
      }),
    );
    if (firm.website.includes("burton-sweet")) {
      assert.equal(state.status, "collected");
      assert.ok(Number(counts.evidence) > 0);
      assert.ok(
        assessment,
        "Accessible reference firm must produce a real assessment",
      );
    }
    if (!counts.sources) {
      assert.equal(state.status, "failed");
      assert.ok(!String(state.stage).includes("Collection finished"));
      assert.ok(!assessment);
    }
  }
  console.log(
    "LIVE OPENAI WORKFLOW STILL BLOCKED: no OPENAI_API_KEY. These are direct retrieval tests only.",
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
