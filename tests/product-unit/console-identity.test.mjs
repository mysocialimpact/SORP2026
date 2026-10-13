import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  identitySources,
  officialIdentitySource,
} from "../../src/lib/console/identity-evidence.ts";
import { citedPassages } from "../../src/lib/console/ai-evidence.ts";

const pwc = JSON.parse(
  readFileSync(
    new URL("../fixtures/pwc-discovery-response.json", import.meta.url),
    "utf8",
  ),
);
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
