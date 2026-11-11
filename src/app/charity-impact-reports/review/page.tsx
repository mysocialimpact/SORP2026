import type { Metadata } from "next";
import Link from "next/link";
import { ImpactReportReview } from "@/components/impact-report-review";

export const metadata: Metadata = { title: "Start a Charity Impact Report review", robots: { index: false, follow: false } };

export default function ReportReviewPage() {
  return <main id="main" className="gateway review-intake-page">
    <div className="gateway-width">
      <nav className="review-back"><Link href="/charity-impact-reports/">← Charity Impact Reports</Link></nav>
      <header className="review-intake-head"><p className="gateway-kicker">Your free preliminary review</p><h1>Make your impact <span>clearer.</span></h1><p>Find your report. Confirm the document. Explore its claims and evidence through two My Social Impact frameworks.</p></header>
      <ImpactReportReview />
      <p><Link href="/charity-impact-reports/review/human/">View existing human-review uploads and requests →</Link></p>
    </div>
  </main>;
}
