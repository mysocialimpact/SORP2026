import Image from "next/image";
import "./sorp-marcus.css";

type MarcusPresentation = "intro" | "methodology" | "booking";

export function SorpMarcus({ variant }: { variant: MarcusPresentation }) {
  const heading = variant === "intro" ? "BUILT BY PEOPLE WHO WORK WITH CHARITIES"
    : variant === "booking" ? "YOU’LL BE MEETING MARCUS"
    : "THE PEOPLE BEHIND THE METHOD";

  return <section className={`scr-marcus scr-marcus--${variant}`} aria-label={heading}>
    <div className="scr-marcus-portrait">
      <Image src="/images/marcus-warry-msi.webp" alt="Marcus Warry, co-founder of My Social Impact" width={1122} height={1402} />
    </div>
    <div className="scr-marcus-copy">
      <h2 className="scr-marcus-eyebrow">{heading}</h2>
      <p className="scr-marcus-name">Marcus Warry <span>ACA</span></p>
      <p className="scr-marcus-role">Co-founder, My Social Impact</p>
      {variant === "intro" && <blockquote className="scr-marcus-message">“We built Are You SORP Ready? to help charities understand what SORP 2026 means in practice, and use it as an opportunity to improve impact, not just reporting.”</blockquote>}
      {variant === "methodology" && <p className="scr-marcus-message">A defined methodology. Professional judgement. Human accountability.</p>}
      {variant === "booking" && <p className="scr-marcus-message">Marcus works with charities on impact strategy, evidence, reporting and making impact information useful throughout the year.</p>}
    </div>
  </section>;
}
