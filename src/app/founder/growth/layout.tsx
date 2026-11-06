import type { Metadata } from "next";
import Link from "next/link";
import { protectFounderPage } from "@/lib/founder/auth";
import { channels, growthPath } from "@/lib/growth/model";
import "../founder.css";
import "./growth.css";

export const metadata: Metadata = { title: "Marketing & Sales · Founder", robots: { index:false,follow:false } };

export default async function GrowthLayout({ children }: { children: React.ReactNode }) {
  await protectFounderPage();
  return <main id="main" className="founder-page growth-page"><div className="founder-shell">
    <nav className="growth-navigation" aria-label="Marketing and sales">
      <Link href={growthPath}>Growth overview</Link>
      {channels.map(channel => <Link key={channel.key} href={`${growthPath}${channel.key}/`}>{channel.title}</Link>)}
    </nav>
    {children}
  </div></main>;
}
