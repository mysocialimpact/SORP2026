# Authenticated contact and continuous improvement

## Existing systems reused

- The root layout’s single `SayHello` position remains the source of the communication experience on every page. Public visitors keep the existing hello form; signed-in users receive the shared Talk to Marcus and Help us improve component.
- Account identity, roles and organisation memberships come from the existing `/api/readiness-account` service. No second login or role model was introduced.
- Book a conversation links to the existing Google Calendar-backed free booking workflow. The booking form now uses signed-in account details when no saved readiness review is available.
- Founder access continues to use the existing server-issued `platformAccess.founder` role and the existing Founder Control Centre.
- Records use the existing Neon `research_console` database and restricted `sorp_console_runtime` role. Assessment answers, scores and product progress are not read or modified.

## New records

Migration `006_founder_feedback.sql` adds three isolated tables:

- `founder_feedback` for ratings, suggestions and user-reported problems;
- `founder_contact_enquiries` for questions, advice and meeting requests;
- `founder_improvements` for founder-approved “You Said. We Did.” updates.

Authenticated submissions are validated server-side, origin checked, idempotent by submission ID and limited per account. Published improvements contain founder-written summaries only and expose no submitter identity.

The schema can distinguish user-submitted problems from automatically detected technical errors. No central automatic error store existed in the inspected application, so this release does not forward arbitrary runtime errors or sensitive application state into the inbox.

## Founder workflow

The prominent Errors & Feedback section inside `/founder/` provides:

- feedback and contact inboxes with search, filters, pagination and source labels;
- status, recurring-theme and private-note updates with audit entries;
- direct email follow-up links;
- counts for new feedback, unresolved problems, average rating, resolved items and recent volume;
- recurring open-problem groupings;
- draft, edit, publish and unpublish controls for “You Said. We Did.”.

Only explicitly published improvements appear to authenticated users.

## Verification

- TypeScript and ESLint checks.
- Production Next.js build.
- Product-unit coverage for shared component content, authenticated persistence, table separation, constraints, grants and explicit publication.
- Desktop and mobile Playwright coverage for contact-first ordering, all five rating controls, rating-only submission, contact submission, published improvements, successful acknowledgements, responsive overflow and failure-state input retention.
- Neon migration validated on an isolated branch with charity and adviser records, status/notes changes, linked publication and rejection of a six-star rating.
