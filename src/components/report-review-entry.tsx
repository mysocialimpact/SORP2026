"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigationAccount } from "./navigation-account";
import { ToolLink } from "./tool-link";
import { signInHref } from "@/lib/account-navigation";

const destination = "/charity-impact-reports/review/";

export function ReportReviewEntry() {
  const { status } = useNavigationAccount();
  return <ToolLink className="gateway-action" href={destination}>
    {status === "signed-in" ? "Open my free report reviews" : "Get Started — Free"}<span aria-hidden="true">→</span>
  </ToolLink>;
}

export function ReportReviewUpload() {
  const router = useRouter();
  const { status } = useNavigationAccount();
  const signedIn = status === "signed-in";
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  async function upload(file: File) {
    setError(""); setNeedsLogin(false);
    if (!signedIn) { setError("Create your free account first, then upload your report. No file has been sent."); return; }
    if (busy) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size > 4_000_000) { setError("Please choose a searchable PDF up to 4 MB."); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/impact-report-review/", { method: "POST", body });
      const result = await response.json();
      if (response.status === 401) setNeedsLogin(true);
      if (!response.ok) throw new Error(result.error || "Your report could not be uploaded. Please try again.");
      if (typeof result.id !== "string" || !/^[a-f\d-]{36}$/i.test(result.id)) throw new Error("The upload could not be confirmed. Please open your saved reports.");
      router.push(destination + "?document=" + encodeURIComponent(result.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try uploading again."); setBusy(false); }
  }

  return <div className="reports-upload-panel">
    <div className="reports-upload-copy"><p className="gateway-kicker">Your first report · £0 · Both reviews included</p><h3>Upload once.<br/>See the full picture.</h3><p>Use the report we find for your charity, or upload your own. Confirm the document, then choose SICC, SIE or both.</p></div>
    <div className={`reports-dropzone${dragging ? " is-dragging" : ""}`} role="region" aria-label="Upload your impact report"
      onDragOver={event => { event.preventDefault(); if (signedIn && !busy) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void upload(file); }}>
      <svg className="reports-upload-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M14 5h14l10 10v28H10V5h4Zm14 0v11h10M24 34V21m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <h4>{signedIn ? "Drop your impact report here" : "Your report. Two free reviews."}</h4>
      <p>{signedIn ? "Or choose a PDF from your device." : "Register first, then drag & drop your PDF."}</p>
      {signedIn ? <><input ref={input} type="file" accept=".pdf,application/pdf" aria-label="Choose your impact report PDF" hidden disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }}/><button className="gateway-action" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading your PDF…" : "Choose a PDF"}<span aria-hidden="true">↑</span></button></> : <ReportReviewEntry/>}
      <small>Searchable PDF · Up to 4 MB</small>
      {signedIn ? <ToolLink className="reports-find-link" href={destination}>Find my charity’s published report →</ToolLink> : <Link className="reports-find-link" href={signInHref(destination)}>Already registered? Log in →</Link>}
      {!signedIn && <p className="reports-account-note">One SORP 2026 account. Start with your readiness review, then explore your free impact report reviews.</p>}
      {busy && <p role="status">Saving your document securely. You’ll confirm it before any review starts.</p>}
      {error && <p className="reports-upload-error" role="alert">{error}{needsLogin && <> <Link href={signInHref(destination)}>Log in →</Link></>}</p>}
    </div>
  </div>;
}
