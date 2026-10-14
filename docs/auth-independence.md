# SORP account independence: architecture and cutover record

Status: implementation design; production still uses the existing account broker.
This document records the 14 October 2026 production inventory and the gates for
an independent SORP account service. It is not evidence that a cutover occurred.

## Current trust path

The SORP Vercel deployment forwards `/api/readiness-account` to
`https://mysocialimpact.org` using `SORP_BACKEND_ORIGIN`. My Social Impact
derives an `/accounts` URL from `COW_GROWTH_EVENT_URL`, authenticates to that
service with `COW_GROWTH_EVENT_KEY`, and sets the `msi_sorp_session` browser
cookie using the token returned by Cow. Cow D1 contains the account credentials,
session hashes, assessment progress and at least some organisation and adviser
records. SORP's founder and adviser checks consume `platformAccess` from this
path. The SORP Neon connection is currently used for founder commercial records,
the research console and some product data, not the main website login.

The published Cow Site is version 188 (source commit
`f7785b2af0c3c7f9a85e3d898224a5d0d5dcd10b`). Its source is not the Cow
GitHub default branch (`9a46cff45b102b8e54c4bfa8788725efd61d067f`). The
available Sites interface exposes version metadata and D1 rows but did not
provide a retrievable copy of that version's source. Therefore its exact live
permission rules remain unverified. No permission behaviour should be inferred
from the older branch.

## Read-only production inventory

The Cow Site's `DB` binding contains 15 `sorp_accounts` rows, 23 session rows,
three `sie_organisations` rows, three `sie_organisation_members` rows, one
active `sorp_adviser_client_access` row, one consumed
`sorp_account_imports` row sourced from legacy Social Impact Excellence, one
completed team invitation, one team round and one team response. The table-read interface
cannot display one account row because it exceeds its safe size limit. It also
truncates the `progress` value in Brainstrust's otherwise readable account row;
that truncated value is not valid JSON and must never be imported. These
counts are a point-in-time observation, not a migration manifest. In particular,
the account count was obtained by paging and counting the one oversized row.

Fourteen account rows were readable: nine use `example.invalid`, one uses an
obvious test domain, one uses `mysocialimpact.org`, one uses `gmail.com`, one
uses `marcuswarry.com`, and one uses `brainstrust.org.uk`. The Brainstrust row
has a nonempty saved assessment (last saved 14 October 2026), one owner
membership in a team organisation, one open team round, one completed
invitation and one completed response. These records have matching immutable
organisation, round and invitation links. The one active adviser-client grant
and the one standalone assessment run do not belong to that Brainstrust
organisation in the visible D1 data. This is a classification for review,
not permission to discard any of the other records.

The existing `social-impact-excellence-platform` Neon project contains 12
`public.users`, 12 `public.organisations`, 12 `public.organisation_members`, two
`research_console.founder_organisations`, one active founder membership with an
account ID, and no founder invitations or founder client-access rows. The
`public` users belong to a separate schema and must not be treated as SORP
website accounts without an explicit identity reconciliation. Another existing
Neon project has Managed Auth enabled, but it is not SORP's current account
store.

Among the 14 Cow account rows the read-only connector could display, none has
an ID equal to a Neon `public.users` ID; two have matching email addresses.
The active founder membership's account ID matches one of those visible Cow
accounts. The oversized Cow row could not be compared. Matching email alone
must not merge the two identity systems or transfer privileges.

The SORP Vercel project has no configured transactional mail provider. The
current password recovery path uses My Social Impact and Cow. Four IONOS
forwarders now exist for `hello`, `support`, `accounts` and `security` at
`sorp2026.org`; all forward to `marcus@mysocialimpact.org`. Forwarding does
not send transactional mail. Resend is the selected sender, with
`SORP 2026 <accounts@sorp2026.org>` as From and
`marcus@mysocialimpact.org` as Reply-To, but registration, domain verification,
API key provisioning, delivery and reply testing are still outstanding.

## Target decision

Run the account service in SORP's existing Next.js server on Vercel. Use a
dedicated `sorp_auth` schema in SORP's existing Neon PostgreSQL project and a
database role scoped to that schema and explicitly needed application tables.
Use self-managed Better Auth for credentials, verified email, sessions,
revocation and founder TOTP MFA. Managed Neon Auth is not selected because its
currently exposed features do not include required MFA. Keep SORP-specific
organisation membership, adviser-client grants, plan entitlements and
invitations in application tables with explicit foreign keys and server-side
checks. Do not derive founder authority from an email string or client data;
create a founder grant only through an audited, out-of-band bootstrap and
require a new MFA-protected session after the grant for privileged requests.
The guarded `scripts/grant-sorp-founder.ts` command is dry-run by default;
it checks the exact user ID and email, verified email and TOTP, and records
the operator and reason when applied. It has only been exercised with a
synthetic local account, not a live founder account.

Retain the existing `/api/readiness-account` response contract to avoid a UI
redesign. Introduce the independent service behind a disabled-by-default
switch, and do not enable it in production while any account action still
falls back to Cow or My Social Impact. New sessions will be SORP-host-only,
HTTP-only, Secure, SameSite=Lax and revocable. Login attempts and recovery
requests need shared durable limits in PostgreSQL or another already approved
durable store; process-local memory is insufficient. Email verification and
reset messages must use a SORP-owned sender. Progress and product rows remain
addressed by the original stable account ID, so application foreign keys and
saved work do not need to be rewritten.

Brainstrust and any subsequently confirmed genuine account should keep its
original immutable ID. Import only records whose ownership and completeness
can be verified. The preferred simple path is an imported account with no
reusable legacy credential, verified mailbox ownership and a new password.
The founder can set a new password, but the existing founder account ID should
be retained or explicitly reconciled with its Neon membership. Disposable
test accounts can be recreated. No Cow password hash or session will be
migrated. Users establish new SORP sessions.

The staged claim path prepares one immutable customer ID and unverified email
without a password. Better Auth sends a verification link and a reset link
through Resend; completing both creates the customer's new credential. A
small isolated importer can preserve Brainstrust's original organisation,
membership, round, invitation and completed response IDs after the new
account verifies its email. It passed a synthetic PostgreSQL round trip but
has not run on live customer data. Brainstrust's account progress is separate
and the read-only connector provides an incomplete value. It must be obtained
from a complete export, then reconciled to the same original account ID.
Independent authentication development can continue while the original Cow
record stays untouched and available for recovery.

## Implementation prepared on the work branch

The disabled-by-default `SORP_AUTH_CUTOVER_ENABLED` switch routes the existing
`/api/readiness-account` contract and founder, console, platform and Impact
Director identity checks to the SORP-owned `sorp_auth` schema. The cutover
branch does not silently fall back to Cow for those identity checks. Google
sign-in is disabled under cutover because no independent Google identity link
has been established. Staging routes remain guarded by their separate switch.
No production database, deployment setting, DNS record or customer account has
been changed.

The independent service implements verified-email registration, new-password
login, logout, recovery, saved readiness progress, product progress, founder
TOTP and audited grants, organisation membership and invitations, adviser
membership and client creation, charity approval/revocation, and team round,
invitation, confidential response and aggregate rules. The founder dashboard,
organisation search/detail/create, plan and complimentary status, invitation
and read-only client-access requests are connected. Adviser requests cannot
edit client assessments or manage client invitations; those permissions are
rejected server-side and hidden in the independent founder view. Billing
remains a separate service and a plan change does not itself charge anyone.

Synthetic PostgreSQL integration tests cover customer ID claim and team data,
assessment import and overwrite refusal, confidentiality thresholds,
revoked/expired team links, founder TOTP and revocation, and adviser access
before and after charity approval. A local HTTP check covers the actual Next
route for login, founder denial before grant, TOTP challenge, founder route,
organisation creation and plan change. Separate tests cover durable login
limits, expired sessions, report upload ownership and PDF bytes, including an
exact 15 MB file in five chunks. A Chromium
browser check passed the real login, two-chunk report upload and persisted
listing. Both migrations applied cleanly to a fresh isolated PostgreSQL
database. A synthetic schema backup was restored and its report bytes matched.
The tests do not establish production mail delivery or live customer acceptance.

The Brainstrust email hold is enforced in code for verification, recovery and
invitations; it cannot be lifted by an environment setting. No email to Will
or anyone at Brainstrust is authorised during preparation. Releasing the hold
requires Marcus's explicit approval and a reviewed code change. Synthetic
tests mock the mail network; none send a real message.

The Charity Impact Report page now has an independent account-scoped upload
and listing path. It stores PDFs in the existing SORP PostgreSQL database,
using 3 MB chunks so a 15 MB file can pass the Vercel request limit without a
new paid storage provider. Every chunk requires the current verified session,
completed readiness review and a single-use, expiring token. The server checks
the total length and PDF markers before publishing a private listing. Completed
files can be downloaded only by their owner or an MFA-authorised founder.
This path remains disabled while cutover is off. Existing MSI report objects
must still be inventoried and preserved; the isolated tests do not establish
production database capacity or backups for customer PDFs.

## Brainstrust data transfer

The existing Cow rows remain the recovery source. Team organisation,
membership, round, invitation and completed response can be copied with
`prepare-sorp-customer.ts` and `import-sorp-team.ts` after verifying source
IDs and ownership. Exact Cow team rows were assembled into a private local
manifest at `/workspace/sorp-migration-private/brainstrust-team.json`,
validated without applying them, and excluded from the repository. The
founder ledger and Cow client-access record were similarly captured in
`/workspace/sorp-migration-private/founder-reconciliation.json`.
`reconcile-sorp-organisations.ts` maps the founder Brainstrust alias to the
original team ID and the FLUID alias to its adviser organisation; it does not
assign adviser membership or activate the existing Cow client grant. It passed
an isolated integration test. The existing assessment progress is too large for the
read-only table view and **has not yet been copied**. A gated download route
(`SORP_AUTH_LEGACY_EXPORT_ENABLED`, off by default) can use the customer's
existing session to return the full JSON and a SHA-256 digest. The isolated
`import-sorp-assessment.ts` command requires that digest, the original account
ID and a verified matching new email; it refuses to overwrite different
newer work. Neither route nor script has run against the real account.

When customer contact is authorised, the simplest path is for the authorised
owner to sign in to the old site once, download the assessment export and
transfer it to Marcus through a secure channel, then establish a fresh SORP
password and check the restored assessment and team work. If old sign-in is
unavailable or the old broker cannot return the complete progress, obtain a
complete Cow D1 export. Do not infer the missing bytes from the truncated row,
and do not delete or disconnect the original records before the work is
verified in the new account.

## Exact remaining gates before disconnecting Cow account infrastructure

1. **Email.** Marcus must finish Resend registration and domain verification,
   provision a SORP-only API key, configure production secrets, and test
   delivery, forwarding and replies with non-Brainstrust addresses. Keep the
   Brainstrust hold in place until he explicitly releases customer contact.
2. **Data and identity.** Back up Cow D1 and the target Neon database and test
   isolated restores. The live founder ledger contains Brainstrust and FLUID;
   Brainstrust's ledger alias differs from its immutable Cow team organisation
   ID. Its one active ledger membership matches the Cow customer account ID.
   The two FLUID ledger memberships are still invitations with no account ID;
   the active Cow adviser-client grant must not be assigned to an unverified
   adviser identity. Reconcile Marcus's chosen founder account ID and TOTP
   grant, then confirm FLUID ownership and the client grant separately.
   Import the complete Brainstrust assessment and team work, plus any other
   genuine customer product records. Avoid duplicate organisations. Confirm the
   customer can see the original work in a fresh SORP login before switching
   them; resolve any Cow writes made during transfer.
3. **Account-linked report files.** The new PDF upload, listing and private
   download pass local integration and browser tests. Inventory any reports
   already stored by MSI and transfer them with owner IDs before cutover.
   Verify target database capacity, production request limits, and backup
   recovery for private PDFs. No existing upload may be silently lost.
4. **Permissions and acceptance.** The synthetic suite and a report browser
   journey pass. Run actual browser journeys for a founder, charity owner,
   team participant and adviser against the final staging configuration.
   Verify email confirmation and
   recovery with real Resend, founder MFA, session expiry/revocation,
   cross-tenant denial, plan expiration, adviser approval/revocation and
   audit records. Recheck the invitation and upload flows using the final
   production configuration. The published Cow source remains
   unavailable, so test the promised SORP policy directly rather than
   assuming exact behavioural equivalence.
5. **Deployment and rollback.** Apply the two migrations with a restricted DB
   role in a staging environment, configure SORP auth secrets and sender,
   test full workflows and verify database backups. Deploy with cutover off;
   only then enable the reversible switch in a controlled window. Monitor
   sign-in, save/reload, founder and adviser denials, recovery, team data and
   assessment digest. Roll back routing if identities or permissions differ.
   Keep Cow records intact and its credentials available for rollback until
   genuine users can access all work independently.

Other SORP routes still call My Social Impact for booking, payments, public
readiness research, transcription, report delivery and Ask SORP. The
`growth-click` route can send an event directly to Cow when its separate
`COW_GROWTH_EVENT_*` settings are present. These are not the account login
path, but they mean "disconnect Cow entirely" is broader than switching
SORP authentication. Inventory them before removing shared credentials or
claiming complete infrastructure separation.
