"use client";
import { AccountGateway } from "@/components/account-gateway";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { Arrow } from "@/components/ui";
import { loadSharedContext } from "@/features/onboarding/shared-context";

type AccountState = { loading: boolean; signedIn: boolean; independent: boolean; name: string; email: string; organisation: string; error: string };
type Review = { id: string; filename: string; sizeBytes: number; status: string; feedbackReady?: boolean; createdAt: string };

export function ReportReviewIntake() {
  const [account, setAccount] = useState<AccountState>({ loading: true, signedIn: false, independent: false, name: "", email: "", organisation: "", error: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [organisationId, setOrganisationId] = useState("");
  const [charityOrganisations, setCharityOrganisations] = useState<Array<{ organisationId: string; name: string }>>([]);
  const [context, setContext] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.signedIn && data.account) { setAccount({ loading: false, signedIn: true, independent: data.authProvider === "sorp", name: data.account.name || "", email: data.account.email || "", organisation: data.account.organisation || "", error: "" }); setOrganisation(data.account.organisation || "");
          const charities = (data.authProvider === "sorp" ? data.platformAccess?.memberships || [] : []).filter((member: { type: string; role: string }) => member.type === "Charity" && ["owner", "admin"].includes(member.role));
          setCharityOrganisations(charities); if (charities.length === 1) setOrganisationId(charities[0].organisationId);
        }
        else setAccount({ loading: false, signedIn: false, independent: false, name: "", email: "", organisation: "", error: "" });
      })
      .catch(() => { if (!controller.signal.aborted) setAccount(current => ({ ...current, loading: false, error: "We could not check your account just now." })); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!account.signedIn) return;
    void loadSharedContext().then(shared => { if (shared?.charity?.candidate.name) setOrganisation(current => current || shared.charity!.candidate.name); }).catch(() => undefined);
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "list-report-reviews" }), cache: "no-store" })
      .then(async response => { const data = await response.json(); if (response.ok) setReviews(data.reviews || []); })
      .catch(() => undefined);
  }, [account.signedIn]);
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFileError("");
    if (!selected) { setFile(null); return; }
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) { setFile(null); setFileError("Choose a PDF report."); return; }
    if (selected.size > 15 * 1024 * 1024) { setFile(null); setFileError("Choose a PDF no larger than 15 MB."); return; }
    setFile(selected);
  }
  async function upload() {
    if (!file || busy) return;
    setBusy(true); setFileError(""); setUploadMessage("");
    try {
      const prepareResponse = await fetch("/api/readiness-account/", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create-report-upload", filename: file.name, contentType: file.type || "application/pdf", sizeBytes: file.size, organisation, organisationId, customerContext: context }),
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok || !prepared.upload?.url || !prepared.upload?.token) throw new Error(prepared.error || "The secure upload could not be prepared.");
      let uploaded: { ok?: boolean; review?: Review; error?: string } = {};
      let uploadResponse: Response | null = null;
      if (prepared.upload.mode === "chunked") {
        const chunkBytes = Number(prepared.upload.chunkBytes);
        if (chunkBytes !== 3 * 1024 * 1024 || new URL(prepared.upload.url).origin !== window.location.origin) {
          throw new Error("The secure upload destination is invalid.");
        }
        for (let index = 0; index < Math.ceil(file.size / chunkBytes); index += 1) {
          const form = new FormData();
          form.append("token", prepared.upload.token);
          form.append("index", String(index));
          form.append("file", file.slice(index * chunkBytes, (index + 1) * chunkBytes), file.name);
          uploadResponse = await fetch(prepared.upload.url, { method: "POST", body: form,
            credentials: "same-origin", referrerPolicy: "no-referrer" });
          uploaded = await uploadResponse.json().catch(() => ({}));
          if (!uploadResponse.ok || !uploaded.ok) throw new Error(uploaded.error || "The report could not be uploaded securely.");
        }
      } else {
        const form = new FormData(); form.append("token", prepared.upload.token); form.append("file", file, file.name);
        uploadResponse = await fetch(prepared.upload.url, { method: "POST", body: form, credentials: "omit", referrerPolicy: "no-referrer" });
        uploaded = await uploadResponse.json().catch(() => ({}));
      }
      if (!uploadResponse?.ok || !uploaded.ok) throw new Error(uploaded.error || "The report could not be uploaded securely.");
      if (!uploaded.review) throw new Error("The report upload is incomplete.");
      setReviews(current => [uploaded.review!, ...current.filter(item => item.id !== uploaded.review!.id)]);
      setFile(null); setContext("");
      setUploadMessage("Your report is stored securely and visible in your SORP2026 account. No payment has been taken.");
    } catch (caught) { setFileError(caught instanceof Error ? caught.message : "The secure upload did not complete. No payment was taken."); }
    finally { setBusy(false); }
  }
  if (account.loading) return <div className="review-intake-state" role="status">Checking your SORP2026 account…</div>;
  if (account.error) return <div className="review-intake-state" role="alert">{account.error}</div>;
  if (!account.signedIn) return <div className="review-intake-state"><p className="gateway-kicker">Your report. Your starting point.</p><h2>Let’s get you started.</h2><p>Create your shared SORP2026 account, then come straight back to your report review.</p><AccountGateway returnTo="/charity-impact-reports/review/" /></div>;
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
      {charityOrganisations.length > 0 && <label>Charity workspace<select value={organisationId} onChange={event => setOrganisationId(event.target.value)}>
        <option value="">Personal report</option>{charityOrganisations.map(item => <option key={item.organisationId} value={item.organisationId}>{item.name}</option>)}
      </select></label>}
      <label>Charity or organisation<input value={organisation} onChange={event => setOrganisation(event.target.value)} maxLength={180} placeholder="Organisation name" /></label>
      <label>Anything we should know?<textarea value={context} onChange={event => setContext(event.target.value)} rows={5} maxLength={2000} placeholder="Optional context for the reviewer" /></label>
      {uploadMessage && <p className="review-upload-success" role="status">{uploadMessage}</p>}
      {reviews.length > 0 && <div className="review-history"><p className="gateway-kicker">Your reports</p>{reviews.map(review => <article key={review.id}><div><strong>{review.filename}</strong><small>{new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small>{account.independent && <a href={`/api/sorp-report-download/${encodeURIComponent(review.id)}/`}>Download PDF</a>}</div><b>{review.feedbackReady ? "Feedback ready" : review.status === "awaiting_payment" ? "Uploaded · payment not taken" : review.status.replaceAll("_", " ")}</b></article>)}</div>}
    </section>
    <aside className="review-order">
      <p className="gateway-kicker">Written review + meeting</p><strong>£100</strong>
      <ul><li>Human review of your existing report</li><li>Practical written feedback</li><li>60-minute expert discussion</li><li>Private access through your dashboard</li></ul>
      <div className="review-connection-note"><b>Secure upload first</b><p>Your PDF is stored privately before payment. Online payment remains paused until the £100 Charity Impact Report checkout, not the separate readiness-review checkout, has been verified.</p></div>
      <button className="gateway-action" type="button" disabled={!file || busy} onClick={() => void upload()}>{busy ? "Uploading securely…" : file ? "Upload my report securely" : "Choose your report first"}</button>
      <a className="gateway-quiet-link" href={`mailto:marcus@mysocialimpact.org?subject=${encodeURIComponent("Charity Impact Report review")}&body=${encodeURIComponent(`Hello Marcus,\n\nI would like to arrange the £100 Charity Impact Report review.\n\nAccount: ${account.email}\nOrganisation: ${account.organisation || ""}\n`)}`}>Arrange the review with Marcus <Arrow diagonal /></a>
      <p className="review-order-small">No payment is taken by this upload. Do not email sensitive documents; use the secure PDF upload above.</p>
    </aside>
  </div>;
}
