import type { Metadata } from "next";
import { SorpWorkspace } from "../../sorp-workspace";
import "../../sorp-ready.css";

export const metadata: Metadata = {
  title: "Your SORP Ready Result",
  description: "Review your My Social Impact SORP 2026 impact-readiness result.",
};

export default function Page() {
  return <SorpWorkspace view="results" />;
}
