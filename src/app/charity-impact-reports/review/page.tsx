import type { Metadata } from "next";
import Link from "next/link";
import { ReportReviewIntake } from "@/components/report-review-intake";

export const metadata: Metadata = { title: "Start a Charity Impact Report review", robots: { index: false, follow: false } };

export default function ReportReviewPage() {
  return <main id="main" className="gateway review-intake-page">
    <div className="gateway-width">
      <nav className="review-back"><Link href="/charity-impact-reports/">← Charity Impact Reports</Link></nav>
      <header className="review-intake-head"><p className="gateway-kicker">Professional human review</p><h1>Let’s make your report <span>work harder.</span></h1><p>Strengths, weaknesses, evidence, clarity and practical opportunities to improve.</p></header>
      <ReportReviewIntake />
    </div>
  </main>;
}
