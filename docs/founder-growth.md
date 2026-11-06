# Founder Marketing & Sales

Open **Workspaces → Marketing & Sales** in Founder. The three channel URLs are
`/founder/growth/accountants/`, `/founder/growth/charities/` and
`/founder/growth/digital/`. The public website opens in a separate tab. Use a
private browser window to test a genuinely signed-out journey.

The workspace uses the same Founder authorization and same-origin write check
as the Control Centre. Accountant records reference the existing research firm
ID. A charity prospect can be created independently and linked to an existing
registered charity by ID. Confirmed referrals require an evidence note and a
linked charity. These links grant no access to an account or its data. Adviser
access and colleague invitations remain in the existing Adviser workspace.

Apply migration `migrations/014_founder_growth.sql` to the existing
`research_console` schema before release. It adds two tables, with no changes
to research, public listings, entitlements or customer records. The runtime
role can read and append activity, but cannot update or delete activity
history. Apply the same migration to the existing recovery-test database so
the backup verifier has the matching table definitions. Rolling back the app can leave both new tables in place.

Outreach drafts and preliminary reports stay private. Report approval is
version specific. Founders can copy a reviewed draft or download an approved
report and share it externally. External messages and sharing can be recorded
with evidence; the system does not claim email delivery. Contact review,
opt-out suppression and follow-up dates are recorded on the relationship.
Review UK direct marketing rules before sending:
[ICO business-to-business marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/).

Meetings use the existing booking link or are recorded after external booking.
Trials display the linked Founder entitlement and link to the existing
organisation access controls. The sales workflow has no independent trial or
billing state. Subscription payment, traffic, campaign spend and attribution
remain unavailable without their source connections. The digital page shows
dated account and readiness records without treating them as a single cohort.

For isolated browser verification, run the existing
`tests/console-auth-fixture.mjs` with a disposable database containing the
research, people, Founder and growth migrations. Seed the two fixture
organisations and researched firm described in `tests/founder-growth.spec.ts`.
Start SORP against that database, then run
`FOUNDER_GROWTH_E2E=true npx playwright test tests/founder-growth.spec.ts`.
Never point these tests at production.
