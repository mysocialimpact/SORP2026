import type { Metadata } from "next";
import { DirectoryExplorer } from "@/components/directory/directory-explorer";
import { DirectorySpotlight } from "@/components/directory/directory-spotlight";
import { firms, directoryPath } from "@/lib/accountants";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Find your charity accountant", description: "Explore specialist charity accountants by postcode, compare firms and find support with accounts, SORP, audit and independent examination.", alternates: { canonical: directoryPath } };
export default function DirectoryPage() {
  return <main id="main" className="directory-page adviser-directory">
    <DirectoryExplorer firms={firms} spotlight={<DirectorySpotlight/>}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "UK Charity Accountants Directory", url: `${site.origin}${directoryPath}`, description: "An independent directory of UK accountants with stated charity specialisms." }).replace(/</g,"\\u003c") }}/>
  </main>;
}
