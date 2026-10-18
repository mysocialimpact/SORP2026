export const EXCELLENCE_STAGES = ["maturity", "diagnostic", "blueprint", "roadmap", "excellence"] as const;
export const EXCELLENCE_PILLARS = ["purpose", "leadership", "data", "delivery", "communications"] as const;
export type ExcellenceStage = typeof EXCELLENCE_STAGES[number];
export type ExcellencePillar = typeof EXCELLENCE_PILLARS[number];
export type ExcellenceAccess = {
  stages: Record<ExcellenceStage, boolean>;
  pillars: Record<ExcellencePillar, boolean>;
};

export const baselineOnlyAccess: ExcellenceAccess = {
  stages: { maturity: true, diagnostic: false, blueprint: false, roadmap: false, excellence: false },
  pillars: { purpose: false, leadership: false, data: false, delivery: false, communications: false },
};
export const legacyAccess: ExcellenceAccess = {
  stages: { maturity: true, diagnostic: true, blueprint: true, roadmap: true, excellence: true },
  pillars: { purpose: true, leadership: true, data: true, delivery: true, communications: true },
};

export function normaliseAccess(value: unknown): ExcellenceAccess | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!row.stages || typeof row.stages !== "object" || !row.pillars || typeof row.pillars !== "object") return null;
  const stages = row.stages as Record<string, unknown>, pillars = row.pillars as Record<string, unknown>;
  if (!EXCELLENCE_STAGES.every(key => typeof stages[key] === "boolean") || !EXCELLENCE_PILLARS.every(key => typeof pillars[key] === "boolean")) return null;
  return {
    stages: Object.fromEntries(EXCELLENCE_STAGES.map(key => [key, stages[key]])) as ExcellenceAccess["stages"],
    pillars: Object.fromEntries(EXCELLENCE_PILLARS.map(key => [key, pillars[key]])) as ExcellenceAccess["pillars"],
  };
}

export function maturityProgress(data: unknown) {
  const row = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const answers = Array.isArray(row.answers) && row.answers.length === 25 ? row.answers : [];
  const answered = answers.filter(answer => Number.isInteger(answer) && Number(answer) >= 1 && Number(answer) <= 5).length;
  const migrated = Boolean(row.migration && typeof row.migration === "object" && (row.migration as Record<string, unknown>).source === "legacy-social-impact-excellence");
  const overall = row.result && typeof row.result === "object" ? Number((row.result as Record<string, unknown>).overall) : NaN;
  const completed = (answered === 25 || migrated) && Number.isFinite(overall) && overall >= 1 && overall <= 5;
  const score = completed ? overall : null;
  return { status: completed ? "completed" : answered ? "in_progress" : "not_started", percentage: completed ? 100 : answered * 4, score, completed };
}

export function pillarProgress(data: unknown, pillar: ExcellencePillar) {
  const row = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const record = row[pillar] && typeof row[pillar] === "object" && !Array.isArray(row[pillar]) ? row[pillar] as Record<string, unknown> : {};
  const status = String(record.status || "not_started");
  return {
    status: status === "complete" || status === "evidence_submitted" ? "completed" : status === "not_started" ? "not_started" : "in_progress",
    percentage: Number.isFinite(Number(record.progress)) ? Math.max(0, Math.min(100, Number(record.progress))) : 0,
    score: Number.isFinite(Number(record.score)) && record.score !== null && record.score !== undefined ? Number(record.score) : null,
  };
}

export function pillarAvailable(access: ExcellenceAccess, completed: boolean, pillar: ExcellencePillar) {
  return completed && access.pillars[pillar];
}
