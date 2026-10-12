"use client";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { evidenceLevel, levelNames, type Firm } from "@/lib/console/model";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const [route, search] = path.split("?");
  const response = await fetch(
    "/api/console/" + route + "/" + (search ? "?" + search : ""),
    {
      cache: "no-store",
      ...(body !== undefined
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "This request could not finish.");
  return data;
}
export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  return { data, error, reload };
}
export function State({ error }: { error?: string }) {
  return (
    <div className="rc-panel rc-state" role={error ? "alert" : "status"}>
      {error ? (
        <>
          <h2>We couldn’t complete that.</h2>
          <p>{error}</p>
          <p>Your saved research is retained.</p>
        </>
      ) : (
        <>
          <span className="rc-spinner" />
          <p>Opening your research…</p>
        </>
      )}
    </div>
  );
}
export function Form({
  children,
  submit,
  label = "Save",
  onDone,
}: {
  children: ReactNode;
  submit: (data: FormData) => Promise<unknown>;
  label?: string;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setDone(false);
    setError("");
    try {
      await submit(new FormData(e.currentTarget));
      setDone(true);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className="rc-form">
      {children}
      {error && (
        <p className="rc-error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="rc-success" role="status">
          Saved to your research database.
        </p>
      )}
      <button className="rc-button" disabled={busy}>
        {busy ? "Saving…" : label}
        <span>↗</span>
      </button>
    </form>
  );
}
export const fields = (data: FormData) => Object.fromEntries(data.entries());
export function Badge({ children }: { children: ReactNode }) {
  return <span className="rc-tag">{children}</span>;
}
export function Source({
  url,
  label = "Open original source ↗",
}: {
  url: string | null | undefined;
  label?: string;
}) {
  if (!url) return <small>Source not recorded</small>;
  let valid = false;
  try {
    valid = ["http:", "https:"].includes(new URL(url).protocol);
  } catch {}
  if (!valid) return <small>Invalid source URL</small>;
  return (
    <a
      className="rc-source"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}
export function DateText({ value }: { value: unknown }) {
  return (
    <>
      {value
        ? new Date(String(value)).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Not recorded"}
    </>
  );
}
export function Score({
  firm,
  boundaries,
}: {
  firm: Firm;
  boundaries?: number[];
}) {
  const level = evidenceLevel(firm.total, boundaries);
  return (
    <div className="rc-score-inline">
      <strong>{firm.total ?? "—"}</strong>
      <span>
        {level === null
          ? "Not scored"
          : `${levelNames[level]} · level ${level}`}
      </span>
    </div>
  );
}
export function FirmTable({
  firms,
  boundaries,
  selected,
  onSelect,
}: {
  firms: Firm[];
  boundaries?: number[];
  selected?: string[];
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="rc-table-scroll">
      <table className="rc-table">
        <thead>
          <tr>
            {onSelect && <th>Compare</th>}
            <th>Accountant</th>
            <th>Evidence score</th>
            <th>Research & review</th>
            <th>SORP</th>
            <th>ICAEW tag</th>
          </tr>
        </thead>
        <tbody>
          {firms.map((f) => (
            <tr key={f.id}>
              {onSelect && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Compare ${f.name}`}
                    checked={selected?.includes(f.id) || false}
                    onChange={() => onSelect(f.id)}
                    disabled={
                      !selected?.includes(f.id) && (selected?.length || 0) >= 5
                    }
                  />
                </td>
              )}
              <td>
                <Link
                  className="rc-firm-link"
                  href={"/console/firm/" + f.id + "/"}
                >
                  {f.name}
                  <span>↗</span>
                </Link>
                <small>
                  {f.location || "Location unverified"}
                  {f.office_count > 1 ? ` · ${f.office_count} offices` : ""}
                </small>
                <Source url={f.website} label="Website ↗" />
              </td>
              <td>
                <Score firm={f} boundaries={boundaries} />
              </td>
              <td>
                <Badge>{f.status}</Badge>
                <small>
                  {f.review_status} ·{" "}
                  <DateText value={f.research_completed_at} />
                </small>
              </td>
              <td>{f.sorp || "Not assessed"}</td>
              <td>
                {f.icaew_tag === null
                  ? "Unverified"
                  : f.icaew_tag
                    ? "Recorded"
                    : "Not recorded"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!firms.length && (
        <div className="rc-empty">
          <h3>A fresh page in the research.</h3>
          <p>
            No firms match these filters. Add a firm or clear the filters to get
            started.
          </p>
        </div>
      )}
    </div>
  );
}
