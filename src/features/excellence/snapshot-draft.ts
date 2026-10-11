export type SnapshotRoute = "assessment";
export type SnapshotDraft = {
  requestId: string;
  route: SnapshotRoute;
  answers: (number | null)[];
  index: number;
  startedAt: string;
  updatedAt?: string;
  completedAt?: string;
};

export const pendingSnapshotKey = "msi_snapshot_pending";

export function snapshotStorageKey(userId?: string) {
  return userId ? `msi_maturity_assessment_progress_${userId}` : "msi_maturity_assessment_guest";
}

function legacySnapshotStorageKeys(userId?: string) {
  return userId
    ? [`msi_snapshot_progress_${userId}`, `msi_guided_progress_${userId}`]
    : ["msi_snapshot_guest_quick", "msi_snapshot_guest_guided"];
}
export function validSnapshotAnswers(value: unknown): value is (number | null)[] {
  return Array.isArray(value) && value.length === 25 && value.every(v => v === null || (Number.isInteger(v) && v >= 1 && v <= 5));
}
export function readSnapshotDraft(key: string): SnapshotDraft | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (!parsed || !validSnapshotAnswers(parsed.answers)) return null;
    return {
      requestId: typeof parsed.requestId === "string" ? parsed.requestId : crypto.randomUUID(),
      route: "assessment",
      answers: parsed.answers,
      index: Number.isInteger(parsed.index) ? Math.max(0, Math.min(24, parsed.index)) : 0,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : new Date().toISOString(),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
      completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : undefined
    };
  } catch { return null; }
}

export function answeredCount(draft: SnapshotDraft) {
  return draft.answers.filter(answer => answer !== null).length;
}

function draftTime(draft: SnapshotDraft) {
  const value = draft.updatedAt || draft.completedAt || draft.startedAt;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export function mergeSnapshotDrafts(drafts: SnapshotDraft[]) {
  if (!drafts.length) return null;
  const ranked = [...drafts].sort((a, b) => answeredCount(b) - answeredCount(a) || draftTime(b) - draftTime(a));
  const strongest = ranked[0];
  const answers = [...strongest.answers];
  for (const draft of ranked.slice(1)) {
    draft.answers.forEach((answer, index) => {
      if (answers[index] === null && answer !== null) answers[index] = answer;
    });
  }
  const firstUnanswered = answers.findIndex(answer => answer === null);
  const latestTime = ranked.reduce((latest, draft) => Math.max(latest, draftTime(draft)), 0);
  return {
    ...strongest,
    route: "assessment" as const,
    answers,
    index: firstUnanswered === -1 ? 24 : firstUnanswered,
    updatedAt: latestTime ? new Date(latestTime).toISOString() : strongest.updatedAt
  };
}

/**
 * Load the single assessment state. Older Quick Snapshot and Guided Demo keys
 * are migration inputs only and are merged into the canonical key on first read.
 */
export function resumeSnapshotDraft(userId?: string, resumeGuest = false): SnapshotDraft | null {
  const canonicalKey = snapshotStorageKey(userId);
  const keys = [canonicalKey, ...legacySnapshotStorageKeys(userId)];
  if (userId && resumeGuest) keys.push(snapshotStorageKey(), ...legacySnapshotStorageKeys());
  const merged = mergeSnapshotDrafts(keys.map(readSnapshotDraft).filter((draft): draft is SnapshotDraft => Boolean(draft)));
  if (merged) localStorage.setItem(canonicalKey, JSON.stringify(merged));
  return merged;
}

export function snapshotProgress(userId?: string, resumeGuest = false) {
  const draft = resumeSnapshotDraft(userId, resumeGuest);
  return draft ? answeredCount(draft) : 0;
}

export function legacySnapshotKeys(userId?: string) {
  return legacySnapshotStorageKeys(userId);
}
