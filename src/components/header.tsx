"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountControl } from "./account-control";
import { Arrow } from "./ui";
import { InstallApp } from "./install-app";
export function Header() {
  const pathname = usePathname();
  const founderMode = pathname === "/founder" || pathname.startsWith("/founder/");
  const invitationMode = pathname.startsWith("/invitation/");
  if (founderMode) return <header className="header gateway-header founder-mode-header">
    <div className="gateway-width gateway-header-inner">
      <Link className="gateway-brand-lockup" href="/founder/#home" aria-label="SORP 2026 Founder Control Centre">
        <span className="gateway-wordmark">SORP<span>2026</span><i aria-hidden="true" /></span>
        <span className="gateway-tagline founder-control-title">FOUNDER CONTROL CENTRE</span>
      </Link>
      <Link className="founder-customer-link" href="/dashboard/?mode=customer">View My Dashboard <Arrow diagonal /></Link>
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
          <Link href="#say-hello">Talk to Us <Arrow diagonal /></Link>
        </nav>
        <InstallApp />
        <AccountControl />
      </div>
    </header>
  );
}
