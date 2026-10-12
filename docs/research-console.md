# Private accountant research console

The console is part of the existing SORP2026 Next.js application at `/console/`. It reuses the SORP account service; each private page and API request verifies the backend session and checks its email against server-only `ADMIN_EMAIL`. The founder dashboard link is based on the same server check. No client-side email allowlist or test bypass is shipped. ChatGPT sign-in is not configured for this deployment. The public directory and other products are unchanged.

## Data and environments

Production uses the existing Neon `social-impact-excellence-platform` project (`lucky-sky-23094766`), main branch (`br-dark-block-audwtcnr`), with a separate `research_console` schema. Preview testing uses `sorp-console-validation` (`br-calm-queen-aucbc1bk`). Production and preview use different secrets and a `sorp_console_runtime` role restricted to the console schema. Its lack of access to `public.users` and lack of elevated role membership were checked. `CONSOLE_DATABASE_URL` is stored as a Vercel secret; `ADMIN_EMAIL` is server-only. No production secrets are committed or copied to client bundles.

The additive, repeatable migration is `migrations/001_research_console.sql`. Raw evidence, research runs, examined/unavailable sources, assessments, methodology revisions, reviews, import archives and change history are separate tables. Scores and original methodology references are append-only to the runtime role. Every change of thresholds creates a retained version. Displayed evidence levels use the latest boundaries; history shows the original version and level.

`node scripts/console-seed.mjs` emits reviewable SQL preserving the existing 110-row import, the separately researched Burton Sweet record, and three previously absent requested candidate names. It creates 114 unreviewed candidates, no invented scores and no completed research. Offices do not create firm records. Prior source classifications are preserved as provenance, not promoted to completed console assessments. The original ten-firm pilot workbook was not supplied.

## Research behaviour and limits

A name or website is first matched against existing names, aliases and domains. Unknown identities need human confirmation of the official website. Name-only web discovery and AI assessment are not configured. The real collector reads the official homepage and up to six relevant same-site HTML links, plus a supplied ICAEW record. It checks robots policy, pins verified public DNS addresses for requests, validates each redirect, limits bytes and time, identifies itself, spaces requests, and records unavailable sources. It never bypasses access controls. PDFs, JavaScript-only pages and sites with more restrictive crawl timing require manual research. There is no unattended whole-directory crawler.

Keyword extracts are explicitly unverified leads. They do not establish qualifications, SORP 2026 expertise or numeric scores. The provided methodology gives five category maxima but no detailed point rubric, and explicitly prohibits inventing one. Automatic scores therefore remain unavailable. A reviewer can save a manual assessment with every category justified and every positive award linked to current public evidence in that category. Zero is distinct from unscored. Research completion can also be recorded without scoring. New evidence, corrections or assessments invalidate an earlier approval.

A real Burton Sweet collection on Vercel examined six pages and saved exact URLs/extracts. ICAEW returned HTTP 403 and one firm link returned HTTP 404; these were retained as limitations. The collector initially exposed a Node 24 DNS callback mismatch, fixed by supporting both lookup callback modes. Failed attempts remain in history.

No authoritative complete UK ICAEW unique-firm baseline is available. The dashboard states this prominently and never treats the charity-tag import as the full population. A future baseline needs authorised comprehensive coverage, stable firm identifiers, branch-to-firm mapping, UK scope, source, date and limitations. No estimate is substituted.

## Imports, exports and recovery

CSV/XLSX uploads support preview, candidate validation, possible-duplicate warnings, preservation of all workbook cells/sheets in the import archive and idempotent reimports. Existing records are not overwritten or automatically merged. Structured mapping of the missing pilot's multiple sheets and scores still needs its actual format. Manual confirmed merges retain the source firm identity and a recoverable change trail.

XLSX exports include firms, people, offices, evidence, runs, source attempts, assessments, reviews, history and methodologies. CSV exports firms. Formula-leading text is neutralised. Exports can be restricted to approved firms. Server-side filtering/search/pagination limits ordinary lists to 25 firms. Workbook uploads are limited to 3 MB, 5,000 rows and 20 MB declared uncompressed ZIP data; exports currently cap at 10,000 firms.

Neon's observed point-in-time history window is six hours, not an unlimited backup promise. A pre-migration snapshot `snap-green-paper-aul38km7` was created on 12 October 2026, expiring 19 October 2026. Before future migrations, create a fresh snapshot and test on a branch. For a consistent portable backup, run `node scripts/console-backup.mjs /private/location/backup.json` with `CONSOLE_DATABASE_URL` set. This uses a repeatable-read transaction and writes all console tables, including import archives, with mode 0600 and no overwriting. Store that file outside the deployment filesystem. A test backup was verified locally. Automatic off-site backup scheduling and a one-click restore UI are not implemented. For recovery, restore into an isolated Neon branch, verify row counts, source relationships, assessments and access checks, then repoint only `CONSOLE_DATABASE_URL`; never restore unrelated MSI tables over production.

## Verification

The release passed 55 console flow checks, including desktop/mobile accessibility, plus the existing public homepage and account/product tests. Review-page real owner sign-in remains a user check; no password was requested.

- `npm run build`, `npm run typecheck`, `npm run lint` (one pre-existing warning in public/design-preview/accountants-advisers/preview.js).
- `npm run test:product-unit` checks existing product behaviour.
- `node --experimental-strip-types --test tests/product-unit/console-security.test.mjs` checks private-network rejection, URL restrictions and scoring boundaries.
- `tests/console-flow.mjs` exercises actual API routes and Postgres plus desktop/mobile browser flows. It uses a disposable PostgreSQL container on loopback port 5433 and explicitly resets **only that local QA schema**. `tests/console-auth-fixture.mjs` is a local stand-in for the trusted account backend; no application auth bypass exists. Run the app with `ADMIN_EMAIL=owner@example.invalid`, `SORP_BACKEND_ORIGIN=http://127.0.0.1:4319`, and the local QA database URL. These fixture identities and research records never enter production.
- `npm run console:verify-live` is an explicit release check on Vercel. It collects real Burton Sweet sources into the selected database and awards no scores. It is not part of the ordinary build command.

The owner must use their existing SORP password to complete a live authenticated browser session; the release agent does not have or change that password. Logged-out deployed routes and data-denial checks are verified independently. The console's “What's working?” page distinguishes working flows, missing configuration, future features and connection failures.
