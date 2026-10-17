/** Compiled once from the deployment ledger; shared by the bar and footer. */
export const buildInformation = {
  number: process.env.NEXT_PUBLIC_SITE_BUILD_NUMBER || "",
  deploymentId: process.env.NEXT_PUBLIC_SITE_DEPLOYMENT_ID || "",
  version: process.env.NEXT_PUBLIC_SITE_RELEASE_VERSION || "1",
  deployedAt: process.env.NEXT_PUBLIC_SITE_BUILT_AT || "",
  environment: process.env.NEXT_PUBLIC_SITE_BUILD_ENVIRONMENT || "development",
};
export function formatBuildTimestamp(timestamp: string) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return "";
  const date = new Date(timestamp);
  return `${new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/London" }).format(date)}, ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/London" }).format(date)}`;
}
