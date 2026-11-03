import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DemoRequest } from "@/components/demo-request";
import "../sample-charity/sample-charity.css";
import { MsiBrand, IdeasBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";
import { SupportingBreadcrumb } from "@/components/supporting-breadcrumb";
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to Marcus Warry at My Social Impact about SORP readiness and creating greater social impact.",
  ...(site.live ? { alternates: { canonical: "/contact/" } } : {}),
};
export default function Contact() {
  return (
    <main id="main" className="gateway gateway-contact">
      <div className="gateway-width">
        <SupportingBreadcrumb current="Contact" />
        <section className="gateway-contact-hero">
          <div>
            <p className="gateway-kicker">
              A real person. A useful conversation.
            </p>
            <h1>
              Let’s talk
              <br />
              <span>impact.</span>
            </h1>
            <p>
              A question about the tools, your reporting or what comes next? Get
              in touch with Marcus.
            </p>
            <a
              className="gateway-email"
              href="mailto:marcus@mysocialimpact.org"
            >
              marcus@mysocialimpact.org <Arrow diagonal />
            </a>
            <div className="gateway-contact-caption">
              <strong>Marcus Warry ACA</strong>
              <span>
                Chartered Accountant & social impact consultant
                <br />
                Co-founder, My Social Impact
              </span>
            </div>
          </div>
          <Image
            className="gateway-contact-portrait"
            src="/images/marcus-outdoor-original.jpg"
            alt="Marcus Warry, co-founder of My Social Impact"
            width={480}
            height={520}
            priority
            sizes="(max-width: 700px) 90vw, 420px"
          />
        </section>
        <section className="contact-demonstration" aria-labelledby="contact-demo-heading">
          <p className="gateway-kicker">Explore at your own pace</p>
          <h2 id="contact-demo-heading">A little context. A clearer picture.</h2>
          <p>Meet Harbourlight Neighbours, a fictional charity created for our demonstration. Follow its example readiness review, reporting and impact journey without creating an account.</p>
          <Link href="/sample-charity/">See SORP 2026 in action →</Link>
        </section>
        <details className="contact-demo-option"><summary>Request a free personal demo →</summary><DemoRequest compact /></details>
        <section
          className="gateway-organisations"
          aria-label="The organisations behind the tools"
        >
          <div>
            <MsiBrand attribution="The thinking behind the tools" />
            <p>
              My Social Impact develops approaches and tools that help charities
              and other organisations improve their social impact.
            </p>
          </div>
          <div>
            <IdeasBrand />
            <p>
              The Ideas Shed builds imaginative, practical technology and tools
              that help turn those ideas into reality.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
