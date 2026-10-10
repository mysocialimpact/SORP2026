import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { BOOKING_TIME_ZONE, bookingService, type BookingService } from "./booking-config";

type BookingDetails = { name: string; email: string; organisation: string; evidence?: string };
type CalendarEvent = { id?: string; htmlLink?: string; status?: string; extendedProperties?: { private?: Record<string, string> } };

const calendarId = () => process.env.GOOGLE_CALENDAR_ID || "primary";
const clean = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://sorp2026.org/api/booking/google/callback";
  if (!clientId || !clientSecret) throw new Error("Google Calendar connection is not configured.");
  return { clientId, clientSecret, refreshToken, redirectUri };
}

async function accessToken(): Promise<string> {
  const config = googleConfig();
  if (!config.refreshToken) throw new Error("Google Calendar authorisation is not complete.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const result = await response.json() as { access_token?: string };
  if (!response.ok || !result.access_token) throw new Error("Google Calendar authorisation needs to be renewed.");
  return result.access_token;
}

async function google(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  return fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
}

function londonParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: BOOKING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  return Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function londonDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let index = 0; index < 3; index += 1) {
    const parts = londonParts(new Date(guess));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    guess -= represented - desired;
  }
  return new Date(guess);
}

function dateKey(date: Date): string {
  const parts = londonParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function weekday(date: Date): number {
  const key = londonParts(date).weekday;
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(key);
}

export function configuredCandidates(service: BookingService, days = 42) {
  const now = new Date();
  const slots: { start: string; end: string }[] = [];
  for (let offset = 1; offset <= days; offset += 1) {
    const cursor = new Date(now.getTime() + offset * 86_400_000);
    const times = service.weeklySlots[weekday(cursor)] || [];
    for (const time of times) {
      const start = londonDateTime(dateKey(cursor), time);
      if (start.getTime() < now.getTime() + 2 * 60 * 60 * 1000) continue;
      slots.push({ start: start.toISOString(), end: new Date(start.getTime() + service.duration * 60_000).toISOString() });
    }
  }
  return slots;
}

export async function slotIsFree(start: string, end: string): Promise<boolean> {
  const response = await google("freeBusy", { method: "POST", body: JSON.stringify({ timeMin: start, timeMax: end, timeZone: BOOKING_TIME_ZONE, items: [{ id: calendarId() }] }) });
  const result = await response.json() as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  if (!response.ok) throw new Error("Google Calendar availability could not be checked.");
  return !(result.calendars?.[calendarId()]?.busy?.length);
}

export async function availableSlots(service: BookingService) {
  const candidates = configuredCandidates(service);
  if (!candidates.length) return [];
  const response = await google("freeBusy", { method: "POST", body: JSON.stringify({ timeMin: candidates[0].start, timeMax: candidates.at(-1)!.end, timeZone: BOOKING_TIME_ZONE, items: [{ id: calendarId() }] }) });
  const result = await response.json() as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  if (!response.ok) throw new Error("Google Calendar availability could not be checked.");
  const busy = result.calendars?.[calendarId()]?.busy || [];
  return candidates.filter((slot) => !busy.some((period) => Date.parse(period.start) < Date.parse(slot.end) && Date.parse(period.end) > Date.parse(slot.start)));
}

export function validatedSlot(serviceId: unknown, start: unknown) {
  const service = bookingService(serviceId);
  const startText = clean(start, 40);
  if (!service || !startText) return null;
  return configuredCandidates(service).find((slot) => slot.start === startText) ? { service, start: startText, end: new Date(Date.parse(startText) + service.duration * 60_000).toISOString() } : null;
}

function eventId(serviceId: string, start: string) {
  return `msi${createHash("sha256").update(`${serviceId}:${start}`).digest("hex").slice(0, 48)}`;
}

export async function createBookingEvent(service: BookingService, start: string, end: string, details: BookingDetails, idempotencyKey: string, notify: boolean) {
  const id = eventId(service.id, start);
  const safeDetails = { name: clean(details.name, 120), email: clean(details.email, 254).toLowerCase(), organisation: clean(details.organisation, 160), evidence: clean(details.evidence, 800) };
  const description = [`Booked through My Social Impact.`, `Organisation: ${safeDetails.organisation}`, safeDetails.evidence ? `Wider-evidence reference: ${safeDetails.evidence}` : ""].filter(Boolean).join("\n");
  const body = {
    id,
    summary: `${service.name} — ${safeDetails.organisation}`,
    description,
    start: { dateTime: start, timeZone: BOOKING_TIME_ZONE },
    end: { dateTime: end, timeZone: BOOKING_TIME_ZONE },
    attendees: notify ? [{ email: safeDetails.email, displayName: safeDetails.name }] : [],
    extendedProperties: { private: { msi_booking_key: idempotencyKey, msi_service_id: service.id } },
    conferenceData: { createRequest: { requestId: idempotencyKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64) || id } },
  };
  const response = await google(`calendars/${encodeURIComponent(calendarId())}/events?sendUpdates=${notify ? "all" : "none"}&conferenceDataVersion=1`, { method: "POST", body: JSON.stringify(body) });
  if (response.status === 409) {
    const existingResponse = await google(`calendars/${encodeURIComponent(calendarId())}/events/${id}`);
    const existing = await existingResponse.json() as CalendarEvent;
    if (existing.extendedProperties?.private?.msi_booking_key === idempotencyKey) return existing;
    throw new Error("That time has just been taken. Please choose another available slot.");
  }
  const event = await response.json() as CalendarEvent;
  if (!response.ok || !event.id) throw new Error("The Calendar event could not be created.");
  return event;
}

export async function confirmBookingEvent(service: BookingService, start: string, details: BookingDetails) {
  const id = eventId(service.id, start);
  const response = await google(`calendars/${encodeURIComponent(calendarId())}/events/${id}?sendUpdates=all`, { method: "PATCH", body: JSON.stringify({ attendees: [{ email: clean(details.email, 254).toLowerCase(), displayName: clean(details.name, 120) }] }) });
  const event = await response.json() as CalendarEvent;
  if (!response.ok || !event.id) throw new Error("The Calendar invitation could not be sent.");
  return event;
}

export async function deleteBookingEvent(service: BookingService, start: string) {
  const response = await google(`calendars/${encodeURIComponent(calendarId())}/events/${eventId(service.id, start)}?sendUpdates=none`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error("The temporary Calendar event could not be removed.");
}

export function oauthUrl() {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const issued = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", clientSecret).update(issued).digest("hex");
  const state = `${issued}.${signature}`;
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "true", state, scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.events.freebusy" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function readinessAccountOauthUrl() {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const issued = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", clientSecret).update(`readiness-account:${issued}`).digest("hex");
  const state = `readiness-account.${issued}.${signature}`;
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", access_type: "online", prompt: "select_account", state, scope: "openid email profile" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function validReadinessAccountOauthState(state: string) {
  const [flow, issued, supplied] = state.split(".");
  const secret = process.env.GOOGLE_CLIENT_SECRET || "";
  const age = Date.now() / 1000 - Number(issued);
  if (flow !== "readiness-account" || !issued || !supplied || !secret || !Number.isFinite(age) || age < 0 || age > 900) return false;
  const expected = createHmac("sha256", secret).update(`readiness-account:${issued}`).digest("hex");
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function exchangeReadinessAccountOauthCode(code: string) {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
  const result = await response.json() as { access_token?: string };
  if (!response.ok || !result.access_token) throw new Error("Google sign-in did not return a verified identity token.");
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${result.access_token}` }, cache: "no-store" });
  const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!profileResponse.ok || !profile.sub || !profile.email || !profile.email_verified) throw new Error("Google did not confirm a verified email address.");
  return { subject: profile.sub, email: profile.email.trim().toLowerCase(), name: profile.name?.trim() || profile.email.split("@")[0] };
}

export function readinessAccountPassword(subject: string) {
  const secret = process.env.GOOGLE_CLIENT_SECRET || "";
  if (!secret || !subject) throw new Error("Google sign-in is not configured.");
  return createHmac("sha256", secret).update(`msi-readiness-account:${subject}`).digest("base64url");
}

export function validOauthState(state: string) {
  const [issued, supplied] = state.split(".");
  const secret = process.env.GOOGLE_CLIENT_SECRET || "";
  const age = Date.now() / 1000 - Number(issued);
  if (!issued || !supplied || !secret || !Number.isFinite(age) || age < 0 || age > 900) return false;
  const expected = createHmac("sha256", secret).update(issued).digest("hex");
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function exchangeOauthCode(code: string) {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
  const result = await response.json() as { refresh_token?: string };
  if (!response.ok || !result.refresh_token) throw new Error("Google did not return the production refresh token.");
  return result.refresh_token;
}
