import { safeDestination } from "./onboarding/state.ts";

/** Use the complete local workflow address, including query and anchor. */
export function currentAccountDestination(fallback?: string) {
  if (typeof window === "undefined") return safeDestination(fallback);
  const current = window.location;
  if (!fallback) return safeDestination(`${current.pathname}${current.search}${current.hash}`);
  const target = new URL(safeDestination(fallback), current.origin);
  if (current.pathname.replace(/\/$/, "") !== target.pathname.replace(/\/$/, "")) return safeDestination(fallback);
  return safeDestination(`${current.pathname}${current.search || target.search}${current.hash || target.hash}`);
}
export const registrationHref = (destination: string) => `/get-started/?next=${encodeURIComponent(safeDestination(destination))}`;
export const signInHref = (destination: string) => `/login/?return=${encodeURIComponent(safeDestination(destination, true))}`;

/** Preserve the legacy invitation-aware signup contract through the gateway. */
export function invitationTokenFromDestination(destination: string) {
  return new URL(safeDestination(destination), "https://sorp2026.org").pathname.match(/^\/invitation\/([a-f0-9]{64})\/?$/)?.[1];
}
