export type StatusMembership = {
  type?: string;
  role?: string;
  entitlement?: {
    plan?: string;
    status?: string;
    complimentaryEnd?: string | null;
  };
};

export type StatusAccountPayload = {
  signedIn?: boolean;
  platformAccess?: {
    founder?: boolean;
    memberships?: StatusMembership[];
  };
};

export type AccountStatus = {
  label: string;
  compactLabel: string;
  plan: "Visitor" | "Free" | "Plus" | "Adviser" | "Enterprise";
  founder: boolean;
};

const planOrder = { Free: 0, Plus: 1, Adviser: 2, Enterprise: 3 } as const;

function activePlan(membership: StatusMembership, now: number) {
  const entitlement = membership.entitlement;
  const plan = entitlement?.plan;
  if (!plan || !(plan in planOrder) || entitlement?.status === "suspended") return "Free" as const;
  if (entitlement.status === "complimentary_partner" && entitlement.complimentaryEnd &&
      Date.parse(entitlement.complimentaryEnd) <= now) return "Free" as const;
  return plan as keyof typeof planOrder;
}

/** Account and plan are derived only from the server-verified account payload.
 * Ask SORP currently enforces three questions for every plan, so no paid plan
 * is described as having a larger allowance until that enforcement changes. */
export function accountStatus(payload: StatusAccountPayload | null, now = Date.now()): AccountStatus {
  if (!payload?.signedIn) return {
    label: "VISITOR · Register to use tools",
    compactLabel: "VISITOR · Register to use tools",
    plan: "Visitor",
    founder: false,
  };
  const memberships = Array.isArray(payload.platformAccess?.memberships) ? payload.platformAccess.memberships : [];
  const plan = memberships.map(item => activePlan(item, now)).reduce<keyof typeof planOrder>(
    (best, candidate) => planOrder[candidate] > planOrder[best] ? candidate : best, "Free");
  const founder = payload.platformAccess?.founder === true;
  if (founder) return {
    label: "FOUNDER · Control Centre",
    compactLabel: "FOUNDER · Control Centre",
    plan,
    founder,
  };
  const planLabel = plan === "Adviser" ? "ADVISER PLAN" : plan.toUpperCase();
  return {
    label: `${planLabel} · 3 AI questions`,
    compactLabel: `${plan === "Adviser" ? "ADVISER" : plan.toUpperCase()} · 3 AI Qs`,
    plan,
    founder,
  };
}
