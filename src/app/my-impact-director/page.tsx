import type { Metadata } from "next";
import Image from "next/image";
import { DirectorAssessment } from "@/features/director/assessment";
import { DirectorBooking } from "@/features/director/booking";
import s from "@/features/director/director.module.css";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "My Impact Director — human expertise, intelligent possibilities",
  description:
    "Making expert impact management affordable. Try a free digital, data and AI readiness snapshot with practical recommendations and a personalised conversation agenda.",
  ...(site.live ? { alternates: { canonical: "/my-impact-director/" } } : {}),
};
export default function MyImpactDirectorPage() {
  return (
    <main id="main" className={s.page}>
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <p className={s.kicker}>
            My Impact Director · Human-led. AI-enabled.
          </p>
          <h1>
            What if every
            <br />
            organisation had
            <br />
            <em>an Impact Director?</em>
          </h1>
          <p className={s.lead}>
            Expert impact management.
            <br />
            Within reach. Not out of budget.
          </p>
          <p>
            Experienced people, smarter systems and Social Impact Excellence. An
            affordable member of your senior team—not another measurement
            platform.
          </p>
          <div className={s.heroActions}>
            <a className={s.primary} href="#assessment">
              Meet Your Impact Director ↗
            </a>
            <a className={s.textLink} href="#director-conversation">
              Talk to a human →
            </a>
          </div>
          <p className={s.small}>
            Start with your free readiness snapshot. No commitment. No robot
            takeover.
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
      <div className={s.ribbon}>
        <span>Human judgement.</span>
        <span>Intelligent tools.</span>
        <span>Greater impact.</span>
      </div>
      <section className={s.manifesto}>
        <p className={s.kicker}>
          A serious ambition. A different way of getting there.
        </p>
        <h2>
          Big impact thinking.
          <br />
          <em>Not just for big organisations.</em>
        </h2>
        <div>
          <p>
            Smaller charities and social enterprises rarely have room in the
            budget for a dedicated Impact Director. Larger teams may have the
            expertise, but not enough hours.
          </p>
          <p>
            We’re making that capability more accessible: experienced
            professionals working with you, supported by useful technology.
            Human-led today. Built to grow with increasingly capable AI.
          </p>
        </div>
      </section>
      <DirectorAssessment />
      <section id="director-support" className={s.service}>
        <div className={s.serviceIntro}>
          <p className={s.kicker}>What we can do together, today</p>
          <h2>
            Less wrestling
            <br />
            with systems.
            <br />
            <em>
              More making
              <br />a difference.
            </em>
          </h2>
          <p>
            Support shaped around your organisation—not a technical installation
            you have to configure.
          </p>
          <a className={s.textLink} href="#director-conversation">
            Find your starting point ↗
          </a>
        </div>
        <ol>
          {[
            [
              "Understand the organisation",
              "Use Social Impact Excellence diagnostics to explore maturity, priorities and leadership. Your existing work is the starting point—not something to throw away.",
            ],
            [
              "Follow the information",
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
              "Ongoing human Impact Director support, increasingly helped by automation, intelligent workflows and AI agents as capabilities develop.",
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
      <section className={s.measurement}>
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
          decide and improve—not simply give us more numbers to report.
        </p>
      </section>
      <section className={s.future}>
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
            organisations—without removing human judgement or accountability.
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
            <strong>Tomorrow:</strong> increasingly agentic.
          </p>
          <p className={s.small}>
            These agentic workflows are a development direction, not features
            this assessment activates. Access, limits and human approval must be
            agreed first.
          </p>
        </div>
      </section>
      <section className={s.partners}>
        <p className={s.kicker}>Good chemistry. Real people.</p>
        <h2>
          Expertise meets
          <br />
          <em>possibility.</em>
        </h2>
        <div className={s.partnerGrid}>
          <article>
            <Image
              src="/brand/my-social-impact.png"
              width={280}
              height={90}
              sizes="240px"
              alt="My Social Impact"
            />
            <h3>Impact expertise</h3>
            <p>
              Social Impact Excellence methodology, strategy, measurement and
              management.
            </p>
          </article>
          <article>
            <Image
              src="/brand/the-ideas-shed.png"
              width={180}
              height={130}
              sizes="180px"
              alt="The Ideas Shed"
            />
            <h3>Intelligent possibilities</h3>
            <p>
              AI agents, creative thinking, software development and intelligent
              digital systems.
            </p>
          </article>
          <article>
            <p className={s.partnerName}>Fluid IT</p>
            <h3>Systems that connect</h3>
            <p>
              A My Social Impact collaborator bringing IT consultancy, systems
              integration and digital transformation expertise.
            </p>
            <p className={s.small}>
              Involvement in a particular engagement is agreed separately; this
              is not a claim of a fully operational joint service.
            </p>
          </article>
        </div>
      </section>
      <DirectorBooking />
      <section className={s.closing}>
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
        <a className={s.primary} href="#assessment">
          Meet Your Impact Director ↗
        </a>
      </section>
    </main>
  );
}
