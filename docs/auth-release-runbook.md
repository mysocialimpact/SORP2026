# SORP independent authentication release runbook

Status: revised on 15 October 2026. Production cutover is **not authorised**.
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
  mail even if a Resend key is present. Migration tests additionally require
  exact addresses in `SORP_AUTH_EMAIL_ALLOWED_RECIPIENTS`; no domain wildcards.

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

1. Preserve the existing Cow service and D1 records. Obtain a complete export
   of Brainstrust's assessment or a verified, owner-authorised recovery path
   before disabling any old service. The Sites row reader truncates the
   assessment and is not a backup. Do not migrate old passwords or sessions.
2. Back up the target Neon database through a direct connection and restore it
   to an isolated branch. Verify row counts, auth IDs, permissions and report
   bytes. Neon history observed was six hours, so retain a separate backup.
3. Apply `008_sorp_auth_provider.sql`, `009_sorp_auth_application.sql`, then
   `010_sorp_report_ownership.sql` to
   a fresh isolated staging database. These migrations passed from scratch in
   local PostgreSQL; no production migration has run. Use a direct connection
   for migrations and a scoped, pooled role for application traffic.
4. Set the SORP auth database URL, a new secret of at least 32 characters,
   `SORP_AUTH_BASE_URL`, and the SORP-only Resend key in protected staging
   settings. Explicitly enable account mail for a finite allowlist of approved
   synthetic addresses. Test verification, recovery, invitations, expired and
   reused links, delivery failures, forwarding and replies. Do not expose
   credentials in logs or artifacts.
5. Confirm the founder's intended original account ID/email, verify ownership,
   set a new credential, enroll TOTP, and run `grant-sorp-founder.ts` first as a
   dry run. Apply the grant only after the exact ID, email and new MFA session
   are verified. Do not merge with the separate `public.users` identity by email.
6. Reconcile the founder identity and FLUID membership from current records.
   The private local manifests in `/workspace/sorp-migration-private/` are
   working evidence, not a full production backup. Revalidate the live source.
   Keep Brainstrust's legacy account quarantined. Marcus will coordinate its
   new login separately; attach the preserved assessment only after ownership
   is verified. Do not expose its old account or grant an adviser access by
   matching an email or organisation name.
7. Inventory existing MSI Charity Impact Report objects and any account-linked
   product records; migrate by immutable owner ID with count and digest checks.
   Test a 15 MB PDF, owner listing, founder download, denial to another account,
   backup/restore, and Neon storage capacity. The independent path stores PDFs
   in Postgres and does not provision a new bucket.

## Cutover gate and rollback

Enable the switch only when Resend works, backups restore, Brainstrust's
assessment remains recoverable, its legacy account remains quarantined,
founder and adviser permissions are reconciled, all critical integration and
browser checks pass, and the current Cow account path is still available for
rollback. Do not contact Brainstrust until Marcus explicitly approves it.

Cutover is a production environment revision followed by a deployment. Capture
the prior environment revision and deployment ID first. After enabling, verify
new login, save/reload, recovery, founder MFA, cross-tenant denial, charity
approval/revocation, team confidentiality and report upload/list/download.
Compare the imported assessment digest and linked IDs. If any identity, data
or permission mismatch appears, restore `SORP_AUTH_CUTOVER_ENABLED=false`,
redeploy the known-good revision and direct users back to the existing path.
Retain Cow D1 and its service credentials for recovery until genuine users can
access all preserved work independently.

## Separate MSI/Cow connections

Booking, payments, public readiness research, transcription, report delivery
and Ask SORP still call MSI services. `growth-click` can call Cow directly
through `COW_GROWTH_EVENT_*`. These are separate from the new account and
permission path. Do not remove their credentials as part of auth cutover;
review each product connection before claiming full Cow/MSI separation.
