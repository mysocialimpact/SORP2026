"use client";
import Link from "next/link";
import { categories } from "@/lib/console/model";
import type { Award } from "@/lib/console/scoring-engine";
import { api, useData, State, Form, Source } from "./ui";
type Row = {
  id: string;
  name: string;
  historical_scores: Record<string, number>;
  historical_total: number;
  provisional_scores: Record<string, number> | null;
  provisional_total: number | null;
  awards: Award[] | null;
  gaps: string[] | null;
  methodology: string | null;
};
export function CalibrationPage() {
  const { data, error, reload } = useData<Row[]>("calibration");
  if (!data || error) return <State error={error} />;
  return (
    <>
      <div className="rc-page-title">
        <p className="rc-eyebrow">LEARN FROM THE DIFFERENCES</p>
        <h1>Ten firms. Two perspectives.</h1>
        <p>
          The original v1.0 research judgement alongside reproducible
          provisional criteria. This comparison does not replace the firm’s
          current assessment.
        </p>
      </div>
      <Form
        label="Recalculate with the current rubric"
        submit={async () => {
          await api("calibration", {});
          reload();
        }}
      >
        <p>Save a separate comparison for the current methodology version.</p>
      </Form>
      <div className="rc-section">
        {data.map((f) => (
          <article className="rc-panel rc-section" key={f.id}>
            <h2>
              <Link href={"/console/firm/" + f.id + "/"}>{f.name} ↗</Link>
            </h2>
            <p>
              Original: {f.historical_total}/100 · Provisional:{" "}
              {f.provisional_total ?? "Not assessed"}/100
            </p>
            <div className="rc-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Original v1.0</th>
                    <th>Provisional v1.1</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{f.historical_scores[c.id]}</td>
                      <td>{f.provisional_scores?.[c.id] ?? "—"}</td>
                      <td>
                        {f.provisional_scores
                          ? f.provisional_scores[c.id] -
                            f.historical_scores[c.id]
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details>
              <summary>Which evidence and rules explain this?</summary>
              <p>
                The historical workbook gives a shared justification, without a
                criterion-level breakdown. The new total uses only the supported
                awards below; it is not forced to match the original.
              </p>
              {f.awards?.map((a) => (
                <div key={a.criterion_id}>
                  <h3>
                    {a.criterion_id} · +{a.points}
                  </h3>
                  <p>{a.justification}</p>
                  <p>{a.quote}</p>
                  <Source url={a.source_url} />
                </div>
              ))}
              {!f.awards?.length && (
                <p>
                  No v1.1 criterion was established. Directory classification
                  and generic qualifications do not earn automatic points.
                </p>
              )}
              <h3>Evidence to revisit</h3>
              <ul>
                {f.gaps?.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
