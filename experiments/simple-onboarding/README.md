# Small conversational onboarding experiment

This is an isolated typed-input experiment, not a production replacement. Production
remains commit `31900e69a10c0a5f333df3ba2424ea456cceda13` (Build 20). Work is on
`experiment/simple-conversational-onboarding`; PR #88 is untouched.

## What it tests

One GPT-6.1 Sol Responses call, high reasoning, returns the whole conversational
reply and proposed facts with supporting quotes. It receives the conversation,
current profile, manual edits, missing registration requirements and two objectives.
There is no question-stage planner, transition library or scripted follow-up engine.

Software validates proposals, updates the live editable form and requires full name,
valid email, role, current organisation or explicit independent status, and an
explicitly confirmed mock-register record before issuing a mock account. A model
cannot confirm the record or create an account. Name edits remain authoritative.

The existing SORP fonts, colours, onboarding CSS and field-arrival animation are
reused. Mobile has a compact live-field view alongside the chat. Existing production
voice and authentication code is unchanged; voice is not connected to this small
isolated demonstration. The preview does not call real charity, email, payment or
account services. Mock charity numbers are deliberately synthetic.

## Isolation and cost

- The deployment root is this folder, with its own Next and Vercel configuration.
  Only `/`, `/examples` and `/api/demo` are application routes. Production account
  endpoints are absent.
- The existing protected Preview `OPEN_API_KEY` is used server-side; it is never
  exposed to the browser, printed or changed.
- Profiles and conversations live in browser session storage, not a database.
  Evaluation outputs contain only authored synthetic users and example.invalid emails.
- An existing non-production Neon branch, `sorp-console-validation`
  (`br-calm-queen-aucbc1bk`), holds only a new numeric experiment-cost counter.
  No database or branch was created. A new restricted login can SELECT/UPDATE only
  `sorp_simple_demo_20261016.budget`; a permission check found no other readable user
  table. No existing customer records or privileges were modified.
- `SIMPLE_DEMO_BUDGET_URL` is a protected variable scoped only to this experimental
  Preview branch. Production variables are unchanged. Runtime checks pin the test
  hostname, database and restricted role.
- An atomic counter reserves cost before model calls and refuses admission above
  US$2 across cold starts and deployments. Ordinary experimental calls reserve
  $0.08, with 24KB maximum provider request and 2,400 maximum output tokens.
  Successful calls settle to metered token estimates; interrupted/unknown calls
  retain their entire reservation. The controlled existing-engine comparison reserves
  $0.15 per submitted answer. No provider retries are automatic.
- Rates: Sol $2/$10 per million input/output tokens; existing extraction mini
  $0.75/$4.50. Cache discounts are ignored. These are model-spend estimates,
  distinct from Codex credits and hosting costs. GET `/api/demo` reports both
  metered and conservatively reserved totals. The cap includes the connection probe,
  both engines' evaluations and preview interactions.

## Measured first comparison

Source `03f601c`; complete unedited evidence is in
[comparison-evidence.json](comparison-evidence.json) and the preview's `/examples`.
Both use Sol medium for dialogue. The existing engine additionally uses its normal
mini extraction stage. No assistant response is mocked.

| Measurement | Existing | Simpler |
| --- | ---: | ---: |
| Complete scripted scenarios | 6 | 6 |
| Authored user answers | 21 | 21 |
| Model API calls | 42 | 28 |
| Estimated model cost | $0.193599 | $0.136200 |
| Mean cost per scenario | $0.03227 | $0.02270 |

The simpler version used about 30% less model spend in this sample. Both retained
the supplied firm/charity distinction and manual name correction. The alternative
also cleared the former organisation when the person explicitly became independent;
the existing engine retained it. Both reacted to the spreadsheet joke and respected
the request to finish.

The existing engine was generally more concise. The alternative repeated mock
registration instructions, offered menus and prematurely questioned accepted synthetic
emails. The current preview clarifies that accepted test emails and software validation
are authoritative, and leaves procedural instructions to the visible controls.
The final preview further shortens the brief to its two objectives and data boundaries,
and uses high reasoning. These changes were made after the paired medium-reasoning
comparison; its transcripts and cost advantage are not presented as measurements of
the updated prompt. The final mobile browser journey is checked separately.

This is not a blind or statistically significant naturalness test. The same authored
answer order sometimes conflicts with the alternative's chosen question: notably
“My pal told me” follows a finance question in its trustee transcript. That mismatch
cannot fairly establish social failure in an equivalent context. Script lengths were
matched by construction, so equal turn counts do not prove equal efficiency. The
browser probe separately invites a referral question and a final question, then
submits the exact pal/Frogs answers to actual model-generated questions.

## Validation and recommendation

Six deterministic tests cover mandatory gates, partial population, malformed values,
manual corrections, independent status and charity changes. Production builds pass.
The [browser evidence](browser-evidence.json) records a successful desktop journey on the earlier brief and the final mobile journey on the shorter high-reasoning brief. Both exercised real AI, automatic population, manual edits, mock record confirmation, blocked incomplete registration, reload and mock account creation. The deployed page, examples and health returned HTTP 200; the production account path returned 404.

The final mobile answer to Frogs still offered surprise followed by a generic close. Functional assertions passing is not a conversational-quality pass. No consistent naturalness improvement has been demonstrated.

Metered API estimate at verification: **US$0.401539**. A failed browser run interrupted one request before usage could be read; its entire $0.08 reservation is retained. The conservative total is therefore **US$0.481539**, within the shared $2 ceiling. Future preview interactions consume the same remaining budget.

Working Preview (READY, revision `1e6ef1c`): https://sorp2026-lgczksruf-marcuswarry.vercel.app/ — [real-AI transcripts](https://sorp2026-lgczksruf-marcuswarry.vercel.app/examples). No production rollout is authorised or performed.

**Recommendation: refine, do not adopt yet.** The simpler orchestration is viable and
cheaper in this sample. A consistent conversational-quality improvement has not been
established. Let the owner try this preview before spending more on tuning or tests.

If later approved and demonstrated to improve the experience, the existing question
planner, scripted fallback transitions, speculative post-confirmation wording and
separate extraction call could be candidates for simplification. Authentication,
entitlements, charity verification, account persistence and deterministic validation
would still be needed. No existing implementation is removed in this experiment.

## Reproduce safely

Use an explicit Vercel **Preview** deployment with root
`experiments/simple-onboarding`, existing dependencies, source files outside the root
enabled (for the reused CSS), and the protected branch-specific counter connection.
`node build-browser.mjs` builds and verifies the actual UI without rerunning the paired
comparison. `node --test checks.test.mjs` makes no model calls. Do not deploy this to
production or point the counter at a production database. The account/AI routes fail
closed outside Preview.
