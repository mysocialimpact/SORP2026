import Link from "next/link";
import { site } from "@/lib/site";
import { IdeasBrand, MsiBrand } from "./brand";
export function Footer() {
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
            <Link href="/privacy/">Privacy & accessibility</Link>
            <Link href="/contact/">Contact</Link>
            <span>© {new Date().getFullYear()} My Social Impact</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
