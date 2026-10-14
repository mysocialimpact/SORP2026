export type PlanName = "Free" | "Plus" | "Adviser" | "Enterprise";

export type ProductKey =
  | "home"
  | "readiness"
  | "askSorp"
  | "impactReports"
  | "excellence"
  | "impactDirector";

export type AdminSection = "organisations" | "billing" | "accountants" | "feedback" | "platform";

export type Organisation = {
  id: string;
  platform_organisation_id?: string;
  name: string;
  type: "Charity" | "Adviser" | "Other";
  plan: PlanName;
  published_price: string | number;
  payable_price: string | number;
  complimentary: boolean;
  complimentary_end?: string | null;
  complimentary_reason?: string | null;
  primary_email?: string | null;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
  last_activity?: string;
  progress?: number;
  products?: Record<string, string>;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  position?: string;
  organisationId?: string | null;
  organisationName?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  lastActivity?: string;
  readiness?: ProductRecord;
  excellence?: ProductRecord;
  impactReports?: number;
};

export type ProductRecord = {
  id?: string;
  accountId?: string;
  user?: string;
  email?: string;
  organisationId?: string | null;
  organisation?: string;
  status?: string;
  percentage?: number;
  score?: number | null;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  createdAt?: string;
  feedbackReady?: boolean;
  filename?: string;
  data?: Record<string, unknown>;
};

export type AskSorp = {
  metrics?: { users?: number; conversations?: number; questions?: number; completed?: number };
  users?: Array<{
    sessionId: string;
    name?: string;
    email?: string;
    organisationName?: string;
    questions?: number;
    completed?: boolean;
    startedAt?: string;
    lastActivityAt?: string;
  }>;
  topics?: Array<{ topic: string; count: number }>;
  note?: string;
};

export type Invitation = {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
  organisation_name?: string;
  organisationName?: string;
  created_at?: string;
  createdAt?: string;
  expires_at?: string;
};

export type Dashboard = {
  founder: { email: string; name: string };
  metrics: {
    organisations: number;
    activeUsers: number;
    registeredUsers: number;
    newOrganisationsThisWeek: number;
    recentlyActiveOrganisations: number;
    organisationsAssessing: number;
    complimentaryAccounts: number;
    pendingInvitations: number;
    activeSubscriptions: number;
    planCounts: Record<PlanName, number>;
    source: string;
  };
  organisations: Organisation[];
  users: PlatformUser[];
  invitations: Invitation[];
  clientAccess: Array<Record<string, unknown>>;
  activity: Array<Record<string, unknown>>;
  audit: Array<Record<string, unknown>>;
  attention: Array<{ kind: string; id?: string; title: string; detail: string; target?: string }>;
  products: {
    readiness?: ProductRecord[];
    askSorp?: AskSorp;
    impactReports?: ProductRecord[];
    excellence?: ProductRecord[];
    impactDirector?: Array<Record<string, unknown>>;
  };
  unavailable: string[];
};

export type OrganisationDetail = {
  organisation: Organisation;
  memberships: Array<Record<string, unknown>>;
  users: PlatformUser[];
  clients: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
  activity: Array<Record<string, unknown>>;
  products: Dashboard["products"];
};

export type UserDetail = {
  user: PlatformUser;
  readiness?: ProductRecord & { progress?: Record<string, unknown> };
  products?: Array<Record<string, unknown>>;
  reports?: Array<Record<string, unknown>>;
  askSorp?: Array<Record<string, unknown>>;
  impactDirector?: Record<string, unknown> | null;
};

export type Accountant = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  location: string | null;
  overall_score: number | null;
  research_completed_at: string | null;
  approved_at: string | null;
  public_visible: boolean;
  featured: boolean;
  featured_priority: number;
  placement_label: string | null;
  public_slug: string | null;
};

export type AccountantData = {
  firms: Accountant[];
  metrics: { total: number; researched: number; humanReviewed: number; publicListings: number; featured: number };
};

export type PlanData = {
  plans: Array<{ name: PlanName; price: number | null; description: string }>;
  billingConnected: boolean;
  discountsConnected: boolean;
};

export async function founderCall<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/founder/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Unable to complete that action.");
  return payload as T;
}

export function displayDate(value: unknown, includeTime = false) {
  if (!value) return "Not available";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return includeTime ? parsed.toLocaleString("en-GB") : parsed.toLocaleDateString("en-GB");
}

export function money(value: string | number | null) {
  if (value === null) return "Bespoke";
  return Number(value || 0) ? `£${Number(value).toLocaleString("en-GB")}/month` : "£0/month";
}

export function label(value: unknown) {
  return String(value || "Not started").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
