import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  identitySources,
  officialIdentitySource,
} from "../../src/lib/console/identity-evidence.ts";
import {
  citedPassages,
  validateExtraction,
  preferredPeople,
} from "../../src/lib/console/ai-evidence.ts";

const pwc = JSON.parse(
  readFileSync(
    new URL("../fixtures/pwc-discovery-response.json", import.meta.url),
    "utf8",
  ),
);
test("actual PwC research accepts supported roles across bold formatting, never invented qualifications", () => {
  const saved = JSON.parse(
    readFileSync(
      new URL("../fixtures/pwc-research-extraction.json", import.meta.url),
      "utf8",
    ),
  );
  const passages = citedPassages(
    saved.find((row) => row.purpose === "firm-research").response,
  );
  const data = JSON.parse(
    saved.find((row) => row.purpose === "evidence-extraction").response
      .output[0].content[0].text,
  );
  assert.equal(validateExtraction(data, passages).people.length, 6);
  const typography = structuredClone(data);
  typography.people[2].role = typography.people[2].role
    .replaceAll("’", "'")
    .toUpperCase();
  assert.equal(validateExtraction(typography, passages).people.length, 6);
  const people = preferredPeople(data, passages, "pwc.co.uk");
  assert.equal(people.length, 2);
  assert.match(
    people.find((p) => p.name === "Daniel Chan").role,
    /Charities Leader/,
  );
  const forged = structuredClone(data);
  forged.people[2].qualifications = ["DChA"];
  assert.throws(() => validateExtraction(forged, passages), /not supported/);
  const wrongRole = structuredClone(data);
  wrongRole.people[2].role = "Chief Executive";
  assert.throws(() => validateExtraction(wrongRole, passages), /not supported/);
});
test("actual failed PwC search supports the UK identity through consulted official sources", () => {
  assert.ok(citedPassages(pwc).every((p) => !p.url.includes("www.pwc.co.uk")));
  const sources = identitySources(pwc);
  assert.equal(
    officialIdentitySource(
      "https://www.pwc.co.uk/",
      "https://www.pwc.co.uk/who-we-are.html",
      sources,
    ),
    true,
  );
  assert.equal(
    officialIdentitySource(
      "https://pwc.co.uk/",
      "https://www.pwc.co.uk/who-we-are.html",
      sources,
    ),
    true,
  );
  assert.equal(
    officialIdentitySource(
      "https://www.pwc.co.uk/",
      "https://www.pwc.co.uk/invented-proof",
      sources,
    ),
    false,
  );
  assert.equal(
    officialIdentitySource(
      "https://impostor.example/",
      "https://www.pwc.co.uk/who-we-are.html",
      sources,
    ),
    false,
  );
});
test("directory and government evidence cannot become the official firm website", () => {
  const source = "https://www.business.gov.uk/example";
  assert.equal(officialIdentitySource(source, source, [source]), false);
  assert.throws(() =>
    officialIdentitySource("https://127.0.0.1/", "https://127.0.0.1/", [
      "https://127.0.0.1/",
    ]),
  );
});
test("uncompleted searches, arbitrary prose URLs and unsafe URLs are not identity sources", () => {
  const response = {
    output: [
      {
        type: "web_search_call",
        status: "failed",
        action: { sources: [{ url: "https://unverified.example/" }] },
      },
      {
        type: "message",
        content: [{ type: "output_text", text: "https://invented.example/" }],
      },
      {
        type: "web_search_call",
        status: "completed",
        action: { sources: [{ url: "https://127.0.0.1/" }] },
      },
    ],
  };
  assert.deepEqual(identitySources(response), []);
});
