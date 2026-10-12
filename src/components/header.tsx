import Link from "next/link";
import { AccountControl } from "./account-control";
export function Header() {
  return (
    <header className="header gateway-header">
      <div className="gateway-width gateway-header-inner">
        <Link className="gateway-brand-lockup" href="/" aria-label="SORP 2026 home — Reporting for greater impact">
          <span className="gateway-wordmark">
            SORP<span>2026</span>
            <i aria-hidden="true" />
          </span>
          <span className="gateway-tagline">Reporting for greater impact.</span>
        </Link>
        <AccountControl />
      </div>
    </header>
  );
}
