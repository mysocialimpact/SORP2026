import Link from "next/link";
import type { Firm } from "@/lib/accountants";
import { VerificationBadge } from "./verification-badge";

// Editorial choices, not paid partners. External firms are not silently added
// to the verified/geocoded directory or given invented office coordinates.
const spotlights = [
  { name: "Burton Sweet", place: "Flax Bourton · Bristol", initials: "BS", theme: "burton", href: "/accountants-advisers/burton-sweet/", copy: "Specialist support for charities and civil society, from accounts and scrutiny to trustee advice." },
  { name: "ECOVIS Wingrave Yeats", place: "Soho · London", initials: "EWY", theme: "ecovis", href: "https://www.ecovis.co.uk/", copy: "London expertise with an international network in accounting, audit, tax and advice." },
  { name: "Moore Kingston Smith", place: "London · Nationwide", initials: "MKS", theme: "moore", href: "https://mooreks.co.uk/sectors/nonprofit/charities/", copy: "Nonprofit specialists supporting organisations with assurance, advice and change." },
  { name: "Forvis Mazars", place: "UK-wide", initials: "FM", theme: "mazars", href: "https://www.forvismazars.com/uk/en/industries/public-social-sector/charities", copy: "National reach across audit, assurance, tax and advisory." },
  { name: "Lanham & Francis", place: "Yeovil & Sherborne", initials: "L&F", theme: "lanham", href: "https://www.lanhamandfrancis.co.uk/", copy: "Local relationships across Somerset and Dorset." },
];

export function DirectorySpotlight({ firms }: { firms: Firm[] }) {
  const burton = firms.find(firm => firm.slug === "burton-sweet");
  return <section className="adviser-spotlight" aria-labelledby="spotlight-title"><div className="directory-width">
    <header><div><p className="directory-eyebrow">In the spotlight · Firms to explore</p><h2 id="spotlight-title">Good with numbers.<br/><em>Better with people.</em></h2></div><p>A little more about the people behind the practice.<small>Explore our editorial selections. Any paid promotion is labelled; check suitability directly.</small><a href="#directory">Go straight to the directory & map ↗</a></p></header>
    <div className="adviser-feature-grid">{spotlights.filter(firm => firm.theme !== "burton" || burton?.featured).map((firm, index) => <article key={firm.name} className={`adviser-feature ${firm.theme}`}>
      <span className="adviser-feature-label">0{index + 1} · {firm.theme === "burton" ? burton?.placementLabel || "Editorial spotlight" : "Editorial spotlight"}</span>
      {index === 0 ? <div className="adviser-type-art" aria-hidden="true">People.<br/>Purpose.<br/><em>Perspective.</em><svg viewBox="0 0 64 64" fill="none"><path d="M10 54 54 10M10 10h44v44" stroke="currentColor" strokeWidth="4"/></svg></div> : <span className="adviser-monogram" aria-hidden="true">{firm.initials}</span>}
      <div className="adviser-feature-copy"><p className="adviser-place">{firm.place}</p><h3>{firm.name}</h3>{firm.theme === "burton" && burton && <VerificationBadge firm={burton}/>}<p>{firm.copy}</p></div>
      {index === 0 ? <Link href={firm.href}>Explore profile ↗</Link> : <a href={firm.href} target="_blank" rel="noopener noreferrer">Meet the firm ↗ <span className="sr-only">on its website (opens in a new tab)</span></a>}
    </article>)}</div>
    <p className="adviser-commercial">Explore the evidence, compare the services and ask about experience with charities like yours.</p>
  </div></section>;
}
