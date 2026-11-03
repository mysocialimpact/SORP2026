import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SayHello } from "@/components/say-hello";
import { site } from "@/lib/site";
import { SupportingBreadcrumb } from "@/components/supporting-breadcrumb";
import { Arrow } from "@/components/ui";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Talk to Marcus Warry at My Social Impact about SORP readiness and creating greater social impact.",
  ...(site.live ? { alternates: { canonical: "/contact/" } } : {}),
};

const locations = [
  { city: "Somerset, UK", place: "The Offices", lines: ["10 Marketplace", "Shepton Mallet", "Somerset BA4 5AZ"] },
  { city: "London, UK", place: "PopHub Leicester Square", lines: ["Floors 1 & 2, 41 Whitcomb Street", "London WC2H 7DT"] },
  { city: "Kampala, Uganda", place: "The Wild Ones", lines: ["Tank Hill Road", "Muyenga, Kampala"] },
];

export default function Contact() {
  return <main id="main" className="gateway contact-page">
    <div className="gateway-width">
      <SupportingBreadcrumb current="Contact Us" />
      <div className="contact-main">
        <section className="contact-introduction" aria-labelledby="contact-title">
          <p className="gateway-kicker">A real person. A useful conversation.</p>
          <h1 id="contact-title">Let’s talk <em>impact.</em></h1>
          <p className="contact-lead">A question about SORP 2026, our tools or what comes next? I’d love to hear from you.</p>
          <div className="contact-person">
            <Image src="/images/marcus-outdoor-original.jpg" alt="Marcus Warry smiling outdoors" width={144} height={176} priority sizes="(max-width: 800px) 104px, 144px" />
            <div><h2>Marcus Warry ACA</h2><p>Chartered Accountant<br />Social Impact Consultant</p><p>Co-founder, My Social Impact</p></div>
          </div>
          <a className="contact-email" href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org <Arrow diagonal /></a>
          <p className="contact-self-guided">Prefer a quick look first? <Link href="/sample-charity/">Explore our fictional charity demo →</Link><span>No account needed.</span></p>
        </section>
        <SayHello embedded />
      </div>
      <section className="contact-locations" aria-labelledby="locations-title">
        <header><h2 id="locations-title">Where we work.</h2><p>Our working bases, in the UK and Uganda.<br />Please get in touch before planning a visit.</p></header>
        <div className="contact-location-grid">{locations.map((location, index) => <article key={location.city}>
          <span className="contact-location-number" aria-hidden="true">0{index + 1}</span>
          <h3>{location.city}</h3>
          <address><strong>{location.place}</strong>{location.lines.map(line => <span key={line}>{line}</span>)}</address>
        </article>)}</div>
      </section>
    </div>
  </main>;
}
