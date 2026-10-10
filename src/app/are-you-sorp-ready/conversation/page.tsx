import type { Metadata } from "next";
import { SorpPublicReview } from "../../sorp-public-review";

export const metadata: Metadata = {
  title: "Are You SORP Ready? — Your free published-evidence review",
  description: "A free, source-grounded SORP 2026 review of your charity’s published reporting. Clear findings, evidence and priorities. No card or email required.",
};

export default function Page() {
  return <SorpPublicReview />;
}
