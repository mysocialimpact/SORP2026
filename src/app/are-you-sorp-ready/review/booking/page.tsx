import type { Metadata } from "next";
import Link from "next/link";
import { SorpReviewBooking } from "../../../sorp-review-booking";
import "../../../sorp-ready.css";

export const metadata: Metadata = { title: "Book a conversation: My Social Impact", description: "Book a free 10-minute conversation, a £50 30-minute session, or a £100 60-minute session with My Social Impact.", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const source = (await searchParams).source;
  const fromAskSorp = source === "ask-sorp";
  const fromContact = source === "contact";
  const backLink = fromAskSorp ? "/ask-sorp/" : fromContact ? "/dashboard/" : "/are-you-sorp-ready/review/";
  const label = fromAskSorp ? "Ask SORP 2026 Anything" : fromContact ? "Talk to Marcus" : "Are You SORP Ready?";
  return <main className="sorp-booking-share-page"><header className="sorp-workspace-brand"><Link href={backLink}><span>My Social Impact</span><strong>{label}</strong></Link></header><Link href={backLink}>← BACK TO {fromAskSorp ? "ASK SORP" : fromContact ? "MY DASHBOARD" : "MY SORP REVIEW"}</Link><SorpReviewBooking shared /></main>;
}
