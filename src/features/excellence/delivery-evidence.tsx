"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DELIVERY_EVIDENCE_CATEGORIES, normaliseDeliveryWorkspace, type DeliveryEvidence, type DeliveryWorkspace } from "./delivery";

type Account = { name?: string; email?: string; organisation?: string };
type ProductData = Record<string, unknown> & { result?: unknown; delivery?: unknown };
type Pending = { file: File; category: string; notes: string };
type Payload = { account?: Account; productProgress?: { data?: ProductData }; files?: DeliveryEvidence[]; error?: string };
function fileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export function DeliveryEvidenceUpload() {
  const router = useRouter();
  const [productData, setProductData] = useState<ProductData>();
  const [workspace, setWorkspace] = useState<DeliveryWorkspace>();
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const requests = [
      { action: "load-product", productId: "social-impact-excellence" },
      { action: "list-product-files", productId: "social-impact-excellence", purpose: "delivery-evidence" }
    ];
    void Promise.all(requests.map(body => fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" }).then(async response => ({ response, payload: await response.json() as Payload })))).then(([product, files]) => {
      if (product.response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/delivery/evidence/"))); return; }
      if (!product.response.ok) throw new Error(product.payload.error || "Your Delivery workspace could not be loaded.");
      if (!product.payload.productProgress?.data?.result) { router.replace("/social-impact-excellence/assessment/"); return; }
      const next = normaliseDeliveryWorkspace(product.payload.productProgress.data.delivery, product.payload.account);
      if (next.status !== "assessment_complete" && next.status !== "evidence_submitted") { router.replace("/social-impact-excellence/delivery/assessment/"); return; }
      const evidence = files.response.ok ? files.payload.files || [] : next.evidence;
      setProductData(product.payload.productProgress.data); setWorkspace({ ...next, evidence });
    }).catch(caught => setError(caught instanceof Error ? caught.message : "Your Delivery workspace could not be loaded."));
  }, [router]);

  async function saveWorkspace(next: DeliveryWorkspace) {
    if (!productData) return false;
    const nextData = { ...productData, delivery: next };
    const response = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save-product", productId: "social-impact-excellence", status: "complete", data: nextData }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Your Delivery workspace could not be saved.");
    setProductData(nextData); setWorkspace(next); return true;
  }
  function chooseFiles(files: FileList | null) { if (files) { setPending(Array.from(files).map(file => ({ file, category: "Other supporting evidence", notes: "" }))); setError(""); setMessage(""); } }
  async function upload() {
    if (!workspace || !pending.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const added: DeliveryEvidence[] = [];
      for (const item of pending) {
        const prepare = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create-product-file-upload", productId: "social-impact-excellence", purpose: "delivery-evidence", filename: item.file.name, contentType: item.file.type || "application/octet-stream", sizeBytes: item.file.size, category: item.category, notes: item.notes }) });
        const prepared = await prepare.json(); if (!prepare.ok) throw new Error(prepared.error || `Unable to prepare ${item.file.name}.`);
        const form = new FormData(); form.set("token", prepared.upload.token); form.set("file", item.file);
        const direct = await fetch(prepared.upload.url, { method: "POST", body: form }); const stored = await direct.json();
        if (!direct.ok) throw new Error(stored.error || `Unable to store ${item.file.name}.`);
        added.push({ id: prepared.file.id, fileName: item.file.name, category: item.category, notes: item.notes, size: item.file.size, uploadedAt: stored.file.uploadedAt || new Date().toISOString() });
      }
      await saveWorkspace({ ...workspace, evidence: [...added, ...workspace.evidence], evidenceStatus: "in_progress", progress: Math.max(80, workspace.progress) });
      setPending([]); setMessage("Your supporting evidence has been uploaded securely for My Social Impact review.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your documents could not be uploaded."); }
    finally { setBusy(false); }
  }
  async function finish() {
    if (!workspace) return;
    setBusy(true); setError("");
    try { await saveWorkspace({ ...workspace, status: "evidence_submitted", evidenceStatus: "submitted", reviewStatus: "awaiting_msi_review", progress: 100 }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "This stage could not be submitted."); }
    finally { setBusy(false); }
  }

  if (error && !workspace) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open supporting evidence.</h1><p>{error}</p><Link href="/social-impact-excellence/delivery/">Return to Delivery</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your secure evidence workspace…</p></section></main>;
  if (workspace.status === "evidence_submitted") return <main className="sie-report"><header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/dashboard/">My dashboard</Link></header><section className="sie-state"><p className="sie-eyebrow">Evidence submitted</p><h1>Your Delivery materials are awaiting MSI review.</h1><p>This submission is not yet an MSI-reviewed or verified diagnostic. My Social Impact can now provide professional review, interpretation and constructive challenge at the next checkpoint.</p><Link href="mailto:marcus@mysocialimpact.org?subject=Delivery%20review%20checkpoint">Arrange the review checkpoint →</Link><Link href="/social-impact-excellence/journey/">Return to your journey</Link></section></main>;
  return <main className="sie-report sie-evidence"><header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/delivery/">Delivery home</Link></header>
    <section className="sie-evidence-layout"><div><p className="sie-eyebrow">Stage 02 · Supporting evidence</p><h1>Bring your answers to life.</h1><p>Supporting evidence helps My Social Impact understand how operational and financial management works in practice. Share materials you already use; you do not need to create documents just for this assessment.</p><p>Useful examples might include delivery plans, programme budgets, management accounts, financial forecasts, programme costing, resource allocation plans, operational procedures, staff or volunteer guidance, partnership agreements, quality monitoring, anonymised feedback, improvement examples or business continuity arrangements.</p><blockquote><strong>Evidence is optional and proportionate.</strong><br/>A simple budget, spreadsheet or short explanation may be more useful than a large collection of documents. Financial documents may be commercially sensitive and remain within the existing private product-file workflow.</blockquote><p><strong>Please anonymise information wherever possible. Do not upload identifiable beneficiary records or unnecessary sensitive information.</strong></p><p>Unsure what would help? My Social Impact can guide you towards proportionate, useful evidence.</p>
      <label className="sie-evidence-drop"><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt" onChange={event => chooseFiles(event.target.files)}/><strong>Choose documents to upload</strong><span>PDF, Office, presentation or text files · up to 15 MB each</span></label>
      {pending.map((item, index) => <article className="sie-evidence-pending" key={`${item.file.name}-${index}`}><div><strong>{item.file.name}</strong><span>{fileSize(item.file.size)}</span></div><label>Category<select value={item.category} onChange={event => setPending(current => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, category: event.target.value } : entry))}>{DELIVERY_EVIDENCE_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><label>Notes (optional)<textarea rows={3} value={item.notes} onChange={event => setPending(current => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))}/></label></article>)}
      {error && <p className="sie-form-error" role="alert">{error}</p>}{message && <p className="sie-form-success" role="status">{message}</p>}
      <div className="sie-evidence-actions">{pending.length > 0 && <button type="button" disabled={busy} onClick={() => void upload()}>{busy ? "Uploading…" : `Upload ${pending.length} document${pending.length === 1 ? "" : "s"}`}</button>}<button type="button" className="secondary" disabled={busy || pending.length > 0} onClick={() => void finish()}>{workspace.evidence.length ? "Submit evidence stage" : "Continue without documents"}</button></div>
    </div><aside><p className="sie-eyebrow">Uploaded evidence</p><h2>{workspace.evidence.length} document{workspace.evidence.length === 1 ? "" : "s"}</h2>{workspace.evidence.length ? workspace.evidence.map(item => <article key={item.id}><strong>{item.fileName}</strong><span>{item.category} · {fileSize(item.size)}</span>{item.notes && <p>{item.notes}</p>}</article>) : <p>No documents uploaded yet.</p>}<div><strong>Private by design.</strong><p>Files use the existing private product-file workflow and remain limited to this account and authorised MSI reviewers.</p></div></aside></section>
  </main>;
}
