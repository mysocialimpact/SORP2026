# Conversational onboarding — implementation and release record

16 October 2026. Additive implementation. The deployment record below supersedes
the original local-only verification status; no authentication cutover is included.

## What changed

`/get-started/` introduces conversation and conventional form modes, an editable
live profile, immediate conservative field extraction, grounded model extraction,
adaptive objectives, explicit charity selection, and a separate password dialog.
The header now links to the central introduction with the originating product.
Sign-in, existing users, account IDs, subscriptions and billing remain on the
existing `/api/readiness-account` contract and its existing disabled-by-default
independent-auth switch. No credentials, users, prices or entitlements were migrated.

Existing authenticated visitors to the introduction return to their requested
product. Product return paths reject external, protocol-relative, backslash and
account/API redirect targets. The special verification return through the
introduction is allowed only by the account portal. Invitation and embedded
assessment account flows retain their existing save behaviour; they have not
been replaced wholesale by the new introduction.

The live MSI report service must be checked separately: this repository’s
readiness prerequisite has been removed from the report intake, account proxy
and independent upload paths. Verified sessions, organisation ownership, adviser
permissions, upload tokens, file validation and billing rules remain. The existing
£100 impact-review checkout remains paused, as it was before this work.

## Design and voice

DM Sans and the existing ivory/forest green identity are preserved, including the
repository’s deliberate sans-serif typography policy. The profile is alongside
the conversation on desktop. Mobile shows the invitation first, then pins a compact
editable profile above the active conversation. Actual supplied facts trigger field
highlights, check marks and progress; no simulated discoveries or timed loading steps.
Motion respects `prefers-reduced-motion`. Account creation uses a native modal dialog
with focus containment and Escape support. No passwords are requested in chat.

Relio was searched in the workspace and accessible GitHub repositories, including
`mysocialimpact`; no accessible Relio source was found. **No Relio component reuse
or visual parity is claimed.** The local reusable `VoiceInput` adapts the existing
SORP `MediaRecorder` codec preference, multipart `audio` contract and editable
transcription. It adds real `AnalyserNode` levels, a brief activation sound,
record/stop/transcribe/review/error states, timeout, retry, duration and byte limits,
and resource cleanup. The existing transcription provider is reused through a
bounded onboarding-specific proxy. Only `/get-started` receives microphone `(self)`
permission; camera/geolocation remain denied and the rest of the site’s policy stays.

## State and model

Facts: name, email, role, organisation, responsibilities, charity references,
portfolio size, reported discovery channel and concerns. A separate confirmed
charity is authoritative only after choosing a server-returned candidate. No
AI output grants permissions or marks an email verified.

The first Send synchronously extracts unambiguous information in the browser;
the server then applies deterministic validation and optional structured model
extraction. Each model fact must carry a verbatim supporting quote and value from
the newest answer. Unknown fields remain empty. Direct edits during an outstanding
request are protected from being overwritten. The model gets bounded structured
facts and the current objective, not a growing transcript. Full private conversation
history is stored separately for account continuity.

The next objective is deterministic: missing registration details, one charity,
responsibilities, discovery, concerns, completion. Supplied or skipped objectives
are not asked again. Six total exchanges cap optional conversation; up to ten are
allowed for registration corrections, after which the conventional form takes over.
The exact concern prompt is “What keeps you up at night?” and is omitted if concerns
were already provided. Registration can be completed before optional objectives.

Model: the repository’s existing `gpt-5.4-mini-2026-03-17` snapshot, Responses API,
`store:false`, low reasoning, 1,400 output tokens, no tools/search in extraction,
18-second timeout, 3,000-character answers and 16 KB request bodies. Existing
`OPENAI_API_KEY` / `OPEN_API_KEY` configuration is reused; no key was created.
A conservative $0.02 reservation per model attempt is never refunded on uncertain
failures. PostgreSQL serialises admission; defaults are $1/day and $10/month,
with absolute configurable ceilings of $5/day and $50/month. These are admission
budgets, not verified live invoices. Without model access, the UI says assistance
is unavailable and retains conservative extraction and direct editing.

Charity lookup and transcription each have a durable global cap of 30/hour and
100/24 hours, plus four searches and three transcriptions per draft. Draft creation
is capped at 200/hour; each draft has an additional 35-operation allowance.
Recordings stop at 90 seconds; transcription accepts at most 3.5 MB and times out
at 30 seconds. Failed audio stays only in browser memory for retry. Provider-side
retention is not established by local tests.

## Persistence, public preparation and shared access

Migration `012_conversational_onboarding.sql` adds tables to the existing
`research_console` PostgreSQL schema. It was applied only to an isolated local
PostgreSQL database. Production and staging roles need explicit table and sequence
grants; browser clients receive no database credentials. Existing migrations and
other account stores are untouched.

An unguessable 256-bit HttpOnly, SameSite=Lax cookie identifies a 24-hour draft;
HTTPS adds Secure. Same-origin mutations, bounded request bodies, atomic turn
reservation, account identity checks and parameterised SQL protect the routes.
On successful registration, an existing verified session links the private profile
to its immutable account ID. A draft cannot be linked to two accounts. After draft expiry or a different-device verification, the completion endpoint can
recover private facts from the same verified account’s saved signup context; it
only restores a charity if that canonical public record already exists. Existing
profiles are not overwritten on a repeated completion request. Draft deletion runs
on new admission and the internal maintenance endpoint; expired drafts are denied
immediately. Account-linked records remain until an authorised deletion process.

Campaign/referrer-origin labels are stored separately from the user’s discovery
answer. They are browser-provided attribution, not proof of a referral. No raw
query-string tokens, referring-page paths or marketing emails are collected.
The privacy page explains draft/conversation processing and public/private separation.

Charity lookup adapts the existing readiness `/api/published-review` `find`
operation and Candidate contract. The confirmation displays the registered name,
number, regulator link and website where supplied. It says these are returned by
the existing research service, not independently reverified by this frontend.
Supported canonical identities are Charity Commission England/Wales, OSCR and
Charity Commission Northern Ireland plus the registration number. Ambiguous or
unsupported matches are not automatically selected.

Confirmation upserts one canonical record and immediately schedules `after()` work.
An atomic PostgreSQL lease ensures one active worker; retries are bounded to three
attempts. The internal `/api/internal/charity-preparation/` worker uses the existing
`CRON_SECRET` and processes one eligible job per call. **No new production cron
was enabled.** Schedule this endpoint or use the existing scheduler in staging to
verify recovery from terminated functions. Jobs are at-least-once with idempotent
writes; this is not a claim of exactly-once delivery.

The worker uses the existing DNS-pinned public-fetch and robots-policy helpers,
up to four HTML pages, at most six document metadata entries and two PDF downloads
per attempt, with an 8 MB PDF limit. It extracts bounded plain text and source links;
there is **no background AI summary or full report analysis**. Missing sources
produce partial/failed status and never block onboarding. Annual report dates are
recorded only when supplied; no guarantee that an undated discovered PDF is latest.

Files use the already installed S3-compatible SDK and configurable existing object
storage. A separate `charity-intelligence/` prefix, SHA-256 keys, source URL,
publication period where known, retrieval timestamp and checksum support reuse.
Metadata remains in PostgreSQL. No new paid store was provisioned and backup
credentials were not reused. Without storage, source links remain located, not
“downloaded”. Downloads are off by default pending publisher licensing/access and
bucket review. Source/version refresh and object expiry policies still need a
production retention decision; the initial implementation does not continuously crawl.

`GET /api/onboarding/context/` is account-authenticated and exposes only that
account’s facts and selected public record. All five product surfaces show shared
context. Fresh readiness reviews reuse the selected candidate; Impact Director and
report intake prefill the organisation without replacing saved work. Ask SORP
adds a clearly labelled application context item containing only the selected
public charity identity; the original unauthenticated standalone request remains.
Public document downloads require the current account’s selection. On an explicit
`prepare-tar` request, the readiness proxy can reuse matching cached PDF bytes via
the existing multipart contract, with source/checksum provenance. Cache failure
falls back to the existing retrieval path. This is a transport integration, not
proof of live upstream processing or a completed assessment.

## Verification and remaining release gates

Observed results on 16 October 2026:

- `npm run build`: production compilation and TypeScript checks passed.
- `npm run lint`: zero errors; two existing warnings in the design-preview script
  and `experience-cloud.tsx`.
- `npm run test:product-unit`: 153 passed, including the supplied A–D conversations,
  natural charity selection, stopping limits and conservative name recognition.
- New isolated PostgreSQL integration suite: seven passed. Covers concurrent worker
  claims, cached document reuse, failed retrieval/retry, canonical identity, expired
  drafts, grounded model output and admission budgets, account-scoped PDF access and
  checksum verification. Model, public fetch and S3 responses are fixtures here.
- Existing authentication/security and report-upload integration suites: three
  passed against a separate local PostgreSQL schema. Include durable account limits,
  session expiry, origin enforcement, organisation ownership and chunked PDF upload.
- New desktop/mobile browser suite: 15 passed; one deliberately skipped mobile
  recording case. Chromium used its actual MediaRecorder and audio analyser with a
  generated audio input. The transcription service response was synthetic. A final
  two-journey rerun also passed after refining mobile question visibility and natural
  “Yes please” selection. No actual microphone hardware or Safari claim is made.
- 70 selected existing browser checks passed across the platform, Ask SORP workspace,
  password recovery and product suites. This includes four targeted reruns: two signup
  expectations updated for central onboarding, and two missing-credential checks run
  against a genuinely unconfigured server rather than the synthetic account service.
- Direct HTTP checks passed for verified account linking, cross-account isolation,
  refusal to relink an introduction, scoped document access and recovery from saved
  signup context after the draft cookie is absent. Recovered identity comes from the
  authenticated account, not the draft's editable name/email.
- Axe checks passed on the onboarding introduction and partial-answer/error state
  at both viewport sizes, including reduced motion. This is targeted accessibility
  coverage, not a complete assistive-technology audit. Actual viewport inspection
  confirmed that the mobile profile and next question remain visible together.

Fixtures never send real email, create production accounts or charge payments.
Live model accuracy, regulator discovery, email/transcription delivery, S3 writes
and payment-provider continuity remain unverified in this environment.

Local setup for the dedicated browser suite:

1. Build normally with `npm ci` and `npm run build`.
2. Use isolated PostgreSQL at `127.0.0.1:55432/onboarding_test`. Never use the
   integration test on a shared or production schema: it deliberately resets
   `research_console` in that explicitly guarded local database.
3. Run `NODE_OPTIONS=--conditions=react-server npx tsx --test tests/onboarding.integration.test.ts`
   with `CONSOLE_DATABASE_URL` pointing to that local database.
4. Run `node tests/onboarding-services.fixture.mjs` (localhost:4311).
5. Start Next with `SORP_ONBOARDING_ENABLED=true`, the isolated database URL,
   `SORP_BACKEND_ORIGIN=http://127.0.0.1:4311`,
   `SORP_READINESS_API_URL=http://127.0.0.1:4311/api/readiness`, and
   `SORP_TRANSCRIBE_API_URL=http://127.0.0.1:4311/api/transcribe`.
6. Run `ONBOARDING_FIXTURE_TESTS=true npx playwright test tests/onboarding.spec.ts tests/onboarding-voice.spec.ts`.

Production gates: connect approved database/object-storage credentials; stage the
additive migration and scoped grants; verify live model extraction on the supplied
scenarios; verify regulator matches, source dates/licensing, real PDF retrieval and
cache reuse; test actual mobile microphone/transcription; confirm the legacy account
service accepts the new signup context and removes any upstream readiness gate;
verify email delivery and the account-verification return after >24 hours; verify
cache-to-readiness multipart provenance; configure retry/cleanup scheduling; review
privacy retention and an account-linked deletion/export workflow. Real microphone
hardware, Safari and live service behaviour cannot be inferred from Chromium fixtures.

## Review and preview

The workspace-local preview is `http://localhost:3000/get-started/`, backed by the
isolated synthetic account/charity/transcription service and local PostgreSQL.
It is not a public deployment and contains no production user data. No model key
is connected, so the preview truthfully shows the conservative-extraction fallback.
The production site, account cutover flag and deployed databases were not changed.

Retained screenshots: [desktop introduction](onboarding-preview/desktop.png) and
[mobile first-answer result](onboarding-preview/mobile-first-answer.png).
The visual review refined button contrast, mobile invitation order, compact pinned
fields, real-state rewards and question positioning. Field values are always editable.
Screenshots show synthetic test input, not a verified live charity record.

## Deployment record — 16 October 2026

The user subsequently authorised immediate deployment. The Git-connected Vercel
project is `sorp2026` (`prj_6pPW0XO8T06qPecrO7YgjISNXIAt`), team
`team_2UyzhIwaQL4ffl04aPFlZdm8`, serving `sorp2026.org`.
The initial release preview is
`https://sorp2026-7z7p002ch-marcuswarry.vercel.app/get-started/` (READY; HTTP 200).

Migration 012 and `scripts/provision-onboarding-runtime.sql` were applied first to
the existing Neon validation branch `br-calm-queen-aucbc1bk`, then production
`br-dark-block-audwtcnr` in `lucky-sky-23094766/neondb`. Runtime-role queries verified
the new tables, grants and sequences; access to `public.users` remains denied.
The recovery-test branch `br-quiet-sunset-auboqwdc` received the same schema so the
existing automated backup restore check can recognise the new tables.

The snapshot quota was full. A fresh, compute-free preservation branch,
`before-onboarding-2026-10-16` (`br-shiny-lab-autfd24s`), retains the pre-migration
database. No existing snapshots or branches were deleted.

Production `SORP_ONBOARDING_ENABLED=true` reuses the existing database, model key,
transcription and legacy account service configuration. The authentication cutover
flag remains unchanged. Build counter advances to 17. Immediate `after()` charity
preparation remains primary; a daily 06:15 UTC cron adds bounded recovery of one
eligible job and expired-draft cleanup, using the existing cron secret.

Public document downloads remain off: no new document bucket or credential was
provisioned. Remote live model/recording/signup journeys still need verification;
the deployment check does not imply that the earlier provider-specific release
gates have all passed. Existing account status was checked through the deployed
preview and returned the expected unauthenticated response.

## Conversational understanding correction — release 18

The defects came from three connected behaviours: the extracted employer was not
interpreted as a possible charity, question/lookup decisions used the prior stage,
and a short-answer fallback treated arbitrary reply text as an entity. Separate
client selection and form snapshots also failed to persist direct edits reliably.

A versioned conversation snapshot now owns facts, provenance, inferred employer
relationships, intent, clarification, proposed charity, registry candidates and
confirmed charity. The form and next-question selector read this same snapshot.
Existing drafts migrate on read; no database or authentication migration is needed.
Human edits are debounced and saved independently of turns. Atomic revision checks
prevent slower requests or another tab overwriting newer information. Failure
responses restore the latest saved snapshot, including a cleared old selection.

The bounded model extraction now classifies information, confirmation, correction,
reminder, clarification, question and disagreement. It receives current structured
facts, provenance and question instead of growing history. Evidence must occur in
the answer; contextual entity references must resolve to known entities. Successful
semantic interpretation supersedes provisional lexical recognition. Boundary checks
reject conversational sentences as entities/search candidates. The conservative
fallback remains explicitly identified when model service is unavailable.

Trustee/employer relationships suggest a charity without confirming it; adviser
firms remain distinct from clients. Multiple references require a choice. Reminders
acknowledge the existing entity, ambiguous corrections preserve it, and explicit
changes clear prior registry matches and confirmation. Only explicit confirmation
of a returned registry candidate can queue intelligence. The existing canonical
identity and idempotent worker/storage architecture are unchanged.

Six information exchanges remain the optional budget; corrections, clarification,
questions and reminders do not consume it. Ten total submitted exchanges remain the
hard bound. Direct editing and account creation remain available. The progress bar
is explicitly labelled as profile details, with outstanding charity confirmation
shown separately. Existing layout, animations and voice component remain intact;
voice transcripts and typed answers use the same turn handler.

Model remains `gpt-5.4-mini-2026-03-17`, one extraction request per non-skipped turn,
1,400 output tokens, 18-second timeout, existing request limits and USD budget
reservations. No additional paid service or storage is introduced. Drafts retain
the existing private HttpOnly cookie and 24-hour expiry. Document downloads remain
disabled in production until dedicated object-storage credentials are configured.

Validation for this correction:

- 172 product unit tests passed, including 30 onboarding state regressions.
- Nine real PostgreSQL/service integration tests passed, including semantic output
  validation, intent-to-reducer behaviour, draft access/expiry, concurrent revisions,
  canonical charity deduplication, bounded retries and document cache isolation.
- 31 desktop/mobile Chromium browser checks passed; one mobile audio-device check
  was deliberately skipped. The actual application/API/database journeys cover the
  exact Interim Spaces reminder, all details early, partial details, early charity,
  multiple clients, early referral/concern, ambiguous corrections, employer rejection,
  changing a confirmed charity, failed replacement lookup, manual edits/resume,
  stale requests, voice-to-typing/resume, conventional signup/verification handoff,
  returning accounts, early exits, CSRF and targeted axe/reduced-motion checks.
- Two final desktop/mobile keyboard-editing and reload checks passed after ensuring
  autosave preserves spaces while a person types.
- Production build passed. Changed application files pass ESLint. Repository lint
  has two pre-existing warnings outside this feature. Mobile completion screenshot
  was inspected; automated viewport checks retain the visible live profile/question.

Browser journeys use isolated synthetic charity/account/transcription providers and
no live model key. Model protocol/grounding tests use synthetic responses. Real
Chromium MediaRecorder/audio analysis was exercised using generated input, not a
physical microphone. Live provider accuracy, real regulator results, actual email,
Safari and live payments are not claimed as verified by these tests. The execution
network blocks direct production browser/API POST access; deployed GET checks use
the authenticated Vercel connector.

## Conversational engine v3 — architectural correction (release candidate)

This section supersedes the release 18 engine description. The previous engine
had a shared snapshot but flattened professional context into strings, selected
mostly fixed question text and allowed later extraction to overwrite manual edits.
Its literal grounding check also discarded supported paraphrases. Mocked model
responses did not expose missing facts, misclassified relationships or poor question
selection. Live evaluations during this correction reproduced those classes of error.

The new `processTurn` is shared by the production API and live evaluation runner:
interpret once → validate evidence → update typed state → evaluate objectives →
validate a proposed next question → render the form and question from that state.
Successful semantic extraction no longer competes with provisional lexical facts.
The UI animates validated updates when the answer returns. Input is durably reserved
before the model call; revision checks still reject stale writes.

State v3 adds current/past/unspecified professional relationships, entity aliases,
relationship type, confidence, evidence, correction provenance and a bounded
question proposal. Historical clients remain potential charities, not current
employers. Trustee relationships can suggest charities, never verify registration.
Only confirmation of a server-returned official-record candidate queues preparation.
Manual edits are authoritative; subsequent conversational replacement requires an
explicit correction of that particular field. Saved signup/account context retains
these relationships and corrections. Existing drafts are upgraded on read without
an authentication or database migration; legacy flat data is retained, not silently
reinterpreted as a verified historical relationship.

The structured model contract explicitly considers each fact, with null for unknown
values, plus typed relationships, intent and bounded next-question proposals.
Field-level definitions distinguish referral, responsibilities, portfolio, interests
and concerns. Application logic validates grounding and entity boundaries, resolves
references conservatively, rejects questions for known details and requires a
present-focused work question after historical work. A proposed question after
charity confirmation is validated against the then-current state; it needs no extra
model call. Confirmation, ambiguous choices, completion and the exact final concern
question remain application-controlled. The person can leave once required account
fields are valid; six information turns limit optional questions and ten total
turns bound conversation. An outstanding charity confirmation is not represented
as completed merely because the optional budget is exhausted.

Model remains `gpt-5.4-mini-2026-03-17`, with low reasoning, a 4,000-output-token
cap and 35-second timeout. Open-ended fact lists and underspecified field semantics missed context in live tests.
Medium reasoning was also evaluated but rejected after repeatedly exhausting bounded
output limits; the final low-reasoning contract explicitly defines facts and intent. There is still one request per submitted answer,
no growing message history, `store:false`, no model tools, and a $0.03
request reservation with the existing $1 daily / $10 monthly defaults. No new paid service, account
system or object store was added. Existing PostgreSQL draft/profile storage,
24-hour draft expiry, charity jobs and disabled public PDF downloads are unchanged.

The reusable live suite and preview-only browser harness are documented in
`tests/onboarding-evals/README.md`. CI runs deterministic engine tests automatically;
billable live runs remain explicitly enabled. Final verification results and release
status are recorded below when completed.


Verified engine evaluation (16 October 2026): all 22 journeys passed with 35 genuine
model calls using the same `processTurn`, request schema and decoder as production.
The record in `docs/onboarding-engine-live-evaluation.json` includes every journey
and its actual next questions. It used 94,062 input and 18,657 output tokens: estimated
$0.154503 at $0.75/M input and $4.50/M output, or about $0.022 for five average answers.
Allow roughly $0.02–$0.04 per typical typed onboarding, excluding voice, retries and
provider price changes. This is an estimate, not a billing statement.

204 product unit tests (62 onboarding), nine isolated real PostgreSQL integration
tests and 31 desktop/mobile browser regressions passed. One duplicate mobile audio
case is deliberately skipped; desktop MediaRecorder uses generated audio. Build,
TypeScript and lint passed; lint retains two existing unrelated warnings. Review
included the actual mobile completion layout and profile/question visibility checks.
The public charity worker still uses deterministic retrieval, not new background AI.

The final real-model browser run passed both desktop (1440×1000) and touch-mobile
(390×844) journeys with four genuine model calls. It exercised the actual built
Next application/API and a fresh isolated PostgreSQL database. Desktop recording
used real MediaRecorder/audio analysis with generated input and a fixture transcript;
mobile used typing. Both confirmed historical Blue Cross context, corrected Marcus
Warry in the form, reloaded, supplied current work/referral/concerns, explicitly
confirmed a returned charity record, created a fixture account, navigated to Ask
SORP and verified the corrected name and historical relationship in the saved
account profile. See `docs/onboarding-engine-live-browser.json`.

Account, regulator and transcription providers were fixtures. No real email, payment,
physical microphone, iPhone hardware or Safari verification is claimed. The main
application/model code was verified; this is not a claim that every upstream service
was exercised on the public production domain. Public-document downloads remain
disabled under the existing production storage configuration.

Release 19 retains the existing auth cutover flags, subscriptions and product routes.
No database migration or new production service is required. Deployment status is
confirmed separately against the resulting Vercel production deployment.
