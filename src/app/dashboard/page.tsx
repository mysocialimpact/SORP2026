import type { Metadata } from "next";
import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata: Metadata = { title: "My Dashboard", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <main id="main" className="gateway dashboard-page"><div className="gateway-width"><PlatformDashboard /></div></main>;
}
