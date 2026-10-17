# One login rule: approval branch

Public product landing pages, the readiness presentation, official information,
onboarding, login, contact and page feedback remain public.

| Tool | Protected entrance |
| --- | --- |
| Are You SORP Ready? | `/are-you-sorp-ready/review/` and all alternative review/results/payment routes |
| Ask SORP | `/ask-sorp/workspace/` |
| Charity Impact Reports | `/charity-impact-reports/review/` |
| Social Impact Excellence | Assessment, journey, results, team and pillar routes beneath `/social-impact-excellence/` |
| My Impact Director | `/my-impact-director/workspace/` |

`tool-access-policy.ts` defines page and API coverage. The Next.js server proxy
verifies protected requests using the existing `platformIdentity` adapter before
rendering a tool or invoking its API. That adapter retains both the existing
account broker and the independent provider switch. No production authentication
setting or schema changes are needed. Authentication operations remain public;
other account API actions, including legacy team-response actions, require login.
An unavailable identity service fails closed. Existing product-specific ownership,
subscription, adviser and charity permission checks continue to apply.

`ToolLink` retains the intended query and fragment when sending a visitor to the
central gateway. Direct URLs are protected on the server. The gateway preserves
fragments inherited through a server redirect without changing the conversational
engine. The existing login flow and verified-registration continuation remain in
charge of issuing sessions and returning to the product.

The readiness review no longer has an internal account form. Charity confirmation
continues to report preparation. Old `account` checkpoints and history are mapped
to the next valid screen without removing answers. The existing eight progress
phases remain coherent because account creation was part of Find charity rather
than a separate numbered phase. Older profiles can use My Account to update their
details; they do not need a second account.

Production build numbers continue to come from the existing deployment ledger.
An unconnected preview shows its actual deployment ID and build timestamp without
inventing a sequential number. Both use Europe/London time, and the bar stays in
normal document flow. Workspace sizing accounts for the bar's measured height.

## Verification scope

`tests/one-login.spec.ts`, `tests/account-navigation.spec.ts` and
`tests/status-bar.spec.ts` exercise the running isolated preview on desktop and
iPhone widths. Registration uses the unchanged central onboarding interface and
the existing, explicitly labelled synthetic preview account service. AI,
payments, production email and production databases are blocked in that preview.

`tests/tool-login.integration.test.ts` additionally uses actual Better Auth
credentials and sessions in a temporary local PostgreSQL database. It checks all
five entrances, Free/Plus/Adviser/Enterprise changes, preserved progress, forged
cookies and expired sessions. A separate broker fixture verifies the legacy
identity adapter. Existing provider integration tests cover verified registration,
identity preservation, expiry, rate limiting, founder MFA and audit restrictions.

For a Vercel preview, scope `SORP_ISOLATED_PREVIEW=true` and a new
`SORP_PREVIEW_COOKIE_SECRET` only to this branch. Build with:

```
npm run build && npm ci --prefix tests/live-runtime --ignore-scripts && node scripts/verify-one-login-preview.mjs
```

The verification script refuses production. It uses the existing pinned browser
runtime and publishes only aggregate results at `/preview-qa/one-login.json`,
without cookies, authentication state or real user records.

These checks do not establish real production customer login, live email delivery,
paid checkout or external AI answers. The original standalone MSI Ask SORP
deployment is untouched. This branch must not be merged or deployed to production
without Marcus's approval; PR #88 is outside this work.
