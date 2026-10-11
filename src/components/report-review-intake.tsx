"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { Arrow } from "@/components/ui";

type AccountState = { loading: boolean; signedIn: boolean; name: string; email: string; organisation: string; error: string };

export function ReportReviewIntake() {
  const [account, setAccount] = useState<AccountState>({ loading: true, signedIn: false, name: "", email: "", organisation: "", error: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.signedIn && data.account) setAccount({ loading: false, signedIn: true, name: data.account.name || "", email: data.account.email || "", organisation: data.account.organisation || "", error: "" });
        else setAccount({ loading: false, signedIn: false, name: "", email: "", organisation: "", error: "" });
      })
      .catch(() => { if (!controller.signal.aborted) setAccount(current => ({ ...current, loading: false, error: "We could not check your account just now." })); });
    return () => controller.abort();
  }, []);
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFileError("");
    if (!selected) { setFile(null); return; }
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) { setFile(null); setFileError("Choose a PDF report."); return; }
    if (selected.size > 15 * 1024 * 1024) { setFile(null); setFileError("Choose a PDF no larger than 15 MB."); return; }
    setFile(selected);
  }
  if (account.loading) return <div className="review-intake-state" role="status">Checking your SORP2026 account…</div>;
  if (account.error) return <div className="review-intake-state" role="alert">{account.error}</div>;
  if (!account.signedIn) return <div className="review-intake-state"><p className="gateway-kicker">Your report stays private</p><h2>Log in before uploading.</h2><p>Use your existing SORP2026 account, or create one once for the whole platform.</p><Link className="gateway-action" href="/login/?return=/charity-impact-reports/review/">Log in or create account <Arrow /></Link></div>;
  return <div className="review-intake-grid">
    <section className="review-upload" aria-labelledby="upload-title">
      <p className="gateway-kicker">Step 1 · Your report</p>
      <h2 id="upload-title">Choose the PDF you want us to review.</h2>
      <label className={`review-drop${file ? " has-file" : ""}`}>
        <input type="file" accept="application/pdf,.pdf" onChange={choose}/>
        <span aria-hidden="true">{file ? "✓" : "+"}</span>
        <strong>{file ? file.name : "Choose a PDF report"}</strong>
        <small>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ready in this browser` : "PDF · maximum 15 MB"}</small>
      </label>
      {fileError && <p className="account-error" role="alert">{fileError}</p>}
      <label>Charity or organisation<input defaultValue={account.organisation} maxLength={180} placeholder="Organisation name" /></label>
      <label>Anything we should know?<textarea rows={5} maxLength={2000} placeholder="Optional context for the reviewer" /></label>
    </section>
    <aside className="review-order">
      <p className="gateway-kicker">Written review + meeting</p><strong>£100</strong>
      <ul><li>Human review of your existing report</li><li>Practical written feedback</li><li>60-minute expert discussion</li><li>Private access through your dashboard</li></ul>
      <div className="review-connection-note"><b>Preview connection status</b><p>The secure private-upload store and order record still require their backend deployment. This preview will not transmit your PDF or take payment until that connection is verified.</p></div>
      <button className="gateway-action" type="button" disabled>{file ? "Secure checkout awaiting connection" : "Choose your report first"}</button>
      <a className="gateway-quiet-link" href={`mailto:marcus@mysocialimpact.org?subject=${encodeURIComponent("Charity Impact Report review")}&body=${encodeURIComponent(`Hello Marcus,\n\nI would like to arrange the £100 Charity Impact Report review.\n\nAccount: ${account.email}\nOrganisation: ${account.organisation || ""}\n`)}`}>Arrange the review with Marcus <Arrow diagonal /></a>
      <p className="review-order-small">No payment has been taken. Do not email sensitive documents unless you are comfortable doing so; Marcus can agree a secure transfer route with you.</p>
    </aside>
  </div>;
}
