/** A single explicit production switch. A missing value always keeps the live path unchanged. */
export function independentAuthCutover() {
  return process.env.SORP_AUTH_CUTOVER_ENABLED === "true";
}

export function independentAuthRoutesEnabled() {
  return independentAuthCutover() || process.env.SORP_AUTH_STAGING_ENABLED === "true";
}
