# SORP independent authentication release runbook

Status: revised on 23 October 2026. Production cutover is **not authorised**.
No Brainstrust email has been sent by this work.

## Controls that must stay off

- `SORP_AUTH_CUTOVER_ENABLED=false` (or absent). The existing site continues
  using its current MSI/Cow account route.
- `SORP_AUTH_STAGING_ENABLED=false` in production unless a separately protected
  staging environment is being used.
- `SORP_AUTH_LEGACY_EXPORT_ENABLED=false` until a private owner download is
  scheduled. Never enable this endpoint during cutover.
- Brainstrust verification, recovery and invitation email is blocked in code.
  Only a reviewed change after Marcus's explicit approval can release it.
- `SORP_AUTH_EMAIL_DELIVERY_ENABLED=false` (or absent) blocks all SORP account
  mail even if a Resend key is present. Synthetic tests use
  `SORP_AUTH_EMAIL_RECIPIENT_POLICY=allowlist` and exact addresses in
  `SORP_AUTH_EMAIL_ALLOWED_RECIPIENTS`; no domain wildcards. Public delivery
  requires the explicit `public` policy, live cutover, the canonical production
  auth origin and staging off. Brainstrust domains remain blocked in either mode;
  add any known personal addresses to `SORP_AUTH_EMAIL_BLOCKED_RECIPIENTS`.

## Code-only production deployment with cutover off

1. Verify the Vercel target is the `sorp2026` project under the existing team,
   and check the current production deployment and the intended source commit.
2. Run TypeScript, lint, the focused product tests, isolated PostgreSQL tests,
   the local founder HTTP test, the report browser test and `next build` for
   that exact commit. Confirm the switch is absent or `false` in production.
3. Deploy the tested commit without changing production environment values,
   database schema, mail or routing. The new auth, export and report endpoints
   must return 404 while the switch remains off.
4. Smoke test current login, dashboard, founder access, report upload and
   logout through the existing path. Record the new deployment ID and its
   predecessor. If any current path regresses, restore the previous deployment.

The code-only deployment does not imply that independent authentication is
usable. The production project currently has no `SORP_AUTH_DATABASE_URL`,
`SORP_AUTH_SECRET`, `SORP_AUTH_BASE_URL` or `RESEND_API_KEY` configured.

## Independent staging and data protection

On 23 October a Neon snapshot restore with `finalize: true` unexpectedly
replaced the production branch mapping. The active production compute
`ep-proud-wave-auuym3pa` now points to `br-bold-fire-au0lio9b`; the former
production branch `br-dark-block-audwtcnr` is retained as
`sorp-auth-staging-20261023 (1)`. All 31 `research_console` tables had matching
row counts and content digests across the branches immediately after the swap,
and live smoke checks passed. Do not delete either branch or assume this is a
durable backup. The only manual snapshot, `snap-blue-cherry-aun2mi1o`, expires
on 30 October 2026. Resolve the branch mapping and arrange a separate retained
backup before cutover.

1. Preserve the existing Cow service and D1 records. Legacy account and data
   migration is deferred; do not contact Brainstrust. Keep the old service
   accessible until its owner separately verifies complete recovery. A truncated
   table view does not prove the assessment is recoverable.
2. Back up the target Neon database and restore it to an isolated branch. Verify
   data counts and digests. A Neon snapshot is temporary and the observed history
   window was six hours, so arrange a separately retained backup before cutover.
   **When restoring a snapshot for testing, pass `finalize: false`.** Finalizing
   swaps the production branch and its compute, even when a new branch is requested.
3. Apply `008_sorp_auth_provider.sql`, `009_sorp_auth_application.sql`,
   `010_sorp_report_ownership.sql`, `011_sorp_auth_audit_integrity.sql`, then
   `012_sorp_excellence_access.sql` to
   a fresh isolated staging database. These migrations passed from scratch in
   local PostgreSQL; no production migration has run. Create the distinct
   `sorp_auth_runtime` login with SQL as the schema owner, with no role
   memberships or admin attributes. Neon's role-creation API adds
   `neon_superuser` membership, so it cannot provision this web role. Apply
   `scripts/provision-sorp-auth-runtime.sql` with a direct owner connection,
   then verify it cannot read `research_console` or modify audit history. Use
   only its pooled URL for application traffic.
4. Set the SORP auth database URL, a new secret of at least 32 characters,
   `SORP_AUTH_BASE_URL`, and the SORP-only Resend key in protected staging
   settings. Explicitly enable account mail for a finite allowlist of approved
   synthetic addresses. Test verification, recovery, invitations, expired and
   reused links, delivery failures, forwarding and replies. Confirm Resend
   domain verification, SPF, DKIM and DMARC. Review known Brainstrust addresses
   outside its domain for the blocklist. Do not expose credentials in logs or artifacts.
5. Verify the founder's identity independently, create a new credential, enroll
   TOTP, and run `grant-sorp-founder.ts` first as a dry run. Grant only the exact
   verified new account ID after MFA is confirmed; an email match is insufficient.
6. Test at least two synthetic charities and two advisers, including invitation,
   explicit consent, immediate revocation and cross-organisation denial. Do not
   create a Brainstrust account or transfer its legacy work during this release.
7. Test new Charity Impact Report work: a 15 MB PDF, owner listing, founder
   download, denial to another account, backup/restore and Neon storage capacity.
   The independent path stores PDFs in Postgres and does not provision a bucket.

## Cutover gate and rollback

Enable the switch only when Resend works, backups restore, Brainstrust's
assessment has a verified recovery route in the retained old infrastructure,
its legacy account remains quarantined,
founder and adviser permissions are reconciled, all critical integration and
browser checks pass, and the current Cow account path is still available for
rollback. Do not contact Brainstrust until Marcus explicitly approves it.

At the approved cutover, change the recipient policy from `allowlist` to
`public` in the same controlled production revision as the auth switch. Verify
that a new non-Brainstrust user can receive verification and recovery mail;
the explicit Brainstrust block must continue to reject its domain and any
known external contact addresses.

Cutover is a production environment revision followed by a deployment. Capture
the prior environment revision and deployment ID first. After enabling, verify
new login, save/reload, recovery, founder MFA, cross-tenant denial, charity
approval/revocation, team confidentiality and report upload/list/download.
Do not claim Brainstrust's legacy assessment is available in the new account.
If any identity, data or permission mismatch appears, restore
`SORP_AUTH_CUTOVER_ENABLED=false`,
redeploy the known-good revision and direct users back to the existing path.
Retain Cow D1 and its service credentials for recovery until genuine users can
access all preserved work independently.

## Separate MSI/Cow connections

Booking, payments, public readiness research, transcription, report delivery
and Ask SORP still call MSI services. `growth-click` can call Cow directly
through `COW_GROWTH_EVENT_*`. These are separate from the new account and
permission path. Do not remove their credentials as part of auth cutover;
review each product connection before claiming full Cow/MSI separation.
