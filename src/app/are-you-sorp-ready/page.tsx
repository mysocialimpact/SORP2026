import type { Metadata } from "next";
import { SorpReadyPage } from "../sorp-ready";
import "../sorp-ready.css";
import "../sorp-landing.css";

export const metadata: Metadata = {
  title: "Are You SORP Ready?",
  description: "A free SORP 2026 impact-readiness tool for charities from My Social Impact.",
};

export default function Page() {
  return <SorpReadyPage />;
}
