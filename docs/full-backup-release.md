# Full application backup release — 23 October 2026

Production auth cutover remains disabled. This patch expands the scheduled S3
archive from `research_console` alone to the current application schemas:
`public`, `research_console` and `msi_products` (and `sorp_auth` once it exists
in the same production database). The archive is encrypted, downloaded and
decrypted for verification, then restored into a separate recovery database.
The console's manual export remains limited to `research_console`.
The founder dashboard shows backup protection as working only for a recent,
download-verified, recovery-verified version 2 run; earlier partial archives
continue to raise an alert.

The new `SORP_BACKUP_DATABASE_URL` production secret uses the dedicated
`sorp_backup_reader` role. On 23 October it could SELECT all 55 current
application tables, write to none, and had no admin rights or role memberships.
The active Neon production branch remained `br-bold-fire-au0lio9b` with compute
`ep-proud-wave-auuym3pa`. The separate recovery branch held matching table
definitions. Local checks restored 20 fixture tables, checked 19 relationships,
and confirmed an unreadable table fails the entire archive.

The previous scheduled offsite run last verified on 19 October; subsequent runs
failed until the 18:17 UTC recovery run documented below. A code deployment
alone was not proof of a current backup. Production verification required a
version 2 run with download and isolated restore checks and all 55 tables.
The archive contains data, and restoration requires matching schema definitions
from the retained repository migrations and recovery branch.

No Brainstrust email or migration is part of this release. Keep the existing
Cow service and records. If the current site regresses, roll back the Vercel
deployment; do not use a Neon restore that finalizes or swaps branches.

## 23 October failure investigation

The founder's manual requests at 16:01, 16:02 and twice at 16:11 UTC each
created a production `backup_runs` row. All four failed at the isolated
restore stage; the console's failed status was accurate. The protected cron
also ran at 16:31 UTC and failed at that stage. A private function log exposed
PostgreSQL `42501`: `permission denied for database neondb` during the schema
step on recovery branch `br-quiet-sunset-auboqwdc`. The restricted restore role
has no database CREATE permission by design. `CREATE SCHEMA IF NOT EXISTS`
still required that permission even though `console_backup_restore` existed.
PR #109 instead checks that the preprovisioned schema exists and fails closed
if it does not. Its restricted-role restore integration test passed in CI.
The 17:00 UTC replacement schedule created no new run by 17:35. PR #111
temporarily scheduled the identical secret-protected backup handler on a new
route for 18:00 UTC. Its local production build, unauthenticated 401 check,
research-console CI and independent-auth CI passed. The temporary route must
be removed and the normal 06:00 UTC schedule restored after actual recovery
verification.

The encrypted objects from the failed restore attempts are visible in private
Neon Object Storage on preserved branch `br-dark-block-audwtcnr`, while the
live database is branch `br-bold-fire-au0lio9b`. This provides a separate
storage state from the live branch, but both remain in one Neon project and
provider account. Do not describe it as independent-provider disaster recovery.
The failed objects alone are not verified recovery points.

## Verified production recovery point — 18:17 UTC

Protected cron run `a2c2faee-d265-4f95-93d1-a9c015dbfb9c` completed at
18:17:45 UTC with `status=verified`, format version 2, AES-256-GCM encryption,
`downloadVerified=true`, `restoreVerified=true`, 30-day retention enabled and
a 64-character SHA-256 digest. The recorded archive includes all 55 current
application tables: 22 `public`, 32 `research_console`, and one `msi_products`.
The independent Neon storage listing found its exact private object key,
`daily/2026-10-23T18-17-42.700Z-a2c2faee-d265-4f95-93d1-a9c015dbfb9c.json.enc`,
at 689,634 bytes on the preserved storage branch.

The separate recovery branch now has 71 restored tables (the 55 current tables
plus 16 earlier test tables), with no current source table missing. Independent
spot checks found 13 restored `public.assessments`, 31 restored
`research_console.assessments`, and 325 restored `public.responses`, matching
the backup record. The restore routine also compared every restored row against
the downloaded archive and checked declared foreign-key relationships before
marking the run verified. Neon still reports `br-bold-fire-au0lio9b` as the
primary production branch; no branch restore or swap was used.

This proves a current encrypted off-database recovery point. The object and
database remain under one Neon project and provider, so separate-provider
disaster recovery is outstanding. The console raises a warning after a failed
or stale run and the cron returns 503 on failure; proactive notification has
not been verified. Independent authentication cutover remains disabled.
