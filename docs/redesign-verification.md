# SORP 2026 redesign — review and verification

Inspected on 10 October 2026. Baseline: `50d1af5213019df6e9ed14932b136ee692d4bb34`, production deployment `dpl_FgkCmCaHYFAay9anpvKLFeDxzM7o`. Vercel confirmed that this was still the live deployment when this work began. Feature branch: `feat/sorp-simpler-redesign`. Production, DNS and the MSI website have not been changed.

Review preview: https://sorp2026-qbshbvbcu-marcuswarry.vercel.app (`dpl_2rY4mLARaWg2PbQjyBhcc1SEbkMT`). Build, TypeScript and ESLint passed; all 58 product unit tests and 22 desktop/mobile browser tests passed. The separate full 19-answer/report/restoration fixture journey passed at both 1440px and 390px.

## Design and preservation

Footer update: every website build now includes a timestamp-derived build number, its build date/time in Europe/London (explicit BST/GMT), and Preview/Production status. Next.js embeds these at compile time; reloading the page does not advance the timestamp. The Ideas Shed Limited's registered details (England and Wales, company number 17380053) were verified against the footer of `https://www.theideasshed.com/` on 10 October 2026 and added beneath the official logo attribution.

Four main navigation destinations: Home, Are You SORP Ready?, Ask SORP, Contact. The gateway uses ink, orange and soft violet, a short typographic opening and two product panels. It retains the existing deeper/supporting URLs without putting them in the main navigation.

The readiness presentation still uses the existing `SorpFilm`, all nine scenes, artwork, chapter controls, transitions and assessment URLs. The film component and its CSS are unchanged from the production baseline. Experimental swipe, sticky-bar and slide-height changes were removed following the user's preservation instruction. Only the missing original Lora font and skip-link targets are restored. The 19-question methodology, assessment engine, data and backend services were not replaced.

The existing Charity Commission solution is preserved, not recreated. The relay matches `mysocialimpact/are-you-sorp-ready` byte for byte (Git blob `42079b139765bd0f5cb10925b9605e5753461e26`). This includes commit `5cf659f9` (London region), `3aa85539` (retry invalid PDF responses), timeouts, official-source validation and PDF checks. Its existing regression tests remain in the suite. Public-report preparation, assessment, retry and upload-recovery code were not changed by this redesign.

Read-only Vercel configuration checks confirmed that production uses `SORP_READINESS_API_URL=https://sorp2026.mysocialimpact.org/api/readiness`, the same existing research service used by the original product, and `SORP_BACKEND_ORIGIN=https://mysocialimpact.org` for the account/booking proxies. Preview inherits the MSI proxy origin and the code's identical readiness-service default. No backend endpoints or credentials were replaced.

Ask SORP has a four-slide presentation with keyboard, chapter and touch navigation. It is labelled coming soon and contains no simulated assistant. Contact is a working mailto link, not a form.

Official assets were downloaded without redesigning the logos:

- MSI logo: `https://mysocialimpact.org/assets/my-social-impact-horizontal.png`.
- The Ideas Shed logo: `https://www.theideasshed.com/brand/ideas-shed-logo-approved.png` (also used on MSI).
- Existing approved portraits retained from `mysocialimpact.org/assets/marcus-final.jpg` and `/assets/chris-final.jpg` via the local WebP versions.
- Chris’s exact published MSI title is **Co-founder | Brand, Purpose & Ethical Marketing**. Source: the team section of `https://mysocialimpact.org/`.

## Verified against live services

- Public charity search and confirmation for Interim Spaces CIO (1165694).
- Email/password signup through SORP2026 → the existing MSI account backend.
- Secure session restoration, saved progress, logout, subsequent password login and restoration of saved answers.
- A second signup through the actual browser form in the live readiness journey.
- Live calendar availability for free (10 minute), readiness (£50/30 minute) and wider (£100/60 minute) services. Responses contained 16, 29 and 12 slots respectively, in Europe/London time. No appointments were created.
- Production `.org` remains on the existing build. `.com` still failed the HTTP check; its earlier IONOS DNS problem has not been fixed as part of this redesign.

The opt-in account diagnostics created three labelled QA accounts with random passwords and undeliverable `@example.invalid` addresses. Two successful runs logged out their sessions; the first API run stopped after an unexpected but successful HTTP 201 signup response. No customer account was reused or altered. QA records can be removed by the account-service administrator under the names `SORP QA verification — automated test` and `SORP journey QA — automated test`. There is no account-deletion API in this repository. Do not run these live diagnostics automatically in CI.

### Live assessment verification limit — not a missing migration fix

The browser test reached public-report retrieval. The service reported **HTTP 502 after six download attempts**, including the existing fallback route. Incident: **INC-20261010-62D70C5A**. The application preserved progress and displayed retry and PDF-upload recovery. It did not fabricate a score. This individual failed retrieval does not establish that the previously solved Charity Commission work was lost: the original relay fixes are present, byte-identical, and unchanged. The live journey did **not** reach historical assessment, final report or email delivery on this run. A successful live retry or a readable genuine Trustees’ Annual Report PDF is still needed for that independent end-to-end check. The controlled full-journey tests below do not establish live report-engine correctness.

## Controlled tests (no external delivery or money movement)

- Desktop Chromium and a 390px iPhone-sized Chromium viewport: public pages, mobile menu, original presentation, all nine slide selections, review links, horizontal overflow, visible controls, artwork and WCAG axe checks on public gateway pages.
- Ask SORP chapters, keyboard controls, final coming-soon state and no pretend chatbot.
- Account/backend proxy contract, same-origin checks and safe failures without service configuration.
- Complete browser flow with explicit API fixtures: public-document checkpoint, retry status, evidence walkthrough, all 19 answers, report generation, action agenda, completion, PDF email request contract, deduplication and report restoration with local storage cleared.
- Free, £50 and £100 booking simulations, including the current review’s name/email/organisation, checkout initiation and paid-finalisation callback. All calls and Stripe are intercepted.
- Payment return: pending and expired remain unconfirmed; paid displays the verified amount; cancellation displays no payment taken. Backend responses are simulated.
- Existing 58 product unit tests.

`tests/live-services.mjs` requires `SORP_LIVE_ACCOUNT_TEST=true`. `tests/live-readiness.mjs` requires `SORP_LIVE_READINESS_TEST=true` and blocks all email, payment, booking and tracking writes in its browser. Neither is part of CI. The regular browser suite and `tests/sorp-journey.browser.mjs` are safe local/CI checks.

## Defects fixed

1. Original Lora typography was missing; migrated slides fell back to Georgia and assessment headings inherited Instrument Serif. Lora is now locally loaded and scoped to the product.
2. Booking read the obsolete `msi-sorp-final-candidate-v1` storage key. It now reads the current canonical review, with a fallback for older sessions.
3. Booking confirmation always claimed a calendar invitation was sent, ignoring `invitationSent`. It now reports the actual response.
4. The presentation and assessment main landmarks lacked the root skip-link target. Added `id="main"`.

## Remaining limits and required actions

### iPhone

No physical iPhone or remote real-device session is available in this environment. Chromium mobile emulation and screenshots are verified; actual iOS Safari visual parity is not. Review the preview on an iPhone, including the original presentation controls, Start Review access, text zoom and the assessment keyboard. The original dense eighth slide has a potential clipping issue at narrow portrait widths; its layout was deliberately left unchanged rather than silently redesigning the product.

### Email and Stripe

No report email was sent. The local test verifies the request and a mocked PDF receipt, not SMTP delivery or a real attachment. A nominated test recipient and approval for a test email are required to verify delivery.

The existing frontend uses the live Stripe publishable key. No matching Stripe/Milkmaid test-mode environment was available, so no real checkout session, charge or authorised payment was made. Simulations verify the client flow and return states only. A safe existing test-mode configuration must be made available for provider-level testing; do not point test cards at the live environment. Free and paid booking creation and actual calendar invitations also remain untested because they would create real appointments/send email.

### Google sign-in

Still hidden via `GOOGLE_ACCOUNT_SIGN_IN_ENABLED = false`. No replacement OAuth client, secret copy or scope expansion was made. An authorised administrator of project **my-social-impact-booking (37244113971)** must add `https://sorp2026.org/api/booking/google/callback` to the existing client **37244113971-j2as22hkajrsa5msbaq9oauvgb5qhkul.apps.googleusercontent.com**, preserving all existing URIs and scopes. The administrator identity remains unconfirmed. Complete callback/session tests before enabling the UI. The previously rejected account is not evidence that another account will have access.

### Password recovery

Account route actions are signup, login, save and logout. Self-service reset is not implemented. The existing account service would need single-use, expiring reset tokens stored as hashes, an approved transactional reset email, and reset/request endpoints; then SORP2026 can proxy those routes and provide simple recovery screens. This can use the current account store/email provider without creating another authentication system. Manual assistance remains via Marcus.

### Cow/Grow attribution

SORP2026’s proxy sends `x-sorp-destination: sorp2026.org`, but the inspected MSI `/api/growth-event` implementation forwards every event with `source: "msi_sorp_web"`. Distinct SORP2026 attribution is therefore **not verified** and the source field is demonstrably not separated. The MSI backend needs an approved change to map the destination to a distinct accepted Cow/Grow source while preserving MSI’s existing source, followed by confirmation in Cow. This is outside the instruction not to modify MSI. No Cow PR or service-key implementation was merged and no extra secrets were introduced here.

### Deployment

Preview deployments are noindex and stay off the production aliases. This cloud environment blocks outbound requests to `*.vercel.app`, so Vercel’s successful preview build/Ready status and local browser checks are available, but an HTTP check of the preview URL from this cloud is blocked. The URL can be opened in an ordinary browser. Production approval is still required before merge/promotion; DNS changes require separate approval.
