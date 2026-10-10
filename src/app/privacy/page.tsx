import type { Metadata } from "next";
import { Article } from "@/components/article";
import { site } from "@/lib/site";
export const metadata: Metadata = { title: "Privacy and accessibility", alternates: site.live ? { canonical: '/privacy/' } : undefined };
export default function Privacy() {
  return (
    <Article
      title="A thoughtful, accessible experience."
      eyebrow="PRIVACY & ACCESSIBILITY"
      lead="This first version is a public information website. It does not require an account or collect assessment answers."
    >
      <section>
        <h2>Privacy on this website</h2>
        <p>
          The website code does not set advertising cookies, use analytics
          trackers, or include a contact form or database. Fonts are served with
          the website, so your browser does not need to request them from an
          external font service.
        </p>
        <p>
          Your hosting provider may process ordinary connection data, such as IP
          addresses, request times and browser information, to deliver and
          secure the website. The published privacy notice must be reviewed
          against the final hosting configuration and organisation details
          before launch.
        </p>
        <p>
          Links to My Social Impact and other websites take you to separate
          services with their own privacy policies. Any assessment data is
          handled by the assessment provider, not this information website.
        </p>
      </section>
      <section>
        <h2>Designed for access</h2>
        <p>
          We aim for WCAG 2.2 AA accessibility. The site supports keyboard
          navigation, visible focus, screen-reader landmarks, responsive text
          and reduced motion preferences. This is an aim, not a claim of
          certified conformance.
        </p>
        <p>
          If something is difficult to use, contact My Social Impact through its
          website so the issue can be investigated.
        </p>
      </section>
    </Article>
  );
}
