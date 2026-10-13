# My Impact Director

The public page, five-star assessment, deterministic personalised report and agenda live together at `/my-impact-director/`. It reuses the live Ideas Shed `components/ai-ready/Assessment.tsx` interaction pattern: individual questions, native star radios, chapter rail, progress, Back/Next, four optional reflections and inline results. The original cyborg cow is copied unchanged from the Ideas Shed live source `public/cows/cow-ai.webp`; its website was not modified. Existing MSI and Ideas Shed logos are reused. Fluid's official current header logo is referenced from `https://www.fluiditconsulting.co.uk/wp-content/uploads/2025/06/Group-160.png`, verified from its homepage on 13 October 2026. All three logos link to the official organisations. The Fluid asset is externally hosted: this workspace's public-domain download restriction prevented storing it locally, so rendering depends on Fluid continuing to serve that URL.

## October page refinement

The hero now explains outsourced year-round support without a full-time salary. The free technology assessment sits directly beneath it, followed by support today, the management question, future agents, partners and booking. Scoped styles retain the original cow and folder identity, use clean sans-serif type, and keep the active question and controls below the existing sticky navigation. No new services, schema changes or subscription packages were introduced.

New visitors register or log in through the existing `AccountPortal`, embedded in the assessment invitation. A same-page refresh restores the authenticated session, updates the shared header and opens `#assessment` directly. Neither SORP completion nor SIE completion is required. The normal standalone login page retains its existing behaviour.

## Data and identity

- Existing SORP account authentication is verified server-side on every request. No new login, database or external service.
- `GET/POST /api/impact-director/` uses the existing `CONSOLE_DATABASE_URL` pool. This is a separate `msi_products.impact_director` table in the existing Neon `social-impact-excellence-platform` database. No SIE, readiness, account or team records are read or modified by this product's SQL.
- The immutable account ID from the trusted authentication response is the sole record key. Client-supplied identity cannot select another account. Explicit account matching also rejects stale tabs after account switching.
- Schema migration: `migrations/impact-director.sql`, first applied on existing validation branch `br-calm-queen-aucbc1bk`, then production `br-dark-block-audwtcnr`. It only adds the new product schema/table and grants the existing restricted runtime role SELECT/INSERT/UPDATE there; no DELETE or access to MSI users. This intentionally extends that role beyond its original research-console-only permissions.
- Revision-based conditional writes reject concurrent or stale updates. Browser saves are serialised. Failures are visible, never reported as saved.
- New assessments require a free account. Legacy guest drafts remain recoverable from their separate versioned sessionStorage key, but cannot be edited before authentication. Signed-in recovery drafts are keyed by account ID and loaded only after validating that account. Legacy guest import is explicitly confirmed after existing login, and never merges into SORP/SIE data. Divergent local/server revisions require a choice. A completed saved snapshot marks the product **Started**; its percentage measures the free snapshot, not completion of ongoing support.
- Report generation is local and deterministic, with five equally weighted area means; all ratings use the same concrete anchors. No organisation information goes to an LLM. Future agents are described as future capabilities, not running features.
- Only aggregate scores and user-provided context are used; the report clearly distinguishes self-report from verification. No comparative benchmarks are invented.
- Existing database history applies. Creating an additional pre-release snapshot was refused by Neon's snapshot limit; no existing snapshots were removed. The research-console export/backup scripts cover only their original schema, not the new product table. Include `msi_products` in a future product backup policy; do not claim the console backup protects it.

## Booking and lead handling

The page uses the existing `/api/booking/availability?service=free` and `/api/booking/free` interfaces: a free ten-minute introductory meeting. Successful booking confirmation and email invitation wording follow actual API response fields. No payment tiers or new booking system. Users bring their downloaded agenda; the existing calendar service does not automatically include it. Saved snapshots are account-linked product records, not automatic marketing subscriptions or outbound emails. A booking provides the existing service with contact details for follow-up.

## Validation

`npm run build`, `npm run typecheck`, `npm run lint`, `npm run test:product-unit`.

`tests/director.spec.ts` covers inline login and registration return paths, the full member journey at desktop/iPhone sizes, Back/Next, reload, report/agenda/download, keyboard stars, reduced motion, accessibility, control visibility beneath sticky navigation, existing booking request/confirmation, explicit legacy guest import, authenticated save/reload and real PostgreSQL-backed API isolation, CSRF, forged-owner, malformed-data and stale-revision rejection. Login/registration contract tests and calendar writes use controlled responses; no real customer credentials, welcome emails or calendar invitations are used. PostgreSQL persistence tests use a loopback identity fixture and the real application API. Live availability is checked read-only.

For full local integration tests, run a disposable PostgreSQL on loopback port 5434 (the local-only password in tests is not a deployment credential), create a `sorp_console_runtime` role, and apply the migration. Run `node tests/director-auth-fixture.mjs` on loopback 4320. Start the built app with `SORP_BACKEND_ORIGIN=http://127.0.0.1:4320` and `CONSOLE_DATABASE_URL` pointing to that disposable database. Run `DIRECTOR_QA=1 npx playwright test tests/director.spec.ts tests/platform.spec.ts --workers=1`. The fixture is not imported by the application; production has no test-user bypass. The duplicate mobile API-only test is deliberately skipped.

The existing platform suite verifies public product routes, login, dashboard, SIE answers, results, team context, Purpose pathway and report intake remain working. Real customer credentials are neither requested nor reset; actual customer sign-in is not impersonated in deployment checks.
