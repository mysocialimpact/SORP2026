import type { Metadata } from "next";
import Link from "next/link";
import { PartnerEnquiry } from "@/components/directory/partner-enquiry";
import { directoryPath } from "@/lib/accountants";
export const metadata: Metadata = { title: "Professional partners — Accountants & Advisers", alternates: { canonical: `${directoryPath}partners/` } };
export default function PartnersPage() {
  return <main id="main" className="directory-page"><div className="directory-width directory-partners"><Link href={directoryPath}>← Back to the directory</Link><p className="directory-eyebrow">For Accountants & Advisers</p><h1>Your expertise.<br/><em>Greater visibility.</em></h1><p className="directory-lead">Help more charities find the specialist support they need.</p><div className="directory-partner-grid"><div><h2>Listed free. Built for the future.</h2><p>Every firm is initially listed free. We’re developing an optional professional partner offer, proposed at £39 per month.</p><ul><li>Clearly labelled featured placements</li><li>Enhanced profiles that explain your charity expertise</li><li>Access to future SORP 2026 professional tools</li><li>Greater visibility and potential qualified enquiries</li></ul><p>These are planned benefits, not an active subscription. Expressing interest creates no charge or commitment. Paid placement will be labelled and will not constitute a recommendation.</p><Link href="/for-advisers/">Explore our existing adviser resources →</Link></div><section><h2>Start a conversation.</h2><PartnerEnquiry/></section></div></div></main>;
}
