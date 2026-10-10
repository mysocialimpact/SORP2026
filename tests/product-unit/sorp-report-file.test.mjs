import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../../src/app/api/sorp-report-file/route.ts";

const source = "https://register-of-charities.charitycommission.gov.uk/en/charity-search?p_p_resource_id=%2Faccounts-resource&_uk_gov_ccew_onereg_charitydetails_web_portlet_CharityDetailsPortlet_priv_r_p_organisationNumber=4042044";

test("the report relay accepts only a verified Charity Commission accounts PDF", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (input) => {
    calls++;
    assert.equal(String(input), source);
    const response = new Response(new Blob(["%PDF".padEnd(1200, " ")], { type: "application/pdf" }));
    Object.defineProperty(response, "url", { value: source });
    return response;
  });
  const response = await GET(new Request(`https://mysocialimpact.org/api/sorp-report-file?source=${encodeURIComponent(source)}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal((await response.arrayBuffer()).byteLength, 1200);
  assert.equal(calls, 1);
});

test("the report relay rejects non-official and non-accounts URLs without fetching them", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not fetch"); });
  for (const value of ["https://example.org/report.pdf", "https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/4042044"]) {
    const response = await GET(new Request(`https://mysocialimpact.org/api/sorp-report-file?source=${encodeURIComponent(value)}`));
    assert.equal(response.status, 400);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("the report relay retries a successful HTML error response", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    if (calls === 1) {
      const response = new Response("temporary upstream page", { status: 200, headers: { "content-type": "text/html" } });
      Object.defineProperty(response, "url", { value: source });
      return response;
    }
    const response = new Response(new Blob(["%PDF".padEnd(1200, " ")], { type: "application/pdf" }));
    Object.defineProperty(response, "url", { value: source });
    return response;
  });
  const response = await GET(new Request(`https://mysocialimpact.org/api/sorp-report-file?source=${encodeURIComponent(source)}`));
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});
