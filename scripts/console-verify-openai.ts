// Genuine provider + database verification. No fixtures or prefilled firm websites.
// Run on the isolated Vercel preview: NODE_OPTIONS=--conditions=react-server npx tsx scripts/console-verify-openai.ts
import assert from "node:assert/strict";
import { query } from "../src/lib/console/db";
import { discoverFirm } from "../src/lib/console/discovery";
import { createFirm, report } from "../src/lib/console/repository";
import { startResearch, runResearch } from "../src/lib/console/research";
import { openaiConfigured } from "../src/lib/console/openai-response";
async function main() {
  if (process.env.VERCEL_ENV !== "preview")
    throw new Error(
      "Live validation requires the isolated Vercel preview environment.",
    );
  if (!openaiConfigured())
    throw new Error(
      "LIVE AI TEST BLOCKED: OPENAI_API_KEY is absent. No successful research is simulated.",
    );
  const before = await query<{ id: string; fingerprint: string }>(
    "SELECT id,md5(row_to_json(a)::text) fingerprint FROM research_console.assessments a",
  );
  for (const name of [
    "Fraser Powell accountants Shepton Mallet",
    "Sayer Vincent charity accountants London",
  ]) {
    const discovery = await discoverFirm(name);
    assert.equal(
      discovery.candidates.length,
      1,
      "Name discovery must establish one official firm",
    );
    const candidate = discovery.candidates[0];
    const created = await createFirm(
      candidate,
      "Live OpenAI workflow validation",
    );
    const firm =
      created.firm ??
      (created.matches?.length === 1 ? created.matches[0] : null);
    assert.ok(firm, "Discovered identity must resolve to one saved firm");
    const run = await startResearch(
      firm.id,
      "Live OpenAI workflow validation",
      { refresh: true },
    );
    assert.ok(run.created, "Validation needs a new real research run");
    await runResearch(run.id);
    const saved = await report(firm.id);
    const assessment = saved.assessments.find((a) => a.run_id === run.id);
    assert.ok(assessment, "Live run must save a complete assessment");
    const rows = saved.evidence.filter((e) => e.run_id === run.id);
    assert.ok(rows.length >= 3, "Live run must save source-backed evidence");
    assert.equal(Object.keys(assessment.scores).length, 5);
    assert.equal(
      Object.values(assessment.scores).reduce((sum, n) => sum + n, 0),
      assessment.total,
    );
    const awards = (
      assessment as unknown as {
        awards: Array<{
          evidence_id: string;
          source_url: string;
          points: number;
        }>;
      }
    ).awards;
    assert.equal(
      awards.reduce((sum, a) => sum + a.points, 0),
      assessment.total,
    );
    assert.ok(
      awards.every((a) =>
        rows.some((e) => e.id === a.evidence_id && e.url === a.source_url),
      ),
      "Every point must link to saved evidence and its actual source",
    );
    const requests = await query(
      "SELECT id FROM research_console.ai_usage WHERE run_id=$1",
      [run.id],
    );
    const reused = await startResearch(firm.id, "Live cache verification");
    assert.equal(reused.created, false);
    assert.equal(reused.id, run.id);
    assert.equal(
      (
        await query(
          "SELECT id FROM research_console.ai_usage WHERE run_id=$1",
          [run.id],
        )
      ).length,
      requests.length,
    );
    console.log(
      JSON.stringify({
        liveTest: "passed",
        name: candidate.name,
        website: candidate.website,
        firmId: firm.id,
        runId: run.id,
        sources: new Set(rows.map((e) => e.url)).size,
        evidence: rows.length,
        people: saved.people.length,
        total: assessment.total,
        scores: assessment.scores,
        awards: awards.length,
        cacheReused: true,
      }),
    );
  }
  const after = await query<{ id: string; fingerprint: string }>(
    "SELECT id,md5(row_to_json(a)::text) fingerprint FROM research_console.assessments a WHERE id=ANY($1::uuid[])",
    [before.map((a) => a.id)],
  );
  assert.deepEqual(
    after.sort((a, b) => a.id.localeCompare(b.id)),
    before.sort((a, b) => a.id.localeCompare(b.id)),
    "Existing assessments must remain byte-for-byte unchanged",
  );
  console.log(
    JSON.stringify({ historicalAssessmentsPreserved: before.length }),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
