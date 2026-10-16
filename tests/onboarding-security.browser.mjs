// Run only against the isolated localhost fixture server.
import assert from "node:assert/strict";
import { request } from "@playwright/test";
const origin = "http://127.0.0.1:3000";
const a = await request.newContext({ baseURL: origin }),
  b = await request.newContext({ baseURL: origin });
const post = (ctx, path, data, headers = {}) =>
  ctx.post(path, { headers: { origin, ...headers }, data });
try {
  assert.equal((await post(a, "/api/onboarding/start/", {})).status(), 200);
  assert.equal((await post(a, "/api/onboarding/complete/", {})).status(), 401);
  const answer = await post(a, "/api/onboarding/turn/", {
    message:
      "I’m Private Alice, a trustee. My email is alice@example.invalid. My biggest concern is a private staffing issue.",
    fields: {},
  });
  assert.equal(answer.status(), 200);
  assert.equal(
    (
      await post(a, "/api/readiness-account/", {
        action: "signup",
        name: "Private Alice",
        email: "alice@example.invalid",
        position: "Trustee",
        password: "Synthetic-Private-12345",
        progress: { step: "scope" },
      })
    ).status(),
    200,
  );
  assert.equal((await post(a, "/api/onboarding/complete/", {})).status(), 200);
  const own = await (await a.get("/api/onboarding/context/")).json();
  assert.match(own.facts.concerns, /private staffing/);
  await post(b, "/api/readiness-account/", {
    action: "signup",
    name: "Private Bob",
    email: "bob@example.invalid",
    position: "Trustee",
    password: "Synthetic-Private-67890",
    progress: { step: "scope" },
  });
  const other = await (
    await b.get(`/api/onboarding/context/?account_id=${own.account.id}`)
  ).json();
  assert.equal(other.account.name, "Private Bob");
  assert.equal(other.facts, undefined);
  const stateA = await a.storageState(),
    stateB = await b.storageState();
  const guestCookie = stateA.cookies.find((c) => c.name === "sorp_onboarding");
  const accountCookie = stateB.cookies.find(
    (c) => c.name === "onboarding_fixture",
  );
  const relink = await post(
    b,
    "/api/onboarding/complete/",
    {},
    {
      cookie: `sorp_onboarding=${guestCookie.value}; onboarding_fixture=${accountCookie.value}`,
    },
  );
  assert.ok(relink.status() >= 400);
  const unchanged = await (await a.get("/api/onboarding/context/")).json();
  assert.equal(unchanged.account.id, own.account.id);
  assert.match(unchanged.facts.concerns, /private staffing/);
  assert.equal(
    (
      await b.get(
        "/api/onboarding/document/?source=https://private.example/report.pdf",
      )
    ).status(),
    404,
  );
  const recovered = await request.newContext({ baseURL: origin });
  try {
    await post(recovered, "/api/readiness-account/", {
      action: "signup",
      name: "Verified Recovery",
      email: "recover@example.invalid",
      position: "Trustee",
      password: "Synthetic-Recovery-12345",
      progress: {
        step: "scope",
        onboarding: {
          facts: {
            name: "Old Draft Name",
            email: "wrong@example.invalid",
            role: "Trustee",
            concerns: "Saved private context",
          },
          messages: [{ role: "user", text: "Saved introduction" }],
        },
      },
    });
    const completed = await post(recovered, "/api/onboarding/complete/", {});
    assert.equal(completed.status(), 200);
    assert.equal((await completed.json()).saved, true);
    const restored = await (
      await recovered.get("/api/onboarding/context/")
    ).json();
    assert.equal(restored.facts.name, "Verified Recovery");
    assert.equal(restored.facts.email, "recover@example.invalid");
    assert.equal(restored.facts.concerns, "Saved private context");
  } finally {
    await recovered.dispose();
  }
  console.log(
    "PASS: verified-account linking, cross-account isolation, relink refusal, document scope and draft-expiry recovery",
  );
} finally {
  await a.dispose();
  await b.dispose();
}
