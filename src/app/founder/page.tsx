import type { Metadata } from "next";
import { protectFounderPage } from "@/lib/founder/auth";
import { FounderCentre } from "@/components/founder/founder-centre";
import "./founder.css";

export const metadata: Metadata = { title: "Founder Control Centre", robots: { index: false, follow: false } };

export default async function FounderPage() {
  await protectFounderPage();
  return <main id="main" className="founder-page"><FounderCentre /></main>;
}
