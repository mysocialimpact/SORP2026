import type { Metadata } from "next";
import { Article } from "@/components/article";
import { Button } from "@/components/ui";
import { pillars, site } from "@/lib/site";
import { People } from "@/components/people";
export const metadata: Metadata = {
  title: "The thinking behind SORP 2026",
  alternates: site.live ? { canonical: "/about/" } : undefined,
};
export default function About() {
  return (
    <Article
      title="Purpose behind the platform."
      eyebrow="BROUGHT TO YOU BY MY SOCIAL IMPACT"
      lead="A shared ambition to help charities meet their reporting obligations — and think more deeply about the difference they make."
    >
      <section>
        <h2>My Social Impact</h2>
        <p>“Compliance is the starting point. Impact is the destination.”</p>
        <p>
          My Social Impact is a boutique social impact consultancy, co-founded
          by Marcus Warry and Dr Chris Arnold. The team brings together finance,
          strategy, brand and communications to help organisations understand,
          improve and communicate the difference they make.
        </p>
        <People />
        <p>
          The readiness review is developed by Marcus Warry ACA, combining
          accounting and social impact expertise. Our AI-supported tools sit
          within that human-led approach.
        </p>
        <Button href={`${site.msi}/#team`}>
          Meet the wider My Social Impact team
        </Button>
      </section>
      <section>
        <h2>Social Impact Excellence</h2>
        <p>
          The wider framework brings together five connected areas. These are an
          approach to improving impact, not additional SORP accounting
          requirements.
        </p>
        <ol>
          {pillars.map((p) => (
            <li key={p.number}>
              <strong>{p.title}.</strong> {p.text}
            </li>
          ))}
        </ol>
        {site.platform && (
          <Button href={site.platform}>Explore the platform</Button>
        )}
      </section>
      <section id="studio">
        <h2>Built by The Ideas Shed</h2>
        <p>
          The Ideas Shed is a creative venture studio that turns promising ideas
          into practical projects, tools and businesses. It is the build partner
          for this SORP 2026 website.
        </p>
        {site.studio && (
          <Button href={site.studio}>Visit The Ideas Shed</Button>
        )}
      </section>
      <section>
        <h2>Independent, transparent guidance</h2>
        <p>
          This is not an official regulatory website. Neither the platform nor
          its AI-supported tools are endorsed by the SORP-making body or charity
          regulators. Our tools support thinking and preparation; the official
          standard and appropriate professional advice remain essential.
        </p>
        <p>
          Biographies and photographs are drawn from the{" "}
          <a href={`${site.msi}/#team`}>My Social Impact team page</a>, checked
          on 10 October 2026.
        </p>
      </section>
    </Article>
  );
}
