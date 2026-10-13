import Link from "next/link";
import { AccountControl } from "./account-control";
import { Arrow } from "./ui";
export function Header() {
  return (
    <header className="header gateway-header">
      <div className="gateway-width gateway-header-inner">
        <Link className="gateway-brand-lockup" href="/" aria-label="SORP 2026 home — Reporting for greater impact">
          <span className="gateway-wordmark">
            SORP<span>2026</span>
            <i aria-hidden="true" />
          </span>
          <span className="gateway-tagline">REPORTING FOR GREATER IMPACT</span>
        </Link>
        <nav className="gateway-directory-nav" aria-label="Platform information"><Link href="/our-mission/">Our Mission</Link><Link href="/accountants-advisers/">Find Accountants & Advisers <Arrow diagonal /></Link></nav>
        <AccountControl />
      </div>
    </header>
  );
}
