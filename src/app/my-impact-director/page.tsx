import type { Metadata } from "next";
import Image from "next/image";
import { FolderHero } from "@/components/folder-hero";
import { ToolLink } from "@/components/tool-link";
import { DirectorToolsLink } from "@/features/director/tools-link";
import { DirectorBooking } from "@/features/director/booking";
import { site } from "@/lib/site";
import s from "./director-landing.module.css";

export const metadata: Metadata = {
  title: "My Impact Director | Human-led, AI-powered impact support",
  description: "Your Impact Director, without the full-time salary. Experienced people and intelligent technology helping your organisation measure, manage and improve its impact all year round.",
  ...(site.live ? { alternates: { canonical: "/my-impact-director/" } } : {}),
};
function Arrow() { return <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 16 16 4M4 4h12v12" stroke="currentColor" strokeWidth="1.5" /></svg>; }
const assessment = "/my-impact-director/workspace/#assessment";
const contact = "mailto:marcus@mysocialimpact.org?subject=My%20Impact%20Director%20%E2%80%94%20ongoing%20support";
const plans = [
  { name: "Free", price: "£0", detail: "Initial assessments, practical insights and available free-beta tools." },
  { name: "Essentials", price: "£49", detail: "Digital guidance, recommendations and impact priorities." },
  { name: "Supported", price: "£149", detail: "Digital tools with periodic human review." },
  { name: "Director", price: "£495", detail: "Your ongoing human adviser. Strategic guidance and practical support, with scope agreed.", featured: true },
  { name: "Bespoke", price: "£1,500+", detail: "Deeper senior involvement, board support and specialist projects." },
];

export default function MyImpactDirectorPage() {
  return <main id="main" className={s.page}>
    <FolderHero product="my-impact-director" paper="#faf9f6" id="director-overview" className={s.hero}>
      <div className={s.heroInner}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>My Impact Director · Human-led. AI-powered.</p>
          <h1>Your Impact Director.<br /><span>Without the<br />full-time salary.</span></h1>
          <p className={s.lead}>Experienced, ongoing support to measure, manage and improve your social impact.</p>
          <p className={s.heroPromise}>Real people. Powerful AI. More affordable than you might think.</p>
          <div className={s.actions}>
            <ToolLink className={s.primary} href={assessment}>Explore Our Free AI Assessment <Arrow /></ToolLink>
            <a className={s.textLink} href="#director-pricing">See Our Monthly Support <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <figure className={s.heroPortrait}>
          <Image src="/images/marcus-editorial.webp" width={640} height={857} alt="Marcus Warry, Chartered Accountant and co-founder of My Social Impact" loading="eager" sizes="(max-width: 700px) 90vw, (max-width: 1100px) 42vw, 460px" />
          <figcaption><strong>Marcus Warry ACA</strong><span>Co-founder, My Social Impact</span></figcaption>
        </figure>
      </div>
    </FolderHero>

    <section id="assessment" className={s.assessment} aria-labelledby="ai-readiness-title">
      <div className={s.assessmentInner}>
        <div><p className={s.eyebrow}>Your first step · Free public beta</p><h2 id="ai-readiness-title">How AI-ready is<br />your organisation?</h2></div>
        <div><p>Explore technology, data and AI through 21 questions. Discover practical opportunities in your personalised snapshot.</p>
          <ToolLink className={s.primary} href={assessment}>Check Your AI Readiness — Free <span aria-hidden="true">→</span></ToolLink>
          <p className={s.small}>Free account for one charity. Save your progress. This is AI readiness, not SORP compliance.</p>
        </div>
      </div>
    </section>

    <section className={`${s.section} ${s.expertise}`} aria-labelledby="director-expertise">
      <div className={s.sectionHeading}><h2 id="director-expertise">Good technology.<br />Real people.</h2><p>AI does the heavy lifting. People help you make the right decisions.</p></div>
      <div className={s.expertiseGrid}>
        <article><span className={s.roleLabel}>Powered by AI</span><h3>Less routine work.</h3><ul><li>Research and analyse evidence.</li><li>Prepare reports and insights.</li></ul></article>
        <article><span className={s.roleLabel}>Led by people</span><h3>More useful judgement.</h3><ul><li>Challenge assumptions and solve problems.</li><li>Turn insight into action.</li></ul></article>
      </div>
      <p className={s.technologyNote}>Automated monitoring and connected workflows are in development.</p>
    </section>

    <section id="director-support" className={`${s.section} ${s.service}`} aria-labelledby="director-service-title">
      <div><p className={s.eyebrow}>An affordable member of your senior team</p><h2 id="director-service-title">A place in your team.<br />All year round.</h2></div>
      <div><p>Someone who knows your organisation and helps you keep making progress.</p><ul><li>Regular leadership conversations and KPI reviews.</li><li>Strategy, evidence and progress updates.</li><li>Management and board input, by agreement.</li></ul></div>
    </section>

    <section id="director-pricing" className={s.pricing} aria-labelledby="director-pricing-title">
      <div className={s.pricingInner}>
        <div className={s.pricingIntro}><h2 id="director-pricing-title">Real expertise.<br /><span>Without the<br />full-time cost.</span></h2><p>Indicative monthly pricing. We’ll agree the right level of involvement for your organisation.</p><a className={s.lightAction} href={contact}>Let’s Talk About Your Organisation <Arrow /></a></div>
        <ol className={s.plans} aria-label="Indicative monthly support options">
          {plans.map((plan, index) => <li key={plan.name} className={plan.featured ? s.featuredPlan : undefined}>
            <div><h3>{plan.name}</h3><p>{plan.detail}</p></div>
            <div className={s.price}>{index > 0 && <small>from</small>}<strong>{plan.price}</strong>{index > 0 && <span>/month</span>}</div>
          </li>)}
        </ol>
      </div>
    </section>

    <section id="director-marcus" className={`${s.section} ${s.marcus}`} aria-labelledby="director-marcus-title">
      <div className={s.marcusGrid}>
        <Image className={s.marcusPortrait} src="/images/marcus-editorial.webp" alt="Marcus Warry" width={640} height={857} sizes="(max-width: 700px) 80vw, 340px" />
        <div><p className={s.eyebrow}>Someone in your corner.</p><h2 id="director-marcus-title">Marcus Warry ACA<span>Co-founder, My Social Impact</span></h2><p className={s.credentials}>Chartered Accountant · Social Impact Consultant</p>
          <blockquote>“Social impact deserves the same attention as financial performance. We help turn good intentions into action — with someone experienced in your corner.”</blockquote>
          <p className={s.small}>Support from Marcus and other experienced professionals, by agreement.</p>
          <a className={s.primary} href={contact}>Talk to Marcus <Arrow /></a><a className={s.email} href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>
        </div>
      </div>
      <DirectorBooking panelOnly />
    </section>

    <section id="director-ambition" className={s.closing} aria-labelledby="director-vision-title">
      <div><h2 id="director-vision-title">Expert impact management.<br /><span>Accessible to everyone.</span></h2><p>Start with the free tools. When you’re ready, let’s talk about going further.</p></div>
      <div className={s.closingActions}><DirectorToolsLink className={s.primary} /><a className={s.textLink} href={contact}>Talk to Marcus <Arrow /></a><a className={s.specialistLink} href="https://www.myimpactdirector.com/">More about the specialist service <Arrow /></a></div>
    </section>
  </main>;
}
