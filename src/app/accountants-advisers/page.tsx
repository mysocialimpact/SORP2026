import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryExplorer } from "@/components/directory/directory-explorer";
import { firms, directoryPath } from "@/lib/accountants";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Find your charity accountant", description: "Explore specialist charity accountants by postcode, compare firms and find support with accounts, SORP, audit and independent examination.", alternates: { canonical: directoryPath } };
export default function DirectoryPage() {
  return <main id="main" className="directory-page">
    <header className="directory-intro directory-width"><nav aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Accountants & Advisers</span></nav>
      <div className="directory-intro-grid"><div><p className="directory-eyebrow">Expertise for the work that matters</p><h1>Find your charity<br/><em>accountant.</em></h1></div><div className="directory-intro-aside"><h2>Good charity accounting deserves specialist expertise.</h2><p>Explore our growing directory of UK accountancy firms with dedicated charity expertise.</p><div className="directory-intro-stat"><strong>{firms.length}</strong><span>firms to explore<br/>one place to start</span></div></div></div>
      <details className="directory-transparency"><summary>About this directory & how we check information</summary><p>We’ve started with ICAEW firms because our founder, Marcus Warry, is himself an ICAEW Chartered Accountant. ICAEW is the Institute of Chartered Accountants in England and Wales, a leading professional accountancy body.</p><p>We haven’t personally met or assessed every firm listed. These firms have been included based on their stated charity specialisms and publicly available information. Our directory will continue to grow.</p><p>The original spreadsheet contains 110 listings, with website evidence recorded for 26. Burton Sweet is an additional researched launch feature. ICAEW inclusion, website evidence and editorial placement are distinct; none is a recommendation or endorsement of this directory by ICAEW.</p><p>Locations mark the supplied office postcode, not an exact entrance. Distances refer to that office; a firm may have other offices or work remotely. Each profile links to its evidence and location source.</p></details>
      <p className="directory-disclosure">We haven’t personally met or assessed every firm listed. Inclusion is based on stated charity specialisms and public information—not a recommendation or endorsement. Our directory will continue to grow.</p>
    </header>
    <div className="directory-width"><DirectoryExplorer firms={firms}/></div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "UK Charity Accountants Directory", url: `${site.origin}${directoryPath}`, description: "An independent directory of UK accountants with stated charity specialisms." }).replace(/</g,"\\u003c") }}/>
  </main>;
}
