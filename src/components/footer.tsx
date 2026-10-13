import { site } from "@/lib/site";
import { IdeasBrand, MsiBrand } from "./brand";
import { Arrow } from "./ui";
import Link from "next/link";
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
        <div className="gateway-footer-partnership">
          <div className="gateway-footer-msi">
            <MsiBrand attribution="Developed by" />
          </div>
          <div className="gateway-footer-shed">
            <IdeasBrand />
            <a className="gateway-footer-shed-link" href={site.studio!}>
              See what else is in the Shed <Arrow />
            </a>
            <p className="gateway-company-details">
              <a href={site.studio!}>The Ideas Shed Limited</a>
              <span>Registered in England and Wales · Company number 17380053</span>
            </p>
          </div>
        </div>
        <div className="gateway-footer-record">
          <p>© {new Date().getFullYear()} My Social Impact</p>
          <Link href="/privacy/">Privacy &amp; accessibility</Link>
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
