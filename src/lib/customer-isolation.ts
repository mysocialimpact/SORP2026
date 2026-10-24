const ISOLATED_ACCOUNT_IDS = new Set([
  "cff1f534-05f0-4c23-bb0c-729150c52429",
]);

const ISOLATED_ORGANISATION_IDS = new Set([
  "brainstrust",
  "74d0b3b4-755f-43e7-9bc7-79819ae36492",
  "71bdb08b-c545-4cfe-8b8d-1aaf443539d5",
]);

const ISOLATED_DOMAIN = "brainstrust.org.uk";

function normalise(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isIsolatedCustomerEmail(value: unknown) {
  const email = normalise(value);
  const domain = email.includes("@") ? email.split("@").at(-1) || "" : "";
  return domain === ISOLATED_DOMAIN || domain.endsWith(`.${ISOLATED_DOMAIN}`);
}

export function isIsolatedCustomerAccount(value: unknown) {
  return ISOLATED_ACCOUNT_IDS.has(normalise(value));
}

export function isIsolatedCustomerOrganisation(value: unknown) {
  const candidate = normalise(value);
  return ISOLATED_ORGANISATION_IDS.has(candidate) || candidate === "brainstrust";
}

export function containsIsolatedCustomerReference(value: unknown): boolean {
  if (typeof value === "string") {
    return isIsolatedCustomerEmail(value) || isIsolatedCustomerAccount(value) ||
      isIsolatedCustomerOrganisation(value);
  }
  if (Array.isArray(value)) return value.some(containsIsolatedCustomerReference);
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(containsIsolatedCustomerReference);
}

export function isIsolatedCustomerIdentity(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const account = record.account && typeof record.account === "object"
    ? record.account as Record<string, unknown> : record;
  return isIsolatedCustomerAccount(account.id) || isIsolatedCustomerEmail(account.email);
}

/** Remove isolated legacy-customer rows from founder and adviser collection payloads. */
export function excludeIsolatedCustomerRows(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter(item => !containsIsolatedCustomerReference(item))
      .map(excludeIsolatedCustomerRows);
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => [key, Array.isArray(item) ? excludeIsolatedCustomerRows(item) : item]));
}

export function isolatedCustomerResponse() {
  return Response.json(
    { error: "This legacy customer is not active in the standalone SORP 2026 environment." },
    {
      status: 403,
      headers: {
        "cache-control": "private, no-store",
        "set-cookie": "msi_sorp_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
      },
    },
  );
}
