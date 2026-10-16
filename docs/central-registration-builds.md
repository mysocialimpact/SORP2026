# Central registration and build identification

Implementation branch: `integration/central-registration-build-bar`, based on production commit `31900e69a10c0a5f333df3ba2424ea456cceda13` (Build 20). No conversational experiment or PR #88 code is included.

## Registration audit

| Surface | Registration | Sign-in / workflow continuity |
| --- | --- | --- |
| Shared desktop/mobile header and assessment headers | `/get-started/?next=...` | Full local path, query and fragment; campaign parameters retained |
| Are You SORP Ready? published review | Central gateway replaces anonymous local form | Existing local review and navigation history remain; signed-in save stays in place |
| Readiness basic / conversation assessment | Central gateway replaces anonymous save-modal registration | Existing local draft remains on this device; signed-in save is unchanged |
| Ask SORP local workspace | Shared central registration; public questions remain public | Existing sessionStorage conversation remains on this origin |
| Charity Impact Reports | Direct central registration for report review; no readiness detour in landing CTA | Existing report upload, service eligibility and paused checkout unchanged |
| Social Impact Excellence | Direct central registration / baseline; no readiness prerequisite in landing CTA | All six protected workspace guards preserve query/fragment, including question number |
| My Impact Director | Embedded account portal links to central registration | Guest sessionStorage recovery and existing account snapshot remain unchanged |
| Invitations | Central registration retains invitation token in return path | Existing authenticated invitation acceptance and email-match checks unchanged |
| `/login/?mode=signup`, `/signup`, `/sign-up`, `/register` | Redirect to `/get-started/` | Existing safe `next` / `return` parameters retained |
| Settings / upgrades | Existing signed-in controls | No onboarding is introduced into billing; prices/providers/entitlements unchanged |

**External boundary:** ongoing paid Ask SORP access at `asksorp.mysocialimpact.org` / the original service still has its own account and checkout. Its existing continuation link is preserved. There is no verified SSO bridge in this repository. This branch does **not** claim to unify that external account or change its subscription. Former independent Social Impact Excellence accounts also retain the existing support/migration warning.

## Stable onboarding

The production conversational state engine, prompts, model selection, voice recorder and transcription are untouched. The same existing charity lookup/confirmation UI is now available in the conventional form. The account button checks name, valid email, role, organisation/explicit independent status and confirmed charity; the progress indicator counts these five requirements. This is UI/action validation, not a new authentication provider. The existing account endpoint, verification and session-cookie hand-off are retained. Legacy API compatibility is preserved; backend account rules have not been migrated or redefined.

## Deployment metadata

`npm run build` first runs `scripts/prepare-build.mjs`. A restricted build-only credential calls an atomic allocation function on the **existing nonproduction validation database**, in a separate metadata-only schema. It has no table SELECT privilege and no customer-table grants. No account or production database migration was performed.

The ledger continues after Build 20, allocates one sequential integer per Vercel deployment ID, and reuses the original row if that deployment's build step retries. Failed deployment attempts may consume an identifier. A new deployment of the same commit receives the next identifier. The timestamp is the actual build's immutable allocation time, not the visitor clock, Git commit date or page render time. It is a build timestamp within the deployment, **not Vercel's later READY/promotion time**.

One generated `.sorp-build.json` source is compiled into the top bar and footer and published as `/build-info.json` with `Cache-Control: no-store, max-age=0`. `Europe/London` formatting handles GMT/BST. Environment is taken from Vercel's deployment target. Local builds say Development / Local build, never pretend to be a numbered deployment. Missing metadata configuration fails a Vercel build rather than silently reusing Build 20.

Before an approved production rollout, configure the restricted `SORP_BUILD_METADATA_URL` for Production, review the metadata schema/function setup, and remove only this branch's automatic-preview suppression as appropriate. This task has configured **branch-scoped Preview variables only**. No production settings have changed.

## Preview isolation and verification limits

The integration Preview explicitly says synthetic accounts / payments disabled. A Preview-only, branch-scoped switch intercepts **every `/api/` request before production handlers**. A signed, short-lived browser cookie holds synthetic profile/charity information. No password is persisted, and no database, email, model, report analysis, research or payment request is made by these synthetic APIs. The backend origin and account/database feature flags are additionally disabled for this branch. Production cannot enable these fixtures even if the switch were accidentally copied there.

Charity matches in this Preview are labelled synthetic fixtures; they do not claim real register verification. Official lookup and background preparation code remain unchanged on the production path. This is a routing/build-identification Preview, not the unapproved conversational experiment. Production sign-in, real email verification, payment completion, external Ask SORP SSO and a physical iPhone cannot be fully verified through synthetic services. Browser mobile checks use Chromium emulation.

Run deterministic checks with `npm run test:product-unit`; run real UI journeys against an isolated build with `node tests/central-registration.browser.mjs`. The browser suite tests all five registration return paths, manual registration, explicit charity confirmation, authenticated bypass, returning-user sign-in, legacy registration redirects, billing isolation and top-bar scrolling on desktop/mobile. Synthetic identities only are written to QA artifacts.
