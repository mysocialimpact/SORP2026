// Isolated HTTP fixtures. Never deploy or run against real users/services.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
const accounts = new Map();
createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  res.setHeader("content-type", "application/json");
  const token = req.headers.cookie?.match(/onboarding_fixture=([\w-]+)/)?.[1];
  const account = accounts.get(token);
  const send = (value) => res.end(JSON.stringify(value));
  if (req.url.startsWith("/api/readiness-account")) {
    if (req.method === "GET")
      return send(
        account ? { signedIn: true, ...account } : { signedIn: false },
      );
    const b = JSON.parse(raw || "{}");
    if (b.action === "signup") {
      if (b.email?.includes("verify")) {
        res.statusCode = 202;
        return send({ verificationRequired: true });
      }
      const id = randomUUID(),
        stored = {
          account: {
            id,
            name: b.name,
            email: b.email,
            position: b.position,
            organisation: b.organisation,
          },
          progress: b.progress,
          platformAccess: { memberships: [], founder: false },
        };
      accounts.set(id, stored);
      res.setHeader(
        "set-cookie",
        `onboarding_fixture=${id}; Path=/; HttpOnly; SameSite=Lax`,
      );
      return send({ signedIn: true, ...stored });
    }
    if (b.action === "save" && account) {
      account.progress = b.progress;
      return send({ signedIn: true, ...account });
    }
    if (!account) {
      res.statusCode = 401;
      return send({ error: "Synthetic fixture: sign in required" });
    }
    return send({ signedIn: true, ...account, reviews: [] });
  }
  if (req.url === "/api/published-review") {
    const b = JSON.parse(raw || "{}");
    if (b.operation !== "find") {
      res.statusCode = 400;
      return send({ error: "Fixture only performs identity lookup" });
    }
    if (b.query === "Unavailable Charity") {
      res.statusCode = 503;
      return send({ error: "Synthetic lookup failure" });
    }
    const interim = /interim/i.test(b.query);
    const number = interim ? "1234569" : "1234568";
    return send({
      research: {
        status: "found",
        candidates: [
          {
            name: `${interim ? "Interim Spaces" : "Brainstrust"} (synthetic fixture)`,
            registrationNumber: number,
            jurisdiction: "England and Wales",
            entityType: "registered_charity",
            website: "https://charity.example",
            officialUrl: `https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/${number}`,
            reportUrl: "",
            publicReadiness: {
              impactReport: { found: false, url: "", title: "" },
            },
            sources: [],
          },
        ],
      },
    });
  }
  if (req.url === "/api/transcribe")
    return send({
      transcript:
        "I’m Sarah Jones, a chartered accountant at Burton Sweet. My email is sarah@example.com.",
    });
  res.statusCode = 404;
  send({ error: "No fixture for this operation" });
}).listen(4311, "127.0.0.1", () =>
  console.log("Synthetic local services ready on 4311"),
);
