"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PILLARS } from "./questions";

type Invitation = { id: string; email: string; name: string; status: "invited" | "started" | "completed"; invitedAt: string; startedAt: string | null; completedAt: string | null; result?: { overall: number; pillarScores: number[]; maturity: string } };
type Workspace = {
  organisation: { id: string; name: string; programme: "snapshot" | "team" | "excellence"; seatLimit: number; entitlementSource: string };
  round: { id: string; title: string; responseMode: "confidential" | "named"; status: string } | null;
  invitations: Invitation[];
  aggregate: { available: boolean; required: number; completed: number; overall?: number; pillarScores?: number[]; maturity?: string };
};

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "That request could not be completed."), { status: response.status });
  return payload;
}

function statusLabel(status: Invitation["status"]) { return status === "completed" ? "Completed" : status === "started" ? "In progress" : "Invited"; }

export function TeamWorkspace() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [share, setShare] = useState<{ email: string; name: string; url: string } | null>(null);
  const counts = useMemo(() => ({
    completed: workspace?.invitations.filter(item => item.status === "completed").length || 0,
    started: workspace?.invitations.filter(item => item.status === "started").length || 0,
    invited: workspace?.invitations.filter(item => item.status === "invited").length || 0,
  }), [workspace]);

  async function load() {
    try { setWorkspace(await post({ action: "team-workspace" }) as Workspace); }
    catch (caught) { if ((caught as { status?: number }).status === 401) router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/team/"))); else setError(caught instanceof Error ? caught.message : "The team workspace could not be opened."); }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function invite(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setShare(null);
    try {
      const payload = await post({ action: "team-invite", name, email }) as { invitation: { invitationToken: string; email: string; name: string } };
      const url = `${window.location.origin}/social-impact-excellence/team/respond/#${payload.invitation.invitationToken}`;
      setShare({ email: payload.invitation.email, name: payload.invitation.name, url }); setName(""); setEmail(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The invitation could not be created."); }
    finally { setBusy(false); }
  }

  async function updateMode(mode: "confidential" | "named") {
    if (!workspace?.round || mode === workspace.round.responseMode) return;
    setBusy(true); setError("");
    try { await post({ action: "team-update-round", responseMode: mode, title: workspace.round.title }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The privacy setting could not be changed."); }
    finally { setBusy(false); }
  }

  async function remove(invitationId: string) {
    setBusy(true); setError("");
    try { await post({ action: "team-remove-invite", invitationId }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The invitation could not be removed."); }
    finally { setBusy(false); }
  }

  if (workspace === undefined) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your team workspace…</p></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open the team workspace.</h1><p>{error}</p><Link href="/dashboard/">Return to dashboard</Link></section></main>;
  if (workspace.organisation.programme === "snapshot") return <main className="sie-team">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/dashboard/">My dashboard</Link></header>
    <section className="sie-team-locked"><p className="sie-eyebrow">Team Perspective</p><h1>See your organisation from more than one angle.</h1><p>Your free Snapshot is for one person. Team Perspective lets you invite colleagues, track completion and see a protected organisation-wide result.</p><div><strong>Up to 15 people</strong><strong>One fixed programme price</strong><strong>No extra SORP2026 membership</strong></div><a href="mailto:marcus@mysocialimpact.org?subject=Social%20Impact%20Excellence%20Team%20Perspective">Register for Team Perspective →</a><small>Online payment will open when the fixed programme price is confirmed. Your free SORP2026 account stays free.</small></section>
  </main>;

  const round = workspace.round!;
  return <main className="sie-team">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><span>{workspace.organisation.name}</span><Link href="/dashboard/">My dashboard</Link></header>
    <section className="sie-team-hero"><div><p className="sie-eyebrow">Team Perspective · organisation workspace</p><h1>Bring every perspective into one clear view.</h1><p>Invite your colleagues, see who has completed the snapshot and use the combined result to start a better conversation.</p></div><div className="sie-team-count"><strong>{counts.completed}</strong><span>of {workspace.organisation.seatLimit} places completed</span><i><b style={{ width: `${Math.min(100, (workspace.invitations.length / workspace.organisation.seatLimit) * 100)}%` }}/></i></div></section>
    <section className="sie-team-status" aria-label="Round progress"><article><strong>{counts.invited}</strong><span>Invited</span></article><article><strong>{counts.started}</strong><span>In progress</span></article><article><strong>{counts.completed}</strong><span>Completed</span></article><article><strong>{workspace.organisation.seatLimit - workspace.invitations.length}</strong><span>Places available</span></article></section>
    <section className="sie-team-grid">
      <article className="sie-team-invite"><p className="sie-eyebrow">Invite a colleague</p><h2>Who should take part?</h2><form onSubmit={invite}><label>Name <span>optional</span><input value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><label>Email address<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label><button disabled={busy}>{busy ? "Creating invitation…" : "Create email invitation →"}</button></form><p className="sie-team-explain">The private link is created here, then sent from your own email. Nobody needs a second account, and Marcus does not need to set anybody up.</p></article>
      <article className="sie-team-privacy"><p className="sie-eyebrow">Privacy for this round</p><h2>{round.responseMode === "confidential" ? "Confidential responses" : "Named responses"}</h2><div role="radiogroup" aria-label="Response privacy"><button disabled={busy} aria-pressed={round.responseMode === "confidential"} onClick={() => void updateMode("confidential")}><strong>Confidential</strong><span>You see who completed, but not their individual answers or scores.</span></button><button disabled={busy} aria-pressed={round.responseMode === "named"} onClick={() => void updateMode("named")}><strong>Named</strong><span>You can also see each person’s completed result.</span></button></div><p>Privacy cannot be changed after somebody starts. A combined result appears after three completed responses.</p></article>
    </section>
    {share && <section className="sie-team-share" role="status"><div><p className="sie-eyebrow">Invitation ready</p><h2>Send this private link to {share.name || share.email}.</h2><p>It is unique to this participant. Do not post it publicly.</p></div><div><a href={`mailto:${encodeURIComponent(share.email)}?subject=${encodeURIComponent(`${workspace.organisation.name}: Social Impact Excellence Team Perspective`)}&body=${encodeURIComponent(`Hello${share.name ? ` ${share.name}` : ""},\n\nYou've been invited to contribute to ${workspace.organisation.name}'s Social Impact Excellence Team Perspective. It takes around 10–15 minutes.\n\nUse your private link:\n${share.url}\n\n${round.responseMode === "confidential" ? "Your individual answers and score will remain confidential. The organiser can see whether you have completed, and results are combined once at least three people have responded." : "This is a named round, so the organiser can see your completed result."}\n\nThank you.`)}`}>Open prepared email →</a><button onClick={() => void navigator.clipboard.writeText(share.url)}>Copy private link</button></div></section>}
    {error && <p className="sie-team-error" role="alert">{error}</p>}
    <section className="sie-team-participants"><div><p className="sie-eyebrow">People invited</p><h2>{round.title}</h2></div>{workspace.invitations.length ? <div className="sie-team-table">{workspace.invitations.map(item => <article key={item.id}><div className="sie-team-person"><strong>{item.name || item.email.split("@")[0]}</strong><span>{item.email}</span></div><b data-status={item.status}>{statusLabel(item.status)}</b>{item.result ? <div className="sie-team-person-score"><strong>{item.result.overall.toFixed(1)}</strong><span>{item.result.maturity}</span></div> : <span className="sie-team-private">{item.status === "completed" && round.responseMode === "confidential" ? "Response kept confidential" : "N/A"}</span>}{item.status !== "completed" ? <button disabled={busy} onClick={() => void remove(item.id)}>Remove</button> : <span />}</article>)}</div> : <p>No colleagues have been invited yet.</p>}</section>
    <section className="sie-team-aggregate"><div><p className="sie-eyebrow">Organisation view</p><h2>{workspace.aggregate.available ? `${workspace.aggregate.overall!.toFixed(1)} out of 5` : `${workspace.aggregate.completed} of ${workspace.aggregate.required} responses needed`}</h2><p>{workspace.aggregate.available ? `Your combined Team Perspective is ${workspace.aggregate.maturity?.toLowerCase()}. Individual responses stay protected by the privacy choice above.` : "The combined result stays hidden until at least three people have completed. That protects confidentiality and avoids over-reading one person’s view."}</p></div>{workspace.aggregate.available && <div className="sie-team-pillars">{PILLARS.map((pillar, index) => <article key={pillar.key}><span>{pillar.label}</span><i><b style={{ width: `${(workspace.aggregate.pillarScores?.[index] || 0) * 20}%` }}/></i><strong>{workspace.aggregate.pillarScores?.[index].toFixed(1)}</strong></article>)}</div>}</section>
  </main>;
}
