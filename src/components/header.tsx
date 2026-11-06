"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountControl } from "./account-control";
import { Arrow } from "./ui";
import { InstallApp } from "./install-app";
export function Header() {
  const pathname = usePathname();
  const founderMode = pathname === "/founder" || pathname.startsWith("/founder/");
  const growthMode = pathname.startsWith("/founder/growth");
  const invitationMode = pathname.startsWith("/invitation/");
  if (founderMode) return <header className="header gateway-header founder-mode-header">
    <div className="gateway-width gateway-header-inner">
      <Link className="gateway-brand-lockup" href="/founder/#home" aria-label="SORP 2026 Founder Control Centre">
        <span className="gateway-wordmark">SORP<span>2026</span><i aria-hidden="true" /></span>
        <span className="gateway-tagline founder-control-title">{growthMode ? "MARKETING & SALES" : "FOUNDER CONTROL CENTRE"}</span>
      </Link>
      <div className="founder-header-actions">
        <Link className="founder-customer-link" href="/dashboard/?mode=customer">View My Dashboard <Arrow diagonal /></Link>
        <details key={pathname} className="founder-workspace-switch">
          <summary>Workspaces</summary>
          <nav aria-label="Founder workspaces">
            <Link href="/founder/#home" aria-current={!growthMode ? "page" : undefined}>Founder Control Centre</Link>
            <Link href="/adviser/?workspace=my-social-impact">My Social Impact — Adviser</Link>
            <Link href="/founder/growth/" aria-current={growthMode ? "page" : undefined}>Marketing & Sales</Link>
            <Link href="/" target="_blank" rel="noopener">View Public Website ↗</Link>
            <small>For the first-time visitor journey, open sorp2026.org in a private browser window. A new tab shares this sign-in.</small>
          </nav>
        </details>
      </div>
    </div>
  </header>;
  if (invitationMode) return <header className="header gateway-header invitation-header">
    <div className="gateway-width gateway-header-inner">
      <Link className="gateway-brand-lockup" href="/" aria-label="SORP 2026 home">
        <span className="gateway-wordmark">SORP<span>2026</span><i aria-hidden="true" /></span>
        <span className="gateway-tagline">YOUR INVITATION</span>
      </Link>
    </div>
  </header>;
  return (
    <header className="header gateway-header">
      <div className="gateway-width gateway-header-inner">
        <Link className="gateway-brand-lockup" href="/" aria-label="SORP 2026 home: Reporting for greater impact">
          <span className="gateway-wordmark">
            SORP<span>2026</span>
            <i aria-hidden="true" />
          </span>
          <span className="gateway-tagline">REPORTING FOR GREATER IMPACT</span>
        </Link>
        <nav className="gateway-directory-nav" aria-label="Platform information">
          <Link href="/our-mission/">Our Mission <Arrow diagonal /></Link>
          <Link href="/accountants-advisers/">Find Accountants <Arrow diagonal /></Link>
          <Link href="/contact/">Contact Us <Arrow diagonal /></Link>
        </nav>
        <InstallApp />
        <AccountControl />
      </div>
    </header>
  );
}
