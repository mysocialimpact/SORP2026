import Link from "next/link";
import { ReportReviewIntake } from "@/components/report-review-intake";
export default function HumanReviewUploads() {
  return <main id="main" className="gateway review-intake-page"><div className="gateway-width"><Link href="/charity-impact-reports/review/">← Automated report reviews</Link><header className="review-intake-head"><h1>Your human-review uploads.</h1><p>Your existing files and review requests remain here.</p></header><ReportReviewIntake/></div></main>;
}
