import type { Metadata } from "next";
import { SorpCandidateReview } from "../../sorp-candidate-review";
import "../../sorp-ready.css";

export const metadata: Metadata = {
  title: "Are You SORP Ready? — Published reporting review",
  description: "Review your charity's latest published Trustees' Annual Report and accounts against the impact-reporting aspects of SORP 2026.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SorpCandidateReview />;
}
