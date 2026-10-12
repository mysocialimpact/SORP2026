"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { directoryPath, firmPath, normalisePostcode, selectFirms, serviceLabels, type Bounds, type Firm, type Point, type Service } from "@/lib/accountants";
import type { MapView } from "./directory-map";
const DirectoryMap = dynamic(() => import("./directory-map"), { ssr: false, loading: () => <div className="directory-map-loading">Opening your UK map…</div> });
const storageKey = "sorp2026.accountant-shortlist";

export function DirectoryExplorer({ firms }: { firms: Firm[] }) {
  const [query, setQuery] = useState("");
  const [postcode, setPostcode] = useState("");
  const [origin, setOrigin] = useState<(Point & { postcode: string; area: string }) | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [evidenced, setEvidenced] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [mode, setMode] = useState("list");
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
    if (!value) { setPostcodeError("Enter a full UK postcode, such as BS1 4DJ."); setBusy(false); return; }
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setPostcodeError("");
    try {
      const response = await fetch(`/api/directory/postcode/?q=${encodeURIComponent(value)}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Postcode search is unavailable.");
      setOrigin(data); setPostcode(data.postcode); setArea(null); setSelected(null); setLimit(10);
      setView(current => ({ point: data, revision: current.revision + 1 }));
    } catch (error) { if (!controller.signal.aborted) setPostcodeError(error instanceof Error ? error.message : "Please try again."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function nationwide() {
    request.current?.abort(); setBusy(false); setOrigin(null); setPostcode(""); setArea(null); setQuery(""); setServices([]); setEvidenced(false); setSelected(null); setLimit(10); setPostcodeError("");
    setView(current => ({ nationwide: true, revision: current.revision + 1 }));
  }

  return <section className="directory-app" aria-label="Find and compare charity accountants">
    <div className="directory-search">
      <div className="directory-scope"><span aria-hidden="true">✓</span> ICAEW firms with specialist charity offerings <small>Directory specialism, not an endorsement</small></div>
      <div className="directory-search-fields">
        <form onSubmit={findNearby} className="directory-postcode-form">
          <label htmlFor="directory-postcode">Find specialists near you</label>
          <div><input id="directory-postcode" name="postcode" autoComplete="postal-code" maxLength={10} placeholder="Enter your UK postcode" value={postcode} onChange={e => setPostcode(e.target.value)} aria-describedby={postcodeError ? "directory-postcode-error" : undefined} aria-invalid={!!postcodeError}/><button disabled={busy} type="submit">{busy ? "Finding…" : "Find nearby →"}</button></div>
        </form>
        <label className="directory-name-search" htmlFor="directory-name">Or search by name or town<input id="directory-name" type="search" placeholder="Firm, town or postcode…" value={query} onChange={e => { setQuery(e.target.value); changeFilters(); }}/></label>
      </div>
      {postcodeError && <p id="directory-postcode-error" role="alert" className="directory-error">{postcodeError}</p>}
      <div className="directory-filter-row"><details className="directory-filters"><summary>Services & evidence {services.length || evidenced ? `(${services.length + Number(evidenced)})` : "＋"}</summary>
        <fieldset><legend>Services supported by source evidence · match all selected</legend>
          {availableServices.map(id => <label key={id}><input type="checkbox" checked={services.includes(id)} onChange={() => { setServices(current => current.includes(id) ? current.filter(s => s !== id) : [...current,id]); changeFilters(); }}/>{serviceLabels[id]}</label>)}
        </fieldset>
        <label><input type="checkbox" checked={evidenced} onChange={e => { setEvidenced(e.target.checked); changeFilters(); }}/>Website evidence recorded for charity expertise</label>
        <p>Unlisted services are unconfirmed, not necessarily unavailable. Ask firms about your needs.</p>
      </details><button className="directory-text-button" onClick={nationwide}>Reset to nationwide</button></div>
    </div>
    <div className="directory-results-toolbar"><p aria-live="polite"><strong>{results.length}</strong> {results.length === 1 ? "firm" : "firms"}{origin ? ` · nearest to ${origin.postcode}` : " · across the directory"}{area ? " · within this map area" : ""}</p><button onClick={() => comparison.current?.showModal()}>Shortlist & compare <span>{saved.length}/3</span></button></div>
    <div className="directory-mobile-toggle" aria-label="Choose results view"><button aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button><button aria-pressed={mode === "map"} onClick={() => setMode("map")}>Map</button></div>
    <div className={`directory-workspace is-${mode}`}>
      <div className="directory-results" ref={list} aria-label="Accountant results">
        {origin && <p className="directory-distance-note">Straight-line miles from postcode centres. Nearest first; featured status does not override distance.</p>}
        {area && <button className="directory-text-button" onClick={() => { setArea(null); changeFilters(); }}>Clear map area ×</button>}
        {!results.length && <div className="directory-empty"><h2>A little further afield?</h2><p>No firms match these filters. Try a different area or fewer services.</p><button onClick={nationwide}>Show all firms</button></div>}
        {results.slice(0,limit).map(({ firm, distance }) => <article id={`firm-${firm.slug}`} key={firm.slug} className={`directory-result${selected === firm.slug ? " is-active" : ""}${firm.featured ? " is-featured" : ""}`}>
          <div className="directory-result-meta"><span>{firm.featured ? "★ Featured firm" : "ICAEW directory listing"}</span><button aria-label={`${saved.includes(firm.slug) ? "Remove" : "Save"} ${firm.name}${saved.includes(firm.slug) ? " from" : " to"} shortlist`} aria-pressed={saved.includes(firm.slug)} onClick={() => save(firm.slug)}>{saved.includes(firm.slug) ? "Saved ✓" : "Save +"}</button></div>
          <h2><button className="directory-firm-focus" onClick={() => { select(firm.slug); setMode("map"); }}>{firm.name}<span aria-hidden="true">↗</span></button></h2>
          <p className="directory-result-location">{firm.location} · {firm.postcode}{distance !== null && <strong> · {distance < 0.1 ? "<0.1" : distance.toFixed(1)} miles</strong>}</p>
          <p className="directory-result-evidence">{firm.classification === "Verified" ? "Charity service evidence recorded" : "Charity specialism listed with ICAEW; further checks pending"}</p>
          {firm.contact && <p className="directory-result-contact">{firm.contact}</p>}
          <div className="directory-result-actions"><Link href={firmPath(firm)}>View profile →</Link>{firm.website ? <a href={firm.website} target="_blank" rel="noopener noreferrer">Website ↗</a> : <a href={firm.icaewUrl} target="_blank" rel="noopener noreferrer">ICAEW details ↗</a>}</div>
          {firm.featured && <small>Editorial launch feature · not a paid placement</small>}
          {!firm.coordinates && <small>Map location awaiting verification</small>}
        </article>)}
        {limit < results.length && <button className="directory-load-more" onClick={() => setLimit(current => current + 10)}>Show 10 more <span>{Math.min(limit,results.length)} of {results.length}</span></button>}
      </div>
      <div className="directory-map-panel"><DirectoryMap firms={mapped} selected={active?.firm.slug || null} origin={origin} view={view} onSelect={slug => select(slug,true)} onMove={setMapBounds}/>
        <div className="directory-map-tools">{mapBounds && <button onClick={() => { setArea(mapBounds); changeFilters(); }}>Search this area</button>}<span>Office postcodes · approximate locations</span></div>
        {active && <div className="directory-map-preview"><button className="directory-preview-close" aria-label="Close firm preview" onClick={() => setSelected(null)}>×</button><small>{active.firm.featured ? "Featured firm · editorial" : "Explore this firm"}</small><h3>{active.firm.name}</h3><p>{active.firm.location} · {active.firm.postcode}</p><div><Link href={firmPath(active.firm)}>Full profile →</Link><button onClick={() => save(active.firm.slug)}>{saved.includes(active.firm.slug) ? "Remove from shortlist" : "Save to shortlist"}</button></div></div>}
      </div>
    </div>
    <p className="directory-notice" role="status">{notice || "Save up to three firms to compare. Your shortlist stays in this browser tab for this visit."}</p>
    <div className="directory-help"><p>Not sure what accounting help you need?</p><Link href="/ask-sorp/">Ask SORP → <small>Coming soon</small></Link><Link href={`${directoryPath}partners/`}>For Accountants & Advisers ↗</Link></div>
    <dialog className="directory-comparison" ref={comparison} aria-labelledby="compare-title"><button className="directory-dialog-close" onClick={() => comparison.current?.close()}>Close ×</button><p className="directory-eyebrow">Your shortlist</p><h2 id="compare-title">Find your fit.</h2><p>Compare up to three firms. Confirm services and suitability directly before appointing anyone.</p>
      {!compared.length ? <p>Use “Save +” on any result to start your shortlist.</p> : <div className="directory-compare-grid">{compared.map(f => <article key={f.slug}><h3>{f.name}</h3><p>{f.location} · {f.postcode}</p><dl><dt>Charity expertise</dt><dd>{f.classification === "Verified" ? "Website evidence recorded" : "ICAEW specialism; further checks pending"}</dd><dt>Services with evidence</dt><dd>{f.services.length ? f.services.map(s => serviceLabels[s.id]).join(" · ") : "Ask the firm to confirm"}</dd><dt>Named contact</dt><dd>{f.contact || "Not yet verified"}</dd></dl><Link href={firmPath(f)}>Full profile →</Link><button onClick={() => save(f.slug)}>Remove</button></article>)}</div>}
    </dialog>
  </section>;
}
