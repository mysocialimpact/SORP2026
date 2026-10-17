/** Public product explanations stay open; these routes run the tools. */
const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
export function normaliseToolPath(path: string) {
  try { return decodeURIComponent(path).replace(/\/+$/, "") || "/"; }
  catch { return path; }
}

export function isToolPage(pathname: string) {
  const path = normaliseToolPath(pathname);
  if (under(path, "/are-you-sorp-ready"))
    return path !== "/are-you-sorp-ready" && !under(path, "/are-you-sorp-ready/presentation");
  return under(path, "/ask-sorp/workspace") || under(path, "/charity-impact-reports/review") ||
    (under(path, "/social-impact-excellence") && path !== "/social-impact-excellence") ||
    under(path, "/my-impact-director/workspace");
}

export function isToolApi(pathname: string) {
  const path = normaliseToolPath(pathname);
  return ["/api/ask-sorp", "/api/readiness", "/api/published-review",
    "/api/impact-director", "/api/sorp-report-file", "/api/sorp-report-upload",
    "/api/sorp-report-download", "/api/sorp-payments"].some(prefix => under(path, prefix));
}

// These are authentication operations, not tool actions. Unknown account
// actions require a session too, preventing a legacy guest action bypass.
export const publicAccountActions = new Set([
  "login", "signup", "logout", "request-reset", "reset-password",
]);

