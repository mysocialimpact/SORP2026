import Link from "next/link";
import { site } from "@/lib/site";
import { Arrow } from "./ui";
export function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-top">
          <div>
            <Link className="wordmark" href="/">
              SORP
              <span className="wordmark-year">
                2026
                <span className="brand-star" aria-hidden="true">
                  ✳
                </span>
              </span>
            </Link>
            <p>Better reporting. Greater impact.</p>
          </div>
          <div className="footer-links">
            <Link href="/understanding-sorp">Understanding SORP</Link>
            <Link href="/#tools">Our tools</Link>
            <Link href="/#resources">Official resources</Link>
            <Link href="/about">About us</Link>
          </div>
          <a className="footer-msi" href={site.msi}>
            Brought to you by
            <br />
            <strong>
              My Social Impact <Arrow diagonal />
            </strong>
          </a>
        </div>
        <div className="disclaimer">
          <span className="tiny-label">INDEPENDENT BY DESIGN</span>
          <p>
            Independent guidance from My Social Impact. This website is not
            affiliated with or endorsed by the SORP-making body or charity
            regulators. AI-supported tools can make mistakes and do not replace
            the official SORP or professional judgement.
          </p>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} My Social Impact</span>
          <Link href="/privacy">Privacy & accessibility</Link>
          <a href={site.studio ?? "/about#studio"}>
            Built by <span>The Ideas Shed</span> <Arrow diagonal />
          </a>
        </div>
      </div>
    </footer>
  );
}
