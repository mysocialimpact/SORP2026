# Full application backup release — 23 October 2026

Production auth cutover remains disabled. This patch expands the scheduled S3
archive from `research_console` alone to the current application schemas:
`public`, `research_console` and `msi_products` (and `sorp_auth` once it exists
in the same production database). The archive is encrypted, downloaded and
decrypted for verification, then restored into a separate recovery database.
The console's manual export remains limited to `research_console`.

The new `SORP_BACKUP_DATABASE_URL` production secret uses the dedicated
`sorp_backup_reader` role. On 23 October it could SELECT all 55 current
application tables, write to none, and had no admin rights or role memberships.
The active Neon production branch remained `br-bold-fire-au0lio9b` with compute
`ep-proud-wave-auuym3pa`. The separate recovery branch held matching table
definitions. Local checks restored 20 fixture tables, checked 19 relationships,
and confirmed an unreadable table fails the entire archive.

The previous scheduled offsite run last verified on 19 October; subsequent runs
failed. **This patch is not proof of a current offsite backup.** After deployment,
confirm the first new-format scheduled run records `status=verified`,
`formatVersion=2`, `downloadVerified=true`, `restoreVerified=true`, an S3 object
key and coverage of all 55 tables. Investigate any failure stage before cutover.
The archive contains data, and restoration requires matching schema definitions
from the retained repository migrations and recovery branch.

No Brainstrust email or migration is part of this release. Keep the existing
Cow service and records. If the current site regresses, roll back the Vercel
deployment; do not use a Neon restore that finalizes or swaps branches.
