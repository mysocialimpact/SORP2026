import "server-only";
import { query, transaction } from "./db";
import { categories, type Methodology } from "./model";
import { provisionalRubric } from "./rubric";
import { scoreEvidence, type ScoringEvidence } from "./scoring-engine";
export async function ensureProvisionalMethod() {
  return transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('console-methodology'))",
    );
    const existing = (
      await c.query(
        "SELECT * FROM research_console.methodologies WHERE jsonb_array_length(rubric)>0 ORDER BY created_at DESC LIMIT 1",
      )
    ).rows[0];
    if (existing) return existing as Methodology;
    return (
      await c.query(
        `INSERT INTO research_console.methodologies(name,categories,boundaries,rules,notes,rubric) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          "Charity Accountant Evidence Methodology v1.1 — Provisional Automated Rubric",
          JSON.stringify(categories),
          "[0,20,40,60,80,100]",
          "Twenty explicit criteria supplied by Marcus. Each enabled criterion is awarded once, only with a retained source passage or imported research note. Category maxima apply. Directory membership and generic qualifications earn no points. Repeated training/publication facts cannot earn duplicate awards. Automated findings remain provisional; a human must approve publication.",
          "Conservative deterministic evaluator v1.1.1. Some valid evidence may need human interpretation. Imported paraphrases are identified separately from retrieved quotations. No qualifying evidence means zero only after sufficient research; failed or insufficient research stays unscored.",
          JSON.stringify(provisionalRubric),
        ],
      )
    ).rows[0] as Methodology;
  });
}
export async function automaticAssessment(
  firmId: string,
  actor: string,
  options: {
    runId?: string;
    pilotBatchId?: string;
    calibration?: boolean;
  } = {},
) {
  await ensureProvisionalMethod();
  return transaction(async (c) => {
    const firm = (
      await c.query(
        "SELECT * FROM research_console.firms WHERE id=$1 AND merged_into IS NULL FOR UPDATE",
        [firmId],
      )
    ).rows[0];
    if (!firm) throw new Error("Firm not found.");
    if (
      (
        await c.query(
          "SELECT 1 FROM research_console.runs WHERE firm_id=$1 AND status IN ('running','assessing') AND id IS DISTINCT FROM $2::uuid",
          [firmId, options.runId ?? null],
        )
      ).rowCount
    )
      throw new Error("Wait until research finishes before scoring.");
    const method = (
      await c.query(
        "SELECT * FROM research_console.methodologies WHERE jsonb_array_length(rubric)>0 ORDER BY created_at DESC LIMIT 1",
      )
    ).rows[0];
    if (options.calibration) {
      const existing = (
        await c.query(
          "SELECT * FROM research_console.assessments WHERE firm_id=$1 AND methodology_id=$2 AND origin='Automated pilot calibration' LIMIT 1",
          [firmId, method.id],
        )
      ).rows[0];
      if (existing) return existing;
    }
    const run = options.runId
      ? (
          await c.query(
            "SELECT * FROM research_console.runs WHERE id=$1 AND firm_id=$2",
            [options.runId, firmId],
          )
        ).rows[0]
      : (
          await c.query(
            "SELECT * FROM research_console.runs WHERE firm_id=$1 AND status='collected' ORDER BY started_at DESC LIMIT 1",
            [firmId],
          )
        ).rows[0];
    const historical = (
      await c.query(
        "SELECT * FROM research_console.assessments WHERE firm_id=$1 AND origin='Historical pilot v1.0' ORDER BY created_at DESC LIMIT 1",
        [firmId],
      )
    ).rows[0];
    const pilot =
      options.pilotBatchId ?? (!run ? historical?.import_batch_id : undefined);
    const evidence = (
      await c.query(
        "SELECT * FROM research_console.evidence WHERE firm_id=$1 AND state='Current' AND (($2::uuid IS NOT NULL AND run_id=$2) OR ($3::uuid IS NOT NULL AND import_batch_id=$3))",
        [firmId, options.calibration ? null : (run?.id ?? null), pilot ?? null],
      )
    ).rows as ScoringEvidence[];
    const sources = run
      ? (
          await c.query(
            "SELECT url FROM research_console.sources WHERE run_id=$1 AND status IN ('Examined','Search evidence')",
            [run.id],
          )
        ).rows
      : [];
    const relevant = sources.filter((s) =>
      /service|charit|sector|sorp|team|people|about|insight|publication/i.test(
        new URL(s.url).pathname,
      ),
    );
    const sufficient =
      Boolean(pilot && historical) ||
      (new Set(sources.map((s) => s.url)).size >= 3 &&
        (evidence.some((e) => e.provenance?.kind === "openai-search")
          ? evidence.some((e) => e.provenance?.coverageComplete === true)
          : new Set(relevant.map((s) => s.url)).size >= 2));
    const result = scoreEvidence(evidence, {
      sufficient,
      rubric: method.rubric,
      firmName: firm.name,
    });
    if (result.total === null) return result;
    for (const award of result.awards)
      await c.query(
        "UPDATE research_console.evidence SET supported_categories=ARRAY(SELECT DISTINCT unnest(supported_categories||ARRAY[$2::text])),sorp=CASE WHEN $3::boolean THEN 'Specific SORP 2026' ELSE sorp END WHERE id=$1",
        [award.evidence_id, award.category, award.criterion_id === "C1"],
      );
    const reasons = Object.fromEntries(
      categories.map((cat) => [
        cat.id,
        result.awards
          .filter((a) => a.category === cat.id)
          .map((a) => `${a.criterion_id} +${a.points}: ${a.justification}`)
          .join("\n") ||
          "No criterion was established in the examined evidence. This is not a judgement of professional competence.",
      ]),
    );
    const refs = Object.fromEntries(
      categories.map((cat) => [
        cat.id,
        [
          ...new Set(
            result.awards
              .filter((a) => a.category === cat.id)
              .map((a) => a.evidence_id),
          ),
        ],
      ]),
    );
    const sorp = result.awards.some((a) => a.criterion_id === "C1")
      ? "Specific SORP 2026"
      : result.awards.some((a) => a.category === "sorp")
        ? "General SORP"
        : "None found";
    const prev = (
      await c.query(
        "SELECT id FROM research_console.assessments WHERE firm_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
        [firmId],
      )
    ).rows[0];
    const assessment = (
      await c.query(
        `INSERT INTO research_console.assessments(firm_id,run_id,methodology_id,scores,total,reasons,evidence_ids,gaps,confidence,sorp,origin,previous_id,actor,awards,assessment_state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          firmId,
          options.calibration ? null : (run?.id ?? null),
          method.id,
          JSON.stringify(result.scores),
          result.total,
          JSON.stringify(reasons),
          JSON.stringify(refs),
          result.gaps,
          "Medium — provisional",
          sorp,
          options.calibration
            ? "Automated pilot calibration"
            : "Automated provisional",
          prev?.id ?? null,
          actor,
          JSON.stringify(result.awards),
          result.state,
        ],
      )
    ).rows[0];
    if (!options.calibration)
      await c.query(
        "UPDATE research_console.firms SET status='Ready for Marcus',review_status='Provisional — awaiting Marcus’s review',approved_at=NULL,research_completed_at=coalesce($2::timestamptz,research_completed_at,now()),updated_at=now() WHERE id=$1",
        [firmId, run?.completed_at ?? null],
      );
    await c.query(
      "INSERT INTO research_console.history(firm_id,entity,entity_id,next,reason,actor) VALUES($1,'assessment',$2,$3,$4,$5)",
      [
        firmId,
        assessment.id,
        JSON.stringify({
          total: result.total,
          methodology: method.id,
          awards: result.awards,
        }),
        options.calibration
          ? "Compare original pilot against provisional v1.1; original assessment retained"
          : "Provisional automatic assessment; human review required",
        actor,
      ],
    );
    return assessment;
  });
}
export async function pilotCalibration() {
  const firms = await query<{ firm_id: string; import_batch_id: string }>(
    "SELECT firm_id,import_batch_id FROM research_console.assessments WHERE origin='Historical pilot v1.0'",
  );
  for (const f of firms) {
    const existing = await query(
      "SELECT 1 FROM research_console.assessments WHERE firm_id=$1 AND origin='Automated pilot calibration' AND methodology_id=(SELECT id FROM research_console.methodologies WHERE jsonb_array_length(rubric)>0 ORDER BY created_at DESC LIMIT 1)",
      [f.firm_id],
    );
    if (!existing.length)
      await automaticAssessment(f.firm_id, "Pilot calibration", {
        pilotBatchId: f.import_batch_id,
        calibration: true,
      });
  }
  return calibrationReport();
}
export async function calibrationReport() {
  return query(
    `SELECT f.id,f.name,h.scores historical_scores,h.total historical_total,h.id historical_id,a.scores provisional_scores,a.total provisional_total,a.id provisional_id,a.awards,a.gaps,m.name methodology FROM research_console.firms f JOIN LATERAL(SELECT * FROM research_console.assessments WHERE firm_id=f.id AND origin='Historical pilot v1.0' ORDER BY created_at DESC LIMIT 1) h ON true LEFT JOIN LATERAL(SELECT * FROM research_console.assessments WHERE firm_id=f.id AND origin='Automated pilot calibration' ORDER BY created_at DESC LIMIT 1) a ON true LEFT JOIN research_console.methodologies m ON m.id=a.methodology_id ORDER BY f.name`,
  );
}
