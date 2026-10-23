"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { directoryPath, firmPath, normalisePostcode, selectFirms, serviceLabels, type Bounds, type Firm, type Point, type Service } from "@/lib/accountants";
import { VerificationBadge } from "./verification-badge";
import { ExternalRecognition } from "./external-recognition";
import type { MapView } from "./directory-map";
import { FolderHero } from "@/components/folder-hero";
const DirectoryMap = dynamic(() => import("./directory-map"), { ssr: false, loading: () => <div className="directory-map-loading">Opening your UK map…</div> });
const storageKey = "sorp2026.accountant-shortlist";

export function DirectoryExplorer({ firms, spotlight }: { firms: Firm[]; spotlight?: ReactNode }) {
  const [query, setQuery] = useState("");
  const [postcode, setPostcode] = useState("");
  const [origin, setOrigin] = useState<(Point & { postcode: string; area: string }) | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [evidenced, setEvidenced] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [mode, setMode] = useState("map");
  const [area, setArea] = useState<Bounds | null>(null);
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  const [view, setView] = useState<MapView>({ nationwide: true, revision: 0 });
  const [saved, setSaved] = useState<string[]>([]);
  const [shortlistReady, setShortlistReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [postcodeError, setPostcodeError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const comparison = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Browser-only storage and URL state are restored after SSR to avoid hydration mismatches.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const values: unknown = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      if (Array.isArray(values)) setSaved([...new Set(values.filter(v => typeof v === "string" && firms.some(f => f.slug === v)))].slice(0,3));
    } catch { /* Shortlisting remains available without storage. */ }
    setShortlistReady(true);
    const params = new URLSearchParams(location.search);
    const initialFirm = params.get("near") || params.get("firm"), service = params.get("service");
    if (service && service in serviceLabels) setServices([service as Service]);
    const firm = firms.find(f => f.slug === initialFirm);
    if (firm?.coordinates) {
      setSelected(firm.slug); setView({ point: firm.coordinates, revision: 1 });
      if (params.has("near")) { setOrigin({ ...firm.coordinates, postcode: firm.postcode, area: firm.location }); setPostcode(firm.postcode); }
      else setLimit(Math.max(10, selectFirms(firms, { query: "", services: [], origin: null, area: null, evidenced: false }).findIndex(r => r.firm.slug === firm.slug) + 1));
    }
    return () => request.current?.abort();
  }, [firms]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!shortlistReady) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Memory-only shortlist. */ }
  }, [saved, shortlistReady]);

  const results = useMemo(() => selectFirms(firms, { query, services, origin, area, evidenced }), [firms, query, services, origin, area, evidenced]);
  const mapped = useMemo(() => results.map(r => r.firm), [results]);
  const active = results.find(r => r.firm.slug === selected);
  const compared = saved.map(slug => firms.find(f => f.slug === slug)!).filter(Boolean);
  const availableServices = (Object.keys(serviceLabels) as Service[]).filter(id => firms.some(f => f.services.some(s => s.id === id)));

  function changeFilters() { setLimit(10); setSelected(null); }
  function select(slug: string, fromMap = false) {
    const index = results.findIndex(r => r.firm.slug === slug);
    setLimit(current => Math.max(current, Math.ceil((index + 1) / 10) * 10));
    setSelected(slug);
    if (fromMap) requestAnimationFrame(() => {
      const card = document.getElementById(`firm-${slug}`), panel = list.current;
      if (card && panel && matchMedia("(min-width: 901px)").matches) panel.scrollTo({ top: card.offsetTop - panel.offsetTop - 12, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
  }
  function save(slug: string) {
    if (saved.includes(slug)) { setSaved(saved.filter(id => id !== slug)); setNotice("Removed from your shortlist."); }
    else if (saved.length < 3) { setSaved([...saved, slug]); setNotice("Saved for this visit."); }
    else setNotice("Your shortlist holds three firms. Remove one to add another.");
  }
  async function findNearby(event: React.FormEvent) {
    event.preventDefault();
    request.current?.abort();
    const value = normalisePostcode(postcode);
    if (!value) { setQuery(postcode); setOrigin(null); setArea(null); changeFilters(); setBusy(false); setPostcodeError(""); document.getElementById("directory")?.scrollIntoView(); return; }
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setPostcodeError("");
    try {
      const response = await fetch(`/api/directory/postcode/?q=${encodeURIComponent(value)}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Postcode search is unavailable.");
      setOrigin(data); setQuery(""); setPostcode(data.postcode); setArea(null); setSelected(null); setLimit(10);
      setView(current => ({ point: data, revision: current.revision + 1 }));
      document.getElementById("directory")?.scrollIntoView();
    } catch (error) { if (!controller.signal.aborted) setPostcodeError(error instanceof Error ? error.message : "Please try again."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function nationwide() {
    request.current?.abort(); setBusy(false); setOrigin(null); setPostcode(""); setArea(null); setQuery(""); setServices([]); setEvidenced(false); setSelected(null); setLimit(10); setPostcodeError("");
    setView(current => ({ nationwide: true, revision: current.revision + 1 }));
  }

  return <>
    <FolderHero product="home" as="header" className="adviser-hero">
      <div className="directory-width adviser-hero-grid">
        <div className="adviser-hero-copy">
          <p className="directory-eyebrow">Independent research · For charities</p>
          <h1>Find the people<br/>behind the <em>numbers.</em></h1>
          <p className="adviser-intro">Find specialist charity accountants.<br/>Compare their experience. Start an informed conversation.</p>
          <form onSubmit={findNearby} className="adviser-search">
            <label htmlFor="directory-query">Find a charity accountant</label>
            <div><input id="directory-query" name="query" type="search" placeholder="Firm, town, village or postcode" value={postcode} onChange={e => { request.current?.abort(); setBusy(false); setPostcode(e.target.value); setQuery(normalisePostcode(e.target.value) ? "" : e.target.value); setOrigin(null); setArea(null); setPostcodeError(""); changeFilters(); }} aria-describedby={postcodeError ? "directory-postcode-error" : "directory-search-hint"}/><button disabled={busy} type="submit">{busy ? "Finding…" : "Search ↗"}</button></div>
            <p id="directory-search-hint">{firms.length} listings · postcode search finds your nearest firms</p>
            {postcodeError && <p id="directory-postcode-error" role="alert" className="directory-error">{postcodeError}</p>}
          </form>
          <nav className="adviser-quick-links" aria-label="Directory shortcuts"><a href="#directory">Browse the A–Z ↓</a><button onClick={() => { setMode("map"); document.getElementById("directory")?.scrollIntoView(); }}>Explore the map ↗</button><button onClick={() => comparison.current?.showModal()}>Your shortlist ({saved.length})</button></nav>
        </div>
        <aside className="adviser-invite adviser-trust"><p className="directory-eyebrow">A clearer starting point</p><h2>Expertise you can explore.<br/><em>Evidence you can see.</em></h2><p>Compare charity experience, relevant services and named specialists. Follow the sources behind each profile.</p><ul><li><strong>Public evidence</strong><span>Research into services, qualifications and charity-sector experience.</span></li><li><strong>Human judgement</strong><span>My Social Impact reviews evidence and can speak with firms to understand their expertise.</span></li></ul><a href="#directory-approach">Understand the trust signals ↓</a></aside>
        <div className="adviser-icaew"><a href="https://www.icaew.com/" target="_blank" rel="noopener noreferrer">ICAEW<span>Chartered Accountants</span></a><p>We’re starting with ICAEW firms because our founder, Marcus Warry, is an ICAEW Chartered Accountant. ICAEW is the Institute of Chartered Accountants in England and Wales. This is an independent directory, not an ICAEW endorsement.</p><details><summary>About the directory</summary><p>We haven’t personally assessed every firm. Inclusion is based on stated charity specialisms and public information. The original 110 records and researched Burton Sweet listing are preserved. Each profile links to its sources. Map pins represent office postcode centres, not entrances.</p></details></div>
      </div>
    </FolderHero>
    {spotlight}
    <section id="directory" className="adviser-directory-stage directory-width" aria-label="Find and compare charity accountants">
    <header className="adviser-directory-heading"><div><p className="directory-eyebrow">The directory · A–Z</p><h2>Your next conversation<br/>starts here.</h2></div><p>Choose a firm on the map or in the list.<br/>Save up to three. Find your fit.</p></header>
    <div className="directory-app">
    <div className="directory-search">
      <div className="directory-scope"><span aria-hidden="true">✓</span> Firms listed with a charity-sector specialism <small>Directory specialism, not an endorsement</small></div>
      <div className="directory-filter-row"><details className="directory-filters"><summary>Services & evidence {services.length || evidenced ? `(${services.length + Number(evidenced)})` : "＋"}</summary>
        <fieldset><legend>Services supported by source evidence · match all selected</legend>
          {availableServices.map(id => <label key={id}><input type="checkbox" checked={services.includes(id)} onChange={() => { setServices(current => current.includes(id) ? current.filter(s => s !== id) : [...current,id]); changeFilters(); }}/>{serviceLabels[id]}</label>)}
        </fieldset>
        <label><input type="checkbox" checked={evidenced} onChange={e => { setEvidenced(e.target.checked); changeFilters(); }}/>Website evidence recorded for charity expertise</label>
        <p>Unlisted services are unconfirmed, not necessarily unavailable. Ask firms about your needs.</p>
      </details><button className="directory-text-button" onClick={nationwide}>Reset to nationwide</button></div>
    </div>
    <div className="directory-results-toolbar"><p aria-live="polite"><strong>{results.length}</strong> {results.length === 1 ? "firm" : "firms"}{origin ? ` · nearest to ${origin.postcode}` : " · across the directory"}{area ? " · within this map area" : ""}</p><button onClick={() => comparison.current?.showModal()}>Shortlist & compare <span>{saved.length}/3</span></button></div>
    <div className="directory-mobile-toggle" role="group" aria-label="Choose results view"><button aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button><button aria-pressed={mode === "map"} onClick={() => setMode("map")}>Map</button></div>
    <div className={`directory-workspace is-${mode}`}>
      <div className="directory-results" ref={list} role="region" aria-label="Accountant results">
        {origin && <p className="directory-distance-note">Straight-line miles from your postcode to each firm’s one listed charity-team office postcode. A different office of the same firm may be nearer. Nearest listed office first; featured status does not override distance.</p>}
        {area && <button className="directory-text-button" onClick={() => { setArea(null); changeFilters(); }}>Clear map area ×</button>}
        {!results.length && <div className="directory-empty"><h2>A little further afield?</h2><p>No firms match these filters. Try a different area or fewer services.</p><button onClick={nationwide}>Show all firms</button></div>}
        {results.slice(0,limit).map(({ firm, distance }) => <article id={`firm-${firm.slug}`} key={firm.slug} className={`directory-result${selected === firm.slug ? " is-active" : ""}${firm.featured ? " is-featured" : ""}`}>
          <div className="directory-result-meta"><span>{firm.featured ? `★ ${firm.placementLabel || "Featured firm"}` : firm.humanReviewed ? "✓ Human-reviewed research" : "ICAEW directory listing"}</span><button aria-label={`${saved.includes(firm.slug) ? "Remove" : "Save"} ${firm.name}${saved.includes(firm.slug) ? " from" : " to"} shortlist`} aria-pressed={saved.includes(firm.slug)} onClick={() => save(firm.slug)}>{saved.includes(firm.slug) ? "Saved ✓" : "Save +"}</button></div>
          <h2><button className="directory-firm-focus" onClick={() => { select(firm.slug); setMode("map"); }}>{firm.name}<span aria-hidden="true">↗</span></button></h2>
          <VerificationBadge firm={firm}/><ExternalRecognition firm={firm}/><p className="directory-result-location">{firm.location} · {firm.postcode}{distance !== null && <strong> · {distance < 0.1 ? "<0.1" : distance.toFixed(1)} miles</strong>}</p>
          <p className="directory-result-evidence">{firm.classification === "Verified" ? "Charity service evidence recorded" : "Charity specialism listed with ICAEW; further checks pending"}</p>
          {firm.contact && <p className="directory-result-contact">{firm.contact}</p>}
          <div className="directory-result-actions"><Link href={firmPath(firm)}>View profile →</Link>{firm.website ? <a href={firm.website} target="_blank" rel="noopener noreferrer">Website ↗</a> : <a href={firm.icaewUrl} target="_blank" rel="noopener noreferrer">ICAEW details ↗</a>}</div>
          {firm.featured && <small>{firm.placementLabel || "Featured placement"} · placement does not change the independent evidence score</small>}
          {firm.humanReviewed && <small>Research reviewed by a human · not an endorsement</small>}
          {!firm.coordinates && <small>Map location awaiting verification</small>}
        </article>)}
        {limit < results.length && <button className="directory-load-more" onClick={() => setLimit(current => current + 10)}>Show 10 more <span>{Math.min(limit,results.length)} of {results.length}</span></button>}
      </div>
      <div className="directory-map-panel"><DirectoryMap firms={mapped} selected={active?.firm.slug || null} origin={origin} view={view} onSelect={slug => select(slug,true)} onMove={setMapBounds}/>
        <div className="directory-map-tools">{mapBounds && <button onClick={() => { setArea(mapBounds); changeFilters(); }}>Search this area</button>}<span>Office postcodes · approximate locations</span></div>
        {active && <div className="directory-map-preview"><button className="directory-preview-close" aria-label="Close firm preview" onClick={() => setSelected(null)}>×</button><small>{active.firm.featured ? active.firm.placementLabel || "Featured firm" : active.firm.humanReviewed ? "Human-reviewed research" : "Explore this firm"}</small><h3>{active.firm.name}</h3><p>{active.firm.location} · {active.firm.postcode}</p><div><Link href={firmPath(active.firm)}>Full profile →</Link><button onClick={() => save(active.firm.slug)}>{saved.includes(active.firm.slug) ? "Remove from shortlist" : "Save to shortlist"}</button></div></div>}
      </div>
    </div>
    <p className="directory-notice" role="status">{notice || "Save up to three firms to compare. Your shortlist stays in this browser tab for this visit."}</p>
    <div className="directory-help"><p>Not sure what accounting help you need?</p><Link href="/ask-sorp/">Ask SORP → <small>Live beta</small></Link><Link href={`${directoryPath}partners/`}>For Accountants & Advisers ↗</Link></div>
    </div>
    <dialog className="directory-comparison" ref={comparison} aria-labelledby="compare-title"><button className="directory-dialog-close" onClick={() => comparison.current?.close()}>Close ×</button><p className="directory-eyebrow">Your shortlist</p><h2 id="compare-title">Find your fit.</h2><p>Compare up to three firms. Confirm services and suitability directly before appointing anyone.</p>
      {!compared.length ? <p>Use “Save +” on any result to start your shortlist.</p> : <div className="directory-compare-grid">{compared.map(f => <article key={f.slug}><h3>{f.name}</h3><VerificationBadge firm={f}/><ExternalRecognition firm={f}/><p>{f.location} · {f.postcode}</p><dl><dt>Charity expertise</dt><dd>{f.classification === "Verified" ? "Website evidence recorded" : "ICAEW specialism; further checks pending"}</dd><dt>Services with evidence</dt><dd>{f.services.length ? f.services.map(s => serviceLabels[s.id]).join(" · ") : "Ask the firm to confirm"}</dd><dt>Named contact</dt><dd>{f.contact || "Not yet verified"}</dd></dl><Link href={firmPath(f)}>Full profile →</Link><button onClick={() => save(f.slug)}>Remove</button></article>)}</div>}
    </dialog>
  </section>
  <section className="directory-width adviser-approach" id="directory-approach" aria-labelledby="approach-title"><p className="directory-eyebrow">How to read the directory</p><h2 id="approach-title">Technology identifies expertise.<br/><em>Human judgement builds trust.</em></h2><div className="adviser-trust-grid"><article><h3>Research with sources</h3><p>We use intelligent research to examine public evidence of charity services, experience, qualifications and specialisms. “Website evidence recorded” means supporting information has been found. “Human-reviewed research” means someone has checked that research.</p></article><article><h3>Verified by My Social Impact</h3><p>This separate badge is reserved for firms whose expertise and credibility have received additional human assessment and explicit editorial approval. A conversation alone does not earn the badge or a higher position.</p></article><article><h3>Independent judgement</h3><p>Human insight helps shape our editorial selections. Search by postcode to see the nearest firms first. Verification cannot be bought; payment does not improve an independent evidence score. Any paid promotion is labelled.</p></article></div></section>
  <section className="directory-width adviser-firm-invitation" aria-labelledby="firms-invitation-title"><div><p className="directory-eyebrow">For accounting firms</p><h2 id="firms-invitation-title">Are you a charity accountant?</h2><p>Already listed? Claim your profile and help us understand your charity-sector expertise. We’d welcome a conversation about your practice, verification and ways to strengthen your profile and visibility.</p><p>Not listed yet? Tell us about your firm so we can consider it for the directory.</p></div><div><Link href={`${directoryPath}partners/`}>Claim your listing / Talk to us ↗</Link><small>Research and editorial judgement guide every listing.</small></div></section>
  <section className="directory-width adviser-other-research" aria-labelledby="other-research-title"><h2 id="other-research-title">Other independent research into charity accountants</h2><p>Charity Finance publishes an annual survey assessing UK charity auditors, including their sector expertise, technical competence and client service.</p><p>Our directory takes a broader approach, helping charities find specialists across bookkeeping, accounts preparation, independent examinations, audits, SORP compliance, taxation and financial advice.</p><p>We encourage charities to consult both resources.</p><a href="https://www.civilsociety.co.uk/finance/charity-audit-survey-2025-the-new-sorp-and-ai-are-shaking-up-the-charity-audit-world.html" target="_blank" rel="noopener noreferrer">Explore the Charity Finance Audit Survey →</a></section>
  <section className="adviser-future"><div className="directory-width"><div><p className="directory-eyebrow">A little further down the line</p><h2>Accountants first.<br/><em>Wider expertise next.</em></h2></div><p>From legal advice to specialist consultancy.<br/>More of the right people, in the same place.<small>Accountants · Here now &nbsp; / &nbsp; Lawyers & other advisers · Future</small></p></div></section>
  </>;
}
