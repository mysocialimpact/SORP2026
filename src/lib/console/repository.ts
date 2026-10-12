import "server-only";
import { query, transaction } from "./db";
import {
  categories,
  canonicalName,
  publicUrl,
  websiteDomain,
  validateBoundaries,
  type Firm,
  type Methodology,
  type Evidence,
  type Assessment,
} from "./model";
import type { PoolClient } from "pg";
export const firmSelect = `SELECT f.*,a.id assessment_id,a.total,a.scores,a.sorp,a.gaps,a.confidence,(SELECT count(*)::int FROM research_console.offices o WHERE o.firm_id=f.id) office_count,(SELECT town FROM research_console.offices o WHERE o.firm_id=f.id LIMIT 1) location FROM research_console.firms f LEFT JOIN LATERAL (SELECT * FROM research_console.assessments WHERE firm_id=f.id ORDER BY created_at DESC,id DESC LIMIT 1) a ON true`;
export async function methodology() {
  return (
    await query<Methodology>(
      "SELECT * FROM research_console.methodologies ORDER BY created_at DESC LIMIT 1",
    )
  )[0];
}
export async function dashboard() {
  const [counts, flows, recent, baseline, method] = await Promise.all([
    query(
      `SELECT count(*)::int imported,count(*) FILTER(WHERE research_completed_at IS NOT NULL)::int researched,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM research_console.assessments a WHERE a.firm_id=f.id))::int scored,count(*) FILTER(WHERE status='Ready for Marcus')::int awaiting,count(*) FILTER(WHERE approved_at IS NOT NULL)::int approved,count(*) FILTER(WHERE research_completed_at IS NULL)::int remaining,count(*) FILTER(WHERE research_completed_at>=date_trunc('week',now()))::int week,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM research_console.evidence e WHERE e.firm_id=f.id AND e.sorp='Specific SORP 2026' AND e.url IS NOT NULL AND e.source_type IN ('Firm website','ICAEW','External') AND e.state='Current' AND e.confidence IN ('High','Verified')))::int specialists FROM research_console.firms f WHERE merged_into IS NULL`,
    ),
    query(
      `SELECT status,count(*)::int count FROM research_console.firms WHERE merged_into IS NULL GROUP BY status`,
    ),
    query<Firm>(
      firmSelect +
        ` WHERE f.merged_into IS NULL AND f.research_completed_at IS NOT NULL ORDER BY f.research_completed_at DESC LIMIT 6`,
    ),
    query(
      "SELECT * FROM research_console.baselines ORDER BY created_at DESC LIMIT 1",
    ),
    methodology(),
  ]);
  return {
    counts: counts[0],
    flows,
    recent,
    baseline: baseline[0] || null,
    method,
  };
}
export async function listFirms(params: URLSearchParams) {
  const values: unknown[] = [];
  const where = ["f.merged_into IS NULL"];
  const add = (sql: string, v: unknown) => {
    values.push(v);
    where.push(sql.replaceAll("?", `$${values.length}`));
  };
  const q = params.get("q")?.trim();
  if (q)
    add(
      `(f.name ILIKE ? OR f.website ILIKE ? OR array_to_string(f.aliases,' ') ILIKE ? OR EXISTS(SELECT 1 FROM research_console.people p WHERE p.firm_id=f.id AND p.name ILIKE ?) OR EXISTS(SELECT 1 FROM research_console.offices o WHERE o.firm_id=f.id AND concat_ws(' ',o.town,o.postcode,o.address) ILIKE ?))`,
      "%" + q + "%",
    );
  for (const field of ["status", "review_status"])
    if (params.get(field)) add(`f.${field}=?`, params.get(field));
  if (params.get("sorp")) add("a.sorp=?", params.get("sorp"));
  if (params.has("tag")) add("f.icaew_tag=?", params.get("tag") === "true");
  if (params.get("country"))
    add(
      "EXISTS(SELECT 1 FROM research_console.offices o WHERE o.firm_id=f.id AND o.country=?)",
      params.get("country"),
    );
  if (params.get("gap"))
    add("array_to_string(a.gaps,' ') ILIKE ?", "%" + params.get("gap") + "%");
  if (params.get("specialist") === "true")
    where.push(
      "EXISTS(SELECT 1 FROM research_console.people p WHERE p.firm_id=f.id)",
    );
  if (params.get("dcha") === "true")
    where.push(
      "EXISTS(SELECT 1 FROM research_console.people p WHERE p.firm_id=f.id AND p.dcha=true)",
    );
  if (params.get("services") === "true")
    where.push(
      "EXISTS(SELECT 1 FROM research_console.evidence e WHERE e.firm_id=f.id AND e.category='services' AND e.state='Current')",
    );
  if (params.has("level")) {
    const m = await methodology();
    const l = Number(params.get("level"));
    if (l >= 0 && l <= 5) {
      values.push(m.boundaries[l]);
      where.push(`a.total<=$${values.length}`);
      values.push(l === 0 ? -1 : m.boundaries[l - 1]);
      where.push(`a.total>$${values.length}`);
    }
  }
  if (params.get("queue") === "true")
    where.push(
      "(f.status IN ('Not researched','Needs more evidence','Ready for Marcus') OR (f.status='Recheck later' AND (f.recheck_at IS NULL OR f.recheck_at<=current_date)))",
    );
  const page = Math.max(1, Math.min(100000, Number(params.get("page")) || 1));
  const filter = " WHERE " + where.join(" AND ");
  const total = await query<{ count: number }>(
    `SELECT count(*)::int count FROM (${firmSelect + filter}) records`,
    values,
  );
  const rows = await query<Firm>(
    firmSelect +
      filter +
      ` ORDER BY f.priority DESC,f.name,f.id LIMIT 25 OFFSET $${values.length + 1}`,
    [...values, (page - 1) * 25],
  );
  return { rows, total: total[0].count, page };
}
export async function report(id: string) {
  const firm = (await query<Firm>(firmSelect + " WHERE f.id=$1", [id]))[0];
  if (!firm) throw new Error("Firm not found.");
  const [
    evidence,
    assessments,
    runs,
    offices,
    people,
    reviews,
    history,
    methods,
    sources,
  ] = await Promise.all([
    query<Evidence>(
      "SELECT * FROM research_console.evidence WHERE firm_id=$1 ORDER BY created_at DESC",
      [id],
    ),
    query<Assessment>(
      "SELECT * FROM research_console.assessments WHERE firm_id=$1 ORDER BY created_at DESC,id DESC",
      [id],
    ),
    query(
      "SELECT * FROM research_console.runs WHERE firm_id=$1 ORDER BY started_at DESC LIMIT 30",
      [id],
    ),
    query("SELECT * FROM research_console.offices WHERE firm_id=$1", [id]),
    query("SELECT * FROM research_console.people WHERE firm_id=$1", [id]),
    query(
      "SELECT * FROM research_console.reviews WHERE firm_id=$1 ORDER BY created_at DESC",
      [id],
    ),
    query(
      "SELECT * FROM research_console.history WHERE firm_id=$1 ORDER BY created_at DESC LIMIT 100",
      [id],
    ),
    query<Methodology>(
      "SELECT * FROM research_console.methodologies ORDER BY created_at DESC",
    ),
    query(
      "SELECT s.* FROM research_console.sources s JOIN research_console.runs r ON r.id=s.run_id WHERE r.firm_id=$1 ORDER BY s.accessed_at DESC LIMIT 300",
      [id],
    ),
  ]);
  return {
    firm,
    evidence,
    assessments,
    runs,
    offices,
    people,
    reviews,
    history,
    methods,
    sources,
  };
}
export async function audit(
  c: PoolClient,
  firm: string | null,
  entity: string,
  id: string,
  previous: unknown,
  next: unknown,
  reason: string,
  actor: string,
) {
  await c.query(
    "INSERT INTO research_console.history(firm_id,entity,entity_id,previous,next,reason,actor) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      firm,
      entity,
      id,
      JSON.stringify(previous),
      JSON.stringify(next),
      reason,
      actor,
    ],
  );
}
export async function createFirm(
  input: {
    name: string;
    website?: string;
    icaew_url?: string;
    distinct?: boolean;
  },
  actor: string,
) {
  const name = String(input.name || "").trim();
  if (name.length < 2 || name.length > 200)
    throw new Error("Enter the confirmed firm name (2–200 characters).");
  const website = input.website ? publicUrl(input.website) : null;
  const domain = website ? websiteDomain(website) : null;
  const icaew = input.icaew_url ? publicUrl(input.icaew_url) : null;
  return transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('console-firm-identity'))",
    );
    const candidates = (
      await c.query(
        "SELECT id,name,website FROM research_console.firms WHERE merged_into IS NULL AND (name_key=$1 OR ($2::text IS NOT NULL AND domain=$2) OR ($3::text IS NOT NULL AND icaew_url=$3))",
        [canonicalName(name), domain, icaew],
      )
    ).rows;
    if (candidates.length && !input.distinct) return { matches: candidates };
    const f = (
      await c.query(
        "INSERT INTO research_console.firms(name,name_key,website,domain,icaew_url) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [name, canonicalName(name), website, domain, icaew],
      )
    ).rows[0];
    await audit(
      c,
      f.id,
      "firm",
      f.id,
      null,
      f,
      "Confirmed new identity",
      actor,
    );
    return { firm: f };
  });
}
export async function saveEvidence(
  id: string,
  input: Record<string, unknown>,
  actor: string,
) {
  const title = String(input.title || "").trim(),
    summary = String(input.summary || "").trim();
  if (!title || !summary || summary.length > 6000 || title.length > 500)
    throw new Error("Add an evidence title and a concise description.");
  const type = String(input.source_type || "Marcus observation");
  if (
    ![
      "Firm website",
      "ICAEW",
      "External",
      "Internal note",
      "Marcus observation",
    ].includes(type)
  )
    throw new Error("Choose a source type.");
  const url = input.url ? publicUrl(String(input.url)) : null;
  if (["Firm website", "ICAEW", "External"].includes(type) && !url)
    throw new Error("Public evidence needs its original source URL.");
  const cat = input.category ? String(input.category) : null;
  if (cat && !categories.some((c) => c.id === cat))
    throw new Error("Unknown category.");
  const sorp = String(input.sorp || "Not assessed");
  if (
    ![
      "Not assessed",
      "None found",
      "General SORP",
      "Specific SORP 2026",
    ].includes(sorp)
  )
    throw new Error("Unknown SORP classification.");
  return transaction(async (c) => {
    const row = (
      await c.query(
        "INSERT INTO research_console.evidence(firm_id,source_type,category,title,summary,url,accessed_at,sorp,confidence,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
        [
          id,
          type,
          cat,
          title,
          summary,
          url,
          input.accessed_at || null,
          sorp,
          "Verified",
          String(input.notes || ""),
        ],
      )
    ).rows[0];
    await audit(
      c,
      id,
      "evidence",
      row.id,
      null,
      row,
      "Evidence added by reviewer",
      actor,
    );
    await invalidateApproval(c, id);
    return row;
  });
}
async function invalidateApproval(c: PoolClient, id: string) {
  await c.query(
    "UPDATE research_console.firms SET approved_at=NULL,review_status=CASE WHEN review_status='Approved' THEN 'Re-review needed' ELSE review_status END,status=CASE WHEN status='Approved' THEN 'Ready for Marcus' ELSE status END,updated_at=now() WHERE id=$1",
    [id],
  );
}
export async function saveAssessment(
  id: string,
  input: Record<string, unknown>,
  actor: string,
) {
  const scores = input.scores as Record<string, number>,
    reasons = input.reasons as Record<string, string>,
    refs = input.evidence_ids as Record<string, string[]>;
  if (input.complete !== true)
    throw new Error(
      "Confirm that you examined enough evidence to assess all five categories.",
    );
  for (const cat of categories) {
    if (
      !Number.isInteger(scores?.[cat.id]) ||
      scores[cat.id] < 0 ||
      scores[cat.id] > cat.max
    )
      throw new Error(`${cat.name}: use a whole number from 0 to ${cat.max}.`);
    if (
      typeof reasons?.[cat.id] !== "string" ||
      reasons[cat.id].trim().length < 15
    )
      throw new Error(`Explain the evidence and gaps for ${cat.name}.`);
    if (
      !Array.isArray(refs?.[cat.id]) ||
      (scores[cat.id] > 0 && !refs[cat.id].length)
    )
      throw new Error(`Link supporting evidence for ${cat.name}.`);
  }
  const sorp = String(input.sorp);
  if (!["None found", "General SORP", "Specific SORP 2026"].includes(sorp))
    throw new Error("Choose a SORP classification.");
  if (!["Low", "Medium", "High"].includes(String(input.confidence)))
    throw new Error("Choose assessment confidence.");
  return transaction(async (c) => {
    await c.query(
      "SELECT id FROM research_console.firms WHERE id=$1 FOR UPDATE",
      [id],
    );
    const ev = (
      await c.query(
        "SELECT id,category,sorp FROM research_console.evidence WHERE firm_id=$1 AND state='Current' AND url IS NOT NULL",
        [id],
      )
    ).rows;
    for (const cat of categories) {
      if (
        refs[cat.id].some(
          (ref) => !ev.some((e) => e.id === ref && e.category === cat.id),
        )
      )
        throw new Error(
          "Use current public evidence from the same firm and category.",
        );
    }
    if (sorp === "Specific SORP 2026" && !ev.some((e) => e.sorp === sorp))
      throw new Error(
        "Add specific SORP 2026 evidence before awarding this classification.",
      );
    const prev = (
      await c.query(
        "SELECT id FROM research_console.assessments WHERE firm_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
        [id],
      )
    ).rows[0];
    const method = (
      await c.query(
        "SELECT id FROM research_console.methodologies ORDER BY created_at DESC LIMIT 1",
      )
    ).rows[0];
    const run = (
      await c.query(
        "SELECT id FROM research_console.runs WHERE firm_id=$1 AND status<>'running' ORDER BY started_at DESC LIMIT 1",
        [id],
      )
    ).rows[0];
    const a = (
      await c.query(
        "INSERT INTO research_console.assessments(firm_id,run_id,methodology_id,scores,total,reasons,evidence_ids,gaps,confidence,sorp,origin,previous_id,actor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *",
        [
          id,
          run?.id || null,
          method.id,
          JSON.stringify(scores),
          categories.reduce((n, cat) => n + scores[cat.id], 0),
          JSON.stringify(reasons),
          JSON.stringify(refs),
          String(input.gaps || "")
            .split("\n")
            .filter(Boolean),
          input.confidence,
          sorp,
          "Manual",
          prev?.id || null,
          actor,
        ],
      )
    ).rows[0];
    await c.query(
      "UPDATE research_console.firms SET research_completed_at=now(),status='Ready for Marcus',review_status='Awaiting review',approved_at=NULL,updated_at=now() WHERE id=$1",
      [id],
    );
    await audit(
      c,
      id,
      "assessment",
      a.id,
      prev || null,
      a,
      "Manual assessment; previous scores retained",
      actor,
    );
    return a;
  });
}
export async function reviewFirm(
  id: string,
  input: Record<string, unknown>,
  actor: string,
) {
  const decision = String(input.decision);
  const allowed = [
    "Agree with assessment",
    "Research completed — unscored",
    "Approved",
    "Not qualified",
    "Recheck later",
    "Needs more evidence",
    "Note",
  ];
  if (!allowed.includes(decision)) throw new Error("Choose a review action.");
  return transaction(async (c) => {
    const f = (
      await c.query(
        "SELECT * FROM research_console.firms WHERE id=$1 AND merged_into IS NULL FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!f) throw new Error("Firm not found.");
    const a = (
      await c.query(
        "SELECT id FROM research_console.assessments WHERE firm_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
        [id],
      )
    ).rows[0];
    if (["Approved", "Agree with assessment"].includes(decision) && !a)
      throw new Error("Complete an evidence assessment first.");
    await c.query(
      "INSERT INTO research_console.reviews(firm_id,assessment_id,decision,notes,actor) VALUES($1,$2,$3,$4,$5)",
      [id, a?.id || null, decision, String(input.notes || ""), actor],
    );
    if (decision === "Research completed — unscored") {
      if (String(input.notes || "").length < 20)
        throw new Error(
          "Explain the sources checked and remaining limitations.",
        );
      await c.query(
        "UPDATE research_console.firms SET research_completed_at=now() WHERE id=$1",
        [id],
      );
    }
    if (decision !== "Note") {
      const status = [
        "Agree with assessment",
        "Research completed — unscored",
      ].includes(decision)
        ? "Ready for Marcus"
        : decision;
      await c.query(
        "UPDATE research_console.firms SET status=$2,review_status=$3,approved_at=CASE WHEN $2='Approved' THEN now() ELSE NULL END,recheck_at=$4,updated_at=now() WHERE id=$1",
        [id, status, decision, input.recheck_at || null],
      );
    }
    await audit(
      c,
      id,
      "review",
      id,
      f,
      { decision, ...input },
      "Review decision",
      actor,
    );
    return { ok: true };
  });
}
export async function reviseMethod(
  input: Record<string, unknown>,
  actor: string,
) {
  const boundaries = validateBoundaries(input.boundaries);
  const notes = String(input.notes || "").trim();
  if (notes.length < 10) throw new Error("Explain this boundary revision.");
  return transaction(async (c) => {
    const old = (
      await c.query(
        "SELECT * FROM research_console.methodologies ORDER BY created_at DESC LIMIT 1",
      )
    ).rows[0];
    const next = (
      await c.query(
        "INSERT INTO research_console.methodologies(name,categories,boundaries,rules,notes) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [
          old.name,
          JSON.stringify(old.categories),
          JSON.stringify(boundaries),
          old.rules,
          notes,
        ],
      )
    ).rows[0];
    await audit(c, null, "methodology", next.id, old, next, notes, actor);
    return next;
  });
}
export async function correctFirm(
  id: string,
  input: Record<string, unknown>,
  actor: string,
) {
  return transaction(async (c) => {
    const old = (
      await c.query(
        "SELECT * FROM research_console.firms WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!old) throw new Error("Firm not found.");
    const name = String(input.name || old.name).trim();
    if (name.length < 2 || name.length > 200)
      throw new Error("Invalid firm name.");
    const website = input.website ? publicUrl(String(input.website)) : null;
    await c.query(
      "UPDATE research_console.firms SET name=$2,name_key=$3,website=$4,domain=$5,aliases=$6,priority=$7,updated_at=now() WHERE id=$1",
      [
        id,
        name,
        canonicalName(name),
        website,
        website ? websiteDomain(website) : null,
        String(input.aliases || "")
          .split("\n")
          .filter(Boolean),
        Math.max(0, Math.min(100, Number(input.priority) || 0)),
      ],
    );
    await invalidateApproval(c, id);
    await audit(
      c,
      id,
      "firm",
      id,
      old,
      input,
      String(input.reason || "Reviewer correction"),
      actor,
    );
    return { ok: true };
  });
}
export async function flagEvidence(
  id: string,
  evidenceId: string,
  state: string,
  actor: string,
) {
  if (!["Questionable", "Outdated", "Current"].includes(state))
    throw new Error("Choose an evidence state.");
  return transaction(async (c) => {
    const old = (
      await c.query(
        "SELECT * FROM research_console.evidence WHERE id=$1 AND firm_id=$2",
        [evidenceId, id],
      )
    ).rows[0];
    if (!old) throw new Error("Evidence not found.");
    await c.query("UPDATE research_console.evidence SET state=$2 WHERE id=$1", [
      evidenceId,
      state,
    ]);
    await invalidateApproval(c, id);
    await audit(
      c,
      id,
      "evidence",
      evidenceId,
      old,
      { ...old, state },
      "Evidence state reviewed",
      actor,
    );
    return { ok: true };
  });
}
export async function mergeFirms(
  source: string,
  target: string,
  actor: string,
) {
  if (source === target) throw new Error("Choose two different records.");
  return transaction(async (c) => {
    const rows = (
      await c.query(
        "SELECT * FROM research_console.firms WHERE id=ANY($1::uuid[]) AND merged_into IS NULL ORDER BY id FOR UPDATE",
        [[source, target]],
      )
    ).rows;
    if (rows.length !== 2)
      throw new Error("Both firms must be active records.");
    const from = rows.find((f) => f.id === source);
    const to = rows.find((f) => f.id === target);
    const active = (
      await c.query(
        "SELECT id FROM research_console.runs WHERE firm_id=ANY($1::uuid[]) AND status='running'",
        [[source, target]],
      )
    ).rows;
    if (active.length)
      throw new Error("Wait for research to finish before merging.");
    await c.query(
      "UPDATE research_console.firms SET merged_into=$2,approved_at=NULL,status='Needs more evidence' WHERE id=$1",
      [source, target],
    );
    await c.query(
      "UPDATE research_console.firms SET aliases=array(SELECT DISTINCT unnest(aliases||$2::text[])),approved_at=NULL,review_status='Re-review needed',status='Needs more evidence' WHERE id=$1",
      [target, [from.name, ...from.aliases]],
    );
    for (const table of [
      "offices",
      "people",
      "evidence",
      "runs",
      "assessments",
      "reviews",
    ])
      await c.query(
        `UPDATE research_console.${table} SET firm_id=$2 WHERE firm_id=$1`,
        [source, target],
      );
    await audit(
      c,
      target,
      "merge",
      source,
      { source: from, target: to },
      { source, target },
      "Explicit merge; original identity and full history retained",
      actor,
    );
    return { ok: true };
  });
}

export async function saveDetail(
  firmId: string,
  kind: "people" | "offices",
  input: Record<string, unknown>,
  actor: string,
) {
  return transaction(async (c) => {
    const old = input.id
      ? (
          await c.query(
            `SELECT * FROM research_console.${kind} WHERE id=$1 AND firm_id=$2`,
            [input.id, firmId],
          )
        ).rows[0]
      : null;
    if (input.id && !old) throw new Error("Record not found for this firm.");
    const source = input.source_url
      ? publicUrl(String(input.source_url))
      : null;
    if (!source)
      throw new Error("Add the public source for this person or office.");
    let row;
    if (kind === "people") {
      const name = String(input.name || "").trim();
      if (!name || name.length > 200)
        throw new Error("Enter the person’s name.");
      const values = [
        firmId,
        name,
        String(input.role || ""),
        String(input.office || ""),
        String(input.qualifications || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        input.dcha === "true" ? true : input.dcha === "false" ? false : null,
        String(input.responsibilities || ""),
        source,
        String(input.notes || ""),
      ];
      row = (
        await c.query(
          "INSERT INTO research_console.people(firm_id,name,role,office,qualifications,dcha,responsibilities,profile_url,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
          values,
        )
      ).rows[0];
    } else {
      if (!String(input.address || "").trim())
        throw new Error("Add an office address.");
      row = (
        await c.query(
          "INSERT INTO research_console.offices(firm_id,address,town,region,country,postcode,telephone,source_url,verification) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
          [
            firmId,
            String(input.address),
            String(input.town || ""),
            String(input.region || ""),
            String(input.country || ""),
            String(input.postcode || ""),
            String(input.telephone || ""),
            source,
            "Confirmed by reviewer",
          ],
        )
      ).rows[0];
    }
    await audit(
      c,
      firmId,
      kind,
      row.id,
      old,
      row,
      "Source-linked detail recorded",
      actor,
    );
    await invalidateApproval(c, firmId);
    return row;
  });
}
