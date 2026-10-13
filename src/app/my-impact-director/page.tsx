import type { Metadata } from "next";
import Image from "next/image";
import { DirectorAssessment } from "@/features/director/assessment";
import { DirectorBooking } from "@/features/director/booking";
import s from "@/features/director/director.module.css";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "My Impact Director | Expert year-round impact support",
  description:
    "Your Impact Director, without the full-time salary. Human-led, year-round support for charities and social enterprises. Start with a free technology, data and AI assessment.",
  ...(site.live ? { alternates: { canonical: "/my-impact-director/" } } : {}),
};
export default function MyImpactDirectorPage() {
  return (
    <main id="main" className={s.page}>
      <section id="director-overview" className={s.hero}>
        <div className={s.heroCopy}>
          <p className={s.kicker}>
            My Impact Director
          </p>
          <h1>
            Your Impact Director.<br />
            <em>Without the<br />full-time salary.</em>
          </h1>
          <p className={s.lead}>
            Greater impact. Accessible to everyone.
          </p>
          <p>
            Expert, outsourced support throughout the year. Helping charities
            and social enterprises measure, manage and improve their impact,
            without employing a full-time director.
          </p>
          <p className={s.heroPrinciple}>
            Because social impact deserves to be taken as seriously as financial performance.
          </p>
          <div className={s.heroActions}>
            <a className={s.primary} href="#assessment">
              Start your free assessment ↗
            </a>
            <a className={s.textLink} href="#director-conversation">
              Talk to an Impact Director →
            </a>
          </div>
          <p className={s.small}>
            Human-led today. AI-enabled. Built around your organisation.
          </p>
        </div>
        <div className={s.cowStage}>
          <span className={s.orbit} aria-hidden="true" />
          <span className={s.sciFi}>
            This is where things
            <br />
            get a bit sci-fi.
          </span>
          <Image
            src="/images/impact-director-cow.webp"
            width={1024}
            height={1536}
            alt="The Ideas Shed’s original pink cyborg cow, holding an ‘I’ll be back’ coffee mug"
            priority
            sizes="(max-width: 700px) 85vw, 42vw"
          />
          <p className={s.cowNote}>
            Don’t panic.
            <br />
            <strong>The humans are still in charge.</strong>
          </p>
        </div>
      </section>
      <DirectorAssessment />
      <section id="director-support" className={s.service}>
        <div className={s.serviceIntro}>
          <p className={s.kicker}>What we can do together, today</p>
          <h2>
            A place in<br />your team.<br /><em>All year round.</em>
          </h2>
          <p>
            Not another impact measurement platform. An affordable member of the senior team.
          </p>
          <p>
            Experienced people working alongside you, turning evidence into
            everyday decisions. Tailored support, whether you need your first
            Impact Director or extra capacity for an existing team.
          </p>
          <a className={s.textLink} href="#director-conversation">
            Find your starting point ↗
          </a>
        </div>
        <ol>
          {[
            [
              "Understand the organisation",
              "Use Social Impact Excellence to understand your maturity, priorities and leadership. Build on existing work and agree what needs to improve.",
            ],
            [
              "Review the Data Pillar",
              "Review the Data Pillar: how evidence is collected, stored, connected and used. Spreadsheets, databases and software included.",
            ],
            [
              "Improve what’s useful",
              "Simplify processes, connect tools or recommend alternatives where justified. We’re independent of impact measurement platforms; a new platform isn’t automatically the answer.",
            ],
            [
              "Make impact part of management",
              "Bring evidence into leadership conversations, decisions and regular improvement. Put learning to work, not just into a report.",
            ],
            [
              "Keep the momentum",
              "Work alongside experienced professionals throughout the year on priorities, measurement, reporting and continuous improvement. Useful automation and AI support the people, not the other way round.",
            ],
          ].map(([title, text], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section id="director-measurement" className={s.measurement}>
        <p className={s.kicker}>A small question with very big consequences</p>
        <p className={s.saying}>
          “What gets measured
          <br />
          gets managed.”
        </p>
        <p className={s.attribution}>
          Often associated with Peter Drucker, though the attribution is
          uncertain. W. Edwards Deming warned against managing only what can be
          measured: important things can resist easy quantification.
        </p>
        <h2>
          But are we measuring
          <br />
          <em>what really matters?</em>
        </h2>
        <p>
          Impact is a management discipline. Evidence should help us understand,
          decide and improve, not simply give us more numbers to report.
        </p>
      </section>
      <section id="director-future" className={s.future}>
        <div>
          <p className={s.kicker}>
            The next chapter · possibilities, not promises
          </p>
          <h2>
            Less “ask AI”.
            <br />
            <em>
              More “work
              <br />
              with AI”.
            </em>
          </h2>
          <p>
            AI is beginning to do more than answer questions. Agents can use
            tools, investigate information, plan work and carry out tasks within
            agreed limits.
          </p>
          <p>
            In time, that could let experienced professionals support more
            organisations, while intelligent systems handle more routine work.
            Human judgement and accountability stay at the centre.
          </p>
        </div>
        <div className={s.futureSheet}>
          <span className={s.stamp}>
            HUMAN
            <br />
            OVERSIGHT
            <br />
            BUILT IN
          </span>
          <h3>
            A future working day
            <br />
            might include…
          </h3>
          <ul>
            <li>Reviewing incoming impact evidence</li>
            <li>Spotting emerging patterns and gaps</li>
            <li>Connecting approved systems</li>
            <li>Preparing leadership updates</li>
            <li>Monitoring priorities and following up actions</li>
            <li>Recommending practical improvements</li>
          </ul>
          <p>
            <strong>Today:</strong> human-led, AI-enabled.
            <br />
            <strong>Tomorrow:</strong> increasingly agentic, with human judgement and accountability.
          </p>
          <p className={s.small}>
            These agentic workflows are a development direction, not features
            this assessment activates. Access, limits and human approval must be
            agreed first.
          </p>
        </div>
      </section>
      <section id="director-partners" className={s.partners}>
        <p className={s.kicker}>Complementary expertise</p>
        <h2>
          Human intelligence meets<br /><em>artificial intelligence.</em>
        </h2>
        <div className={s.partnerGrid}>
          <article>
            <a className={s.partnerLogo} href="https://www.mysocialimpact.org/" aria-label="Visit My Social Impact">
            <Image
              src="/brand/my-social-impact.png"
              width={280}
              height={90}
              sizes="240px"
              alt="My Social Impact"
            />
            </a>
            <h3>Impact expertise</h3>
            <p>
              Social Impact Excellence methodology, strategy, measurement and
              management.
            </p>
          </article>
          <article>
            <a className={s.partnerLogo} href="https://www.theideasshed.com/" aria-label="Visit The Ideas Shed">
            <Image
              src="/brand/the-ideas-shed.png"
              width={180}
              height={130}
              sizes="180px"
              alt="The Ideas Shed"
            />
            </a>
            <h3>Intelligent possibilities</h3>
            <p>
              AI agents, creative thinking, software development and intelligent
              digital systems.
            </p>
          </article>
          <article>
            <a className={s.partnerLogo} href="https://www.fluiditconsulting.co.uk/" aria-label="Visit Fluid">
              <Image
                src="https://www.fluiditconsulting.co.uk/wp-content/uploads/2025/06/Group-160.png"
                alt="Fluid"
                width={240}
                height={90}
                unoptimized
              />
            </a>
            <h3>Systems that connect</h3>
            <p>
              A My Social Impact collaborator bringing IT consultancy, systems
              integration and digital transformation expertise.
            </p>
            <p className={s.small}>
              Fluid’s involvement is agreed for each engagement, rather than
              assumed across the whole service.
            </p>
          </article>
        </div>
      </section>
      <DirectorBooking />
      <section id="director-ambition" className={s.closing}>
        <p className={s.kicker}>The point isn’t clever technology.</p>
        <h2>
          Unlocking the full
          <br />
          <em>impact potential</em>
          <br />
          of every organisation.
        </h2>
        <p>
          More accessible expertise. Better-informed decisions. More charities
          and businesses making a greater positive difference to social and
          environmental problems.
        </p>
        <div className={s.closingActions}>
          <a className={s.primary} href="#assessment">Start your free assessment ↗</a>
          <a className={s.textLink} href="#director-conversation">Talk to an Impact Director →</a>
        </div>
      </section>
    </main>
  );
}
