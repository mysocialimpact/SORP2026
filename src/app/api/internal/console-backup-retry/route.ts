// One-time protected recovery schedule. Reuse the production cron's exact
// CRON_SECRET check and backup handler; no separate authentication path.
export { GET } from "../console-backup/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
