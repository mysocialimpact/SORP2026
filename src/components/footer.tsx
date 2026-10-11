import { site } from "@/lib/site";
import { IdeasBrand, MsiBrand } from "./brand";
import { Arrow } from "./ui";
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
        <div className="gateway-footer-intro">
          <p className="gateway-kicker">Ideas made useful</p>
          <h2>Greater impact takes expertise, curiosity and creativity.</h2>
        </div>
        <div className="gateway-footer-partnership">
          <div className="gateway-footer-msi">
            <MsiBrand attribution="Developed by" />
            <p>Practical tools and human expertise for organisations determined to make a greater difference.</p>
          </div>
          <span className="gateway-footer-plus" aria-hidden="true">+</span>
          <div className="gateway-footer-shed">
            <IdeasBrand />
            <blockquote>Imagine a world where curiosity and creativity were valued as highly as certainty.</blockquote>
            <a className="gateway-footer-shed-link" href={site.studio!}>
              See what else is in the Shed! <Arrow diagonal />
            </a>
            <p className="gateway-company-details">
              <a href={site.studio!}>The Ideas Shed Limited</a>
              <span>Registered in England and Wales · Company number 17380053</span>
            </p>
          </div>
        </div>
        <div className="gateway-footer-record">
          <p>© {new Date().getFullYear()} My Social Impact</p>
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
