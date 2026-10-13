import { site } from "@/lib/site";
import { IdeasBrand, MsiBrand } from "./brand";
import { Arrow } from "./ui";
import Link from "next/link";
import Image from "next/image";
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
          <section className="gateway-footer-msi" aria-labelledby="footer-msi-title">
            <MsiBrand attribution="Developed by" />
            <h2 id="footer-msi-title">Strategy for Social Impact Excellence.</h2>
            <a className="gateway-footer-partner-link" href={site.msi} target="_blank" rel="noopener noreferrer">
              See what else we do <Arrow />
            </a>
          </section>
          <section className="gateway-footer-shed" aria-labelledby="footer-shed-title">
            <div className="gateway-footer-shed-copy">
              <IdeasBrand eager />
              <h2 id="footer-shed-title">Ideas, technology and a little mischief.</h2>
              <a className="gateway-footer-shed-link" href={site.studio!} target="_blank" rel="noopener noreferrer">
                See what else is in the Shed <Arrow />
              </a>
            </div>
            <Image className="gateway-footer-cow" src="/images/impact-director-cow.webp" alt="Cowminator, The Ideas Shed’s pink cyborg cow" width={900} height={1350} sizes="(max-width: 600px) 150px, 220px" loading="eager" />
          </section>
        </div>
        <div className="gateway-footer-record">
          <p>© {new Date().getFullYear()} My Social Impact</p>
          <Link href="/privacy/">Privacy &amp; accessibility</Link>
          <p>The Ideas Shed Limited · Company 17380053</p>
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
