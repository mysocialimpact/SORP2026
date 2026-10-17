export type Audience = "charity" | "adviser";

const key = "sorp2026.homepage-audience";
let inMemory: Audience | null = null;

export function readAudience(): Audience | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value === "charity" || value === "adviser" ? value : null;
  } catch {
    return inMemory;
  }
}

export function subscribeAudience(listener: () => void) {
  window.addEventListener(key, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(key, listener);
    window.removeEventListener("storage", listener);
  };
}

export function writeAudience(value: Audience | null) {
  inMemory = value;
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch { /* The selection still works for this visit. */ }
  window.dispatchEvent(new Event(key));
}

export const serverAudience = () => null;
