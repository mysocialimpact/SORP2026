import type { Metadata } from "next";
import Link from "next/link";
import { IdeasBrand, MsiBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our Mission",
  description: "How the SORP2026 social enterprise makes useful technology and expertise more accessible to charities.",
  ...(site.live ? { alternates: { canonical: "/our-mission/" } } : {}),
};

const principles = [
  ["Free digital tools", "Wherever that is sustainable."],
  ["Affordable expertise", "When thoughtful human involvement is needed."],
  ["Voluntary contributions", "Helping us maintain and develop free services."],
  ["Technology with purpose", "Reducing cost, improving access and increasing impact."],
];

export default function OurMissionPage() {
  return <main id="main" className="gateway gateway-mission">
    <section className="gateway-width mission-hero" aria-labelledby="mission-title">
      <p className="gateway-kicker">Our mission</p>
      <h1 id="mission-title">Technology should make doing good easier. <span>Not more expensive.</span></h1>
      <p>We’re passionate about using technology, AI and human expertise to help charities and other organisations achieve more—particularly smaller charities that might otherwise be excluded by cost.</p>
    </section>

    <section className="mission-principle" aria-labelledby="principle-title">
      <div className="gateway-width">
        <p className="gateway-kicker">Our guiding principle</p>
        <h2 id="principle-title">Free wherever possible. Affordable where we need to charge. <em>Always focused on greater impact.</em></h2>
      </div>
    </section>

    <section className="gateway-width mission-model" aria-labelledby="model-title">
      <header>
        <p className="gateway-kicker">How it works</p>
        <h2 id="model-title">A social enterprise built for access.</h2>
        <p>Professional-quality tools should not be reserved for organisations with the largest budgets. Our model combines useful technology with human expertise where it adds most value.</p>
      </header>
      <div className="mission-principles">
        {principles.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
    </section>

    <section className="gateway-width mission-partners" aria-labelledby="partners-title">
      <div>
        <p className="gateway-kicker">Accountants and advisers</p>
        <h2 id="partners-title">Already working with an accountant or adviser? <span>Brilliant.</span></h2>
      </div>
      <div>
        <p>Our tools are designed to work alongside your existing advisers, not replace them. And if you need specialist support with impact and sustainability reporting, we’re here to help.</p>
        <p>We want professional advisers to use SORP2026 with their charity clients: a practical shared starting point for clearer reporting and greater impact.</p>
        <Link className="gateway-quiet-link" href="/for-advisers/">For accountants and advisers <Arrow /></Link>
      </div>
    </section>

    <section className="mission-makers">
      <div className="gateway-width mission-makers-inner">
        <div><MsiBrand attribution="Developed by" /><p>My Social Impact develops practical approaches and tools that help organisations understand, demonstrate and improve their social impact.</p></div>
        <div><IdeasBrand /><p>The Ideas Shed turns those ideas into imaginative, useful and accessible technology.</p></div>
      </div>
    </section>
  </main>;
}
