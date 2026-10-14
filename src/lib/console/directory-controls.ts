import "server-only";
import { transaction, query } from "./db";
import { audit, reviewFirm } from "./repository";

export type DirectoryControlRow = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  status: string;
  review_status: string;
  approved_at: string | null;
  research_completed_at: string | null;
  total: number | null;
  location: string | null;
  public_visible: boolean;
  featured: boolean;
  featured_priority: number;
  placement_label: string;
  directory_configured: boolean;
};

const directoryProjection = `
  SELECT f.id,f.name,f.website,f.domain,f.status,f.review_status,f.approved_at,
    f.research_completed_at,a.total,o.location,
    (COALESCE(f.credentials,'{}'::jsonb) ? 'directory') directory_configured,
    COALESCE((f.credentials->'directory'->>'visible')::boolean,true) public_visible,
    COALESCE((f.credentials->'directory'->>'featured')::boolean,false) featured,
    COALESCE((f.credentials->'directory'->>'featuredPriority')::integer,0) featured_priority,
    COALESCE(NULLIF(f.credentials->'directory'->>'placementLabel',''),'Editorial feature') placement_label
  FROM research_console.firms f
  LEFT JOIN LATERAL (
    SELECT total FROM research_console.assessments
    WHERE firm_id=f.id AND origin<>'Automated pilot calibration'
    ORDER BY created_at DESC,id DESC LIMIT 1
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(town,postcode,address) location
    FROM research_console.offices WHERE firm_id=f.id LIMIT 1
  ) o ON true`;

export async function listDirectoryControls(search = "") {
  const value = search.trim();
  const where = value
    ? " WHERE f.merged_into IS NULL AND (f.name ILIKE $1 OR f.website ILIKE $1 OR o.location ILIKE $1)"
    : " WHERE f.merged_into IS NULL";
  return query<DirectoryControlRow>(
    `${directoryProjection}${where} ORDER BY featured DESC,featured_priority DESC,f.name LIMIT 250`,
    value ? [`%${value}%`] : [],
  );
}

export async function publicDirectoryControls() {
  return query<DirectoryControlRow>(
    `${directoryProjection} WHERE f.merged_into IS NULL ORDER BY featured DESC,featured_priority DESC,f.name`,
  );
}

export async function setDirectoryControls(
  id: string,
  input: Record<string, unknown>,
  actor: string,
) {
  const visible = input.publicVisible !== false && input.visible !== false;
  const featured = input.featured === true;
  const featuredPriority = Math.max(0, Math.min(100, Number(input.featuredPriority) || 0));
  const placementLabel = String(input.placementLabel || "Editorial feature").trim().slice(0, 80);
  return transaction(async c => {
    const before = (
      await c.query("SELECT * FROM research_console.firms WHERE id=$1 AND merged_into IS NULL FOR UPDATE", [id])
    ).rows[0];
    if (!before) throw new Error("Firm not found.");
    const directory = { visible, featured, featuredPriority, placementLabel };
    const after = (
      await c.query(
        `UPDATE research_console.firms
         SET credentials=COALESCE(credentials,'{}'::jsonb) || jsonb_build_object('directory',$2::jsonb),updated_at=now()
         WHERE id=$1 RETURNING *`,
        [id, JSON.stringify(directory)],
      )
    ).rows[0];
    await audit(c, id, "directory", id, before.credentials?.directory || null, directory, "Public directory controls updated", actor);
    return { ok: true, directory, firm: after };
  });
}

export async function setHumanReviewed(
  id: string,
  reviewed: boolean,
  notes: string,
  actor: string,
) {
  return reviewFirm(id, {
    decision: reviewed ? "Approved" : "Needs more evidence",
    notes: notes || (reviewed ? "Human reviewed and approved for founder use." : "Human-reviewed designation removed by founder."),
  }, actor);
}
