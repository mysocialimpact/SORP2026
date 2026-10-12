import type { Metadata } from "next";
import { Article } from "@/components/article";
import { site } from "@/lib/site";
export const metadata: Metadata = { title: "Privacy and accessibility", alternates: site.live ? { canonical: '/privacy/' } : undefined };
export default function Privacy() {
  return (
    <Article
      title="A thoughtful, accessible experience."
      eyebrow="PRIVACY & ACCESSIBILITY"
      lead="The public information pages need no account. Are You SORP Ready stores your work in your browser and uses the details you choose to provide to deliver its assessment and report."
    >
      <section>
        <h2>Privacy on this website</h2>
        <p>
          The website does not set advertising cookies or include advertising
          trackers. Fonts are served with the website, so your browser does not
          need to request them from an external font service.
        </p>
        <p>
          Are You SORP Ready saves assessment progress and results in your
          browser so you can continue your work. If you create an account or
          sign in, the service sends the account details and saved progress you
          provide to its secure account service. If you request an emailed
          report, it sends the email address, organisation details and report
          content needed to create and deliver that report.
        </p>
        <p>
          If you choose “I work in a charity” or “I advise charities” on the
          homepage, your choice is kept in this browser tab’s session storage.
          It is optional, is not sent to our analytics service, and can be
          cleared by selecting the same option again. The current “Say hello”
          form preview does not submit or save anything you type or subscribe
          you to updates. You can contact us using the separate email link.
        </p>
        <p>
          Optional booking and payment actions use Google Calendar and Stripe.
          Those providers process the information needed to complete the action
          under their own privacy terms. Links to other websites also take you
          to services with their own privacy policies.
        </p>
        <p>
          The hosting provider and connected services may process ordinary
          connection data, such as IP addresses, request times and browser
          information, to deliver and secure the service. My Social Impact uses
          assessment and contact information only to provide the requested
          product, save progress, deliver reports, respond to support requests
          and provide optional services you select.
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
