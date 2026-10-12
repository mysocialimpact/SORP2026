import type { Metadata } from "next";
import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata: Metadata = { title: "My Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ "signed-in"?: string }> }) {
  const params = await searchParams;
  return <main id="main" className="gateway dashboard-page"><div className="gateway-width"><PlatformDashboard signedInCelebration={params["signed-in"] === "1"} /></div></main>;
}
