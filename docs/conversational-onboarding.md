# Conversational onboarding — implementation and release record

16 October 2026. Additive implementation; **not a production cutover**.

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
