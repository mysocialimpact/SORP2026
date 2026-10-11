import Link from "next/link";
import { site } from "@/lib/site";
import { IdeasBrand, MsiBrand } from "./brand";
export function Footer() {
  const builtAt = process.env.NEXT_PUBLIC_SITE_BUILT_AT!;
  const buildDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(builtAt));
  const buildTime = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(new Date(builtAt));
  return (
    <footer className="footer gateway-footer">
      <div className="gateway-width">
        <div className="gateway-footer-brands">
          <MsiBrand attribution="Developed by" />
          <IdeasBrand />
        </div>
        <div className="gateway-footer-bottom">
          <p>
            Independent tools. Not affiliated with the SORP-making body or
            regulators.
            <br />
            AI-supported guidance does not replace the{" "}
            <a href={site.official}>official SORP</a> or professional judgement.
          </p>
          <div>
            <Link href="/our-mission/">Our mission</Link>
            <Link href="/privacy/">Privacy & accessibility</Link>
            <Link href="/contact/">Contact</Link>
            <span>© {new Date().getFullYear()} My Social Impact</span>
          </div>
        </div>
        <div className="gateway-footer-record">
          <p className="gateway-company-details">
            <a href={site.studio!}>The Ideas Shed Limited</a>
            <span>
              Registered in England and Wales · Company number 17380053
            </span>
          </p>
          <p className="gateway-build" aria-label="Website build information">
            <strong>Build {process.env.NEXT_PUBLIC_SITE_BUILD_NUMBER}</strong>
            {" · "}
            <time dateTime={builtAt}>
              {buildDate} · {buildTime}
            </time>
          </p>
        </div>
      </div>
    </footer>
  );
}
