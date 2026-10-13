// Mock provider + disposable local Postgres; live provider tests run separately.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { discoverFirm } from "../src/lib/console/discovery";
import { database, query } from "../src/lib/console/db";
const db = new URL(process.env.CONSOLE_DATABASE_URL ?? "");
assert.equal(db.hostname, "127.0.0.1");
assert.equal(db.port, "5433");
process.env.OPENAI_API_KEY = "local-test-not-a-key";
const pwc = JSON.parse(
  readFileSync("tests/fixtures/pwc-discovery-response.json", "utf8"),
);
pwc.usage = { input_tokens: 100, output_tokens: 100 };
let mode = "consulted-source",
  calls = 0;
globalThis.fetch = async (_url, init) => {
  calls++;
  const body = JSON.parse(String(init?.body));
  if (body.tools) {
    if (mode === "follow-up" && !body.input.includes("first search"))
      return Response.json({
        ...pwc,
        output: pwc.output
          .filter((o: { type: string }) => o.type !== "web_search_call")
          .concat({ type: "web_search_call", status: "completed" }),
      });
    return Response.json(pwc);
  }
  const candidates = [
    {
      name: "PricewaterhouseCoopers LLP",
      website: "https://www.pwc.co.uk/",
      description: "UK practice",
      source_url: "https://www.pwc.co.uk/who-we-are.html",
    },
  ];
  if (mode === "fabrication")
    candidates[0].source_url = "https://www.pwc.co.uk/invented";
  if (mode === "ambiguity")
    candidates.push({
      name: "Another UK practice",
      website: "https://www.pwc.com/uk/",
      description: "Distinct fixture identity",
      source_url: "https://www.pwc.com/gx/en/about/office-locations.html",
    });
  return Response.json({
    id: "fixture",
    status: "completed",
    usage: { input_tokens: 10, output_tokens: 10 },
    output: [
      {
        type: "message",
        content: [
          { type: "output_text", text: JSON.stringify({ candidates }) },
        ],
      },
    ],
  });
};
async function main() {
  const term = "Unknown abbreviation " + randomUUID();
  const result = await discoverFirm(term);
  assert.equal(result.candidates[0].website, "https://www.pwc.co.uk/");
  assert.equal(
    calls,
    2,
    "Consulted official source avoids another paid search",
  );
  assert.deepEqual(
    (await discoverFirm(term.toUpperCase())).candidates,
    result.candidates,
  );
  assert.equal(calls, 2, "Case variations reuse discovery");
  mode = "follow-up";
  calls = 0;
  assert.equal(
    (await discoverFirm("Follow-up " + randomUUID())).candidates.length,
    1,
  );
  assert.equal(calls, 4, "Missing primary provenance triggers one follow-up");
  mode = "fabrication";
  calls = 0;
  await assert.rejects(
    discoverFirm("Unsupported " + randomUUID()),
    /could not verify/,
  );
  assert.equal(
    calls,
    4,
    "Unsupported identity fails honestly after one bounded follow-up",
  );
  mode = "ambiguity";
  calls = 0;
  const ambiguous = await discoverFirm("Ambiguous " + randomUUID());
  assert.equal(
    ambiguous.candidates.length,
    2,
    "Genuinely separate UK identities remain alternatives",
  );
  assert.equal(
    ambiguous.candidates[1].website,
    "https://www.pwc.com/uk/",
    "UK-specific paths survive extraction",
  );
  await query(
    "INSERT INTO research_console.firms(name,name_key) VALUES($1,$2)",
    ["Godfrey Wilson " + randomUUID(), "godfrey wilson"],
  );
  mode = "consulted-source";
  calls = 0;
  assert.equal(
    (await discoverFirm("EY")).matches.length,
    0,
    "EY does not match Godfrey",
  );
  assert.equal(calls, 2, "Unrelated saved names do not suppress discovery");
  const [ey] = await query<{ id: string }>(
    "INSERT INTO research_console.firms(name,name_key,website,domain) VALUES('EY LLP','ey llp','https://www.ey.com/en_uk/','ey.com') RETURNING id",
  );
  assert.equal(
    (await discoverFirm("ey")).matches[0].id,
    ey.id,
    "Exact UK identity reuses the saved record",
  );
  assert.equal(calls, 2);
  console.log(
    "PASS discovery replay, cache, follow-up, unsupported source rejection and ambiguity",
  );
}
main()
  .then(() => database().end())
  .catch(async (e) => {
    console.error(e);
    await database().end();
    process.exit(1);
  });
