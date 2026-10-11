"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PURPOSE_EVIDENCE_CATEGORIES, normalisePurposeWorkspace, type PurposeEvidence, type PurposeWorkspace } from "./purpose";

type Account = { name?: string; email?: string; organisation?: string };
type ProductData = Record<string, unknown> & { result?: unknown; purpose?: unknown };
type Pending = { file: File; category: string; notes: string };
type Payload = { account?: Account; productProgress?: { data?: ProductData }; files?: PurposeEvidence[]; error?: string };

function fileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export function PurposeEvidenceUpload() {
  const router = useRouter();
  const [productData, setProductData] = useState<ProductData>();
  const [workspace, setWorkspace] = useState<PurposeWorkspace>();
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const productRequest = { action: "load-product", productId: "social-impact-excellence" };
    const filesRequest = { action: "list-product-files", productId: "social-impact-excellence", purpose: "purpose-evidence" };
    void Promise.all([productRequest, filesRequest].map(body => fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" }).then(async response => ({ response, payload: await response.json() as Payload })))).then(([product, files]) => {
      if (product.response.status === 401) { router.replace("/login/?return=/social-impact-excellence/purpose/evidence/"); return; }
      if (!product.response.ok) throw new Error(product.payload.error || "Your Purpose workspace could not be loaded.");
      if (!product.payload.productProgress?.data?.result) { router.replace("/social-impact-excellence/assessment/"); return; }
      const next = normalisePurposeWorkspace(product.payload.productProgress.data.purpose, product.payload.account);
      if (next.status !== "assessment_complete" && next.status !== "complete") { router.replace("/social-impact-excellence/purpose/assessment/"); return; }
      const evidence = files.response.ok ? files.payload.files || [] : next.evidence;
      setProductData(product.payload.productProgress.data); setWorkspace({ ...next, evidence });
    }).catch(caught => setError(caught instanceof Error ? caught.message : "Your Purpose workspace could not be loaded."));
  }, [router]);

  async function saveWorkspace(next: PurposeWorkspace) {
    if (!productData) return false;
    const nextData = { ...productData, purpose: next };
    const response = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save-product", productId: "social-impact-excellence", status: "complete", data: nextData }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Your Purpose workspace could not be saved.");
    setProductData(nextData); setWorkspace(next); return true;
  }

  function chooseFiles(files: FileList | null) {
    if (!files) return;
    setPending(Array.from(files).map(file => ({ file, category: "Other Relevant Documents", notes: "" })));
    setError(""); setMessage("");
  }

  async function upload() {
    if (!workspace || !pending.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const added: PurposeEvidence[] = [];
      for (const item of pending) {
        const prepare = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create-product-file-upload", productId: "social-impact-excellence", purpose: "purpose-evidence", filename: item.file.name, contentType: item.file.type || "application/octet-stream", sizeBytes: item.file.size, category: item.category, notes: item.notes }) });
        const prepared = await prepare.json();
        if (!prepare.ok) throw new Error(prepared.error || `Unable to prepare ${item.file.name}.`);
        const form = new FormData(); form.set("token", prepared.upload.token); form.set("file", item.file);
        const direct = await fetch(prepared.upload.url, { method: "POST", body: form });
        const stored = await direct.json();
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
    try { await saveWorkspace({ ...workspace, status: "complete", evidenceStatus: "complete", progress: 100 }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "This stage could not be completed."); }
    finally { setBusy(false); }
  }

  if (error && !workspace) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open supporting evidence.</h1><p>{error}</p><Link href="/social-impact-excellence/purpose/">Return to Purpose</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your secure evidence workspace…</p></section></main>;
  if (workspace.status === "complete") return <main className="sie-report"><header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/dashboard/">My dashboard</Link></header><section className="sie-state"><p className="sie-eyebrow">Evidence stage complete</p><h1>Your Purpose materials are ready for MSI review.</h1><p>My Social Impact can now review your assessment and supporting evidence, then provide challenge and guidance at the next checkpoint.</p><Link href="mailto:marcus@mysocialimpact.org?subject=Purpose%20review%20checkpoint">Arrange the review checkpoint →</Link><Link href="/social-impact-excellence/journey/">Return to your journey</Link></section></main>;
  return <main className="sie-report sie-evidence">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/purpose/">Purpose home</Link></header>
    <section className="sie-evidence-layout"><div><p className="sie-eyebrow">Stage 02 · Supporting evidence</p><h1>Add context to your purpose.</h1><p>Upload documents that will help My Social Impact understand your charity’s purpose, ambitions and intended impact.</p><blockquote><strong>No formal documents? That is completely normal.</strong><br/>You can continue without evidence, or add anything that helps explain your thinking.</blockquote>
      <label className="sie-evidence-drop"><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt" onChange={event => chooseFiles(event.target.files)}/><strong>Choose documents to upload</strong><span>PDF, Office, presentation or text files · up to 15 MB each</span></label>
      {pending.map((item, index) => <article className="sie-evidence-pending" key={`${item.file.name}-${index}`}><div><strong>{item.file.name}</strong><span>{fileSize(item.file.size)}</span></div><label>Category<select value={item.category} onChange={event => setPending(current => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, category: event.target.value } : entry))}>{PURPOSE_EVIDENCE_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><label>Notes (optional)<textarea rows={3} value={item.notes} onChange={event => setPending(current => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))}/></label></article>)}
      {error && <p className="sie-form-error" role="alert">{error}</p>}{message && <p className="sie-form-success" role="status">{message}</p>}
      <div className="sie-evidence-actions">{pending.length > 0 && <button type="button" disabled={busy} onClick={() => void upload()}>{busy ? "Uploading…" : `Upload ${pending.length} document${pending.length === 1 ? "" : "s"}`}</button>}<button type="button" className="secondary" disabled={busy || pending.length > 0} onClick={() => void finish()}>{workspace.evidence.length ? "Finish evidence stage" : "Continue without documents"}</button></div>
    </div><aside><p className="sie-eyebrow">Uploaded evidence</p><h2>{workspace.evidence.length} document{workspace.evidence.length === 1 ? "" : "s"}</h2>{workspace.evidence.length ? workspace.evidence.map(item => <article key={item.id}><strong>{item.fileName}</strong><span>{item.category} · {fileSize(item.size)}</span>{item.notes && <p>{item.notes}</p>}</article>) : <p>No documents uploaded yet.</p>}<div><strong>Private by design.</strong><p>Files are stored in the existing private platform bucket and are available only to this account and authorised MSI reviewers.</p></div></aside></section>
  </main>;
}
