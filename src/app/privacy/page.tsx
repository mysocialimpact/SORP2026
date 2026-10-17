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
          If you choose “Charities” or “Accountants & Advisers” on the
          homepage, your choice is kept in this browser tab’s session storage.
          It is optional and can be cleared by selecting the same option again.
          When you select an option, we send that choice, the page, time and an
          anonymous identifier for this page visit to our existing usage service.
          This analytics identifier is not saved in browser storage. If you
          later create an account, your choice is saved with your introduction.
          If you use “Let’s talk”,
          we send the email address, message, selected audience and source to
          the existing SORP message service so My Social Impact can respond.
        </p>
        <p>
          Optional booking and payment actions use Google Calendar and Stripe.
          Those providers process the information needed to complete the action
          under their own privacy terms. Links to other websites also take you
          to services with their own privacy policies.
        </p>
        <p>
          Signed-in users can send a question or advice request to Marcus and
          can choose to submit beta feedback. We associate those submissions
          with the user’s account, organisation, account type and the page they
          came from so My Social Impact can respond and improve the right part
          of the service. Only authorised platform administrators can review
          the full records and their internal follow-up notes. If an
          improvement is later published in “You Said. We Did.”, it contains
          only founder-written summaries and never the submitting person’s
          identity or contact details.
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
        <h2>Your conversational introduction</h2>
        <p>“Let’s Get Started” offers an optional conversation alongside an editable form. When conversation assistance is enabled, your answers and the details you provide are sent to our AI provider to organise your introduction. Passwords use separate secure account fields and are never requested by the assistant. You can use the form without AI.</p>
        <p>A necessary, HTTP-only cookie connects your introduction during this visit. Unclaimed server drafts expire after 24 hours and are removed during maintenance or the next new introduction. When you create your account, your introduction, selected charity and voluntarily shared concerns are kept with it so authorised team members can continue a future conversation. Campaign labels and referring website origin are kept separately from how you say you found us; these labels do not prove a referral.</p>
        <p>If you record an answer, your browser asks for microphone permission. Audio is sent to our existing transcription service. This page keeps a failed recording only in memory for retry and discards it after successful transcription or when you leave. We do not create a permanent recording in the onboarding store. The connected transcription provider’s retention arrangements still apply. Avoid sharing confidential client information or sensitive personal details.</p>
        <p>Confirmed charities may share a cached file of public registry information, source links and permitted public documents. This public file is separate from your private conversation and does not grant access to another user’s work or change your subscription. Contact My Social Impact to request access to, correction of or deletion of your introduction.</p>
      </section>
      <section>
        <h2>Charity accountants directory</h2>
        <p>The directory needs no account. Your shortlist is stored only in this browser tab for this visit. A postcode you submit is sent to Postcodes.io to find its approximate location; we do not request your device’s location. OpenStreetMap supplies map tiles and receives ordinary connection information when the map loads. External firm and source links have their own privacy terms.</p>
        <p>Listing claims and professional partner enquiries send your name, email, firm, role and message through our existing SORP message service for My Social Impact to review and respond. Claims do not automatically transfer ownership or change a listing, and enquiries do not subscribe you to marketing or create a payment.</p>
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
