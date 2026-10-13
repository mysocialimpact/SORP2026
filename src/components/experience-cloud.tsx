"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./experience-cloud.css";

const organisations = [
  "ActionAid", "STOP THE TRAFFIK", "Great Ormond Street Hospital", "Blue Cross", "Farm Africa",
  "CARE International", "Friends of the Earth", "Greenpeace", "Interim Spaces",
  "Traidcraft", "Forum for the Future", "RSPB", "RSPCA", "National Asthma Campaign",
  "St John Ambulance", "Family Planning Association", "International Planned Parenthood Federation",
  "Médecins Sans Frontières", "Brook", "National AIDS Trust", "Stroke Association",
  "Royal National Institute for Deaf People", "British Deaf Association", "National Deaf Children’s Society",
  "YMCA", "Ideas Foundation", "Campaign for Nuclear Disarmament", "Comic Relief", "Alcohol Concern",
  "Dyslexia Institute", "Dyslexia Action", "Xtraordinary People", "Action for ME",
  "Royal Hospital for Neuro-disability", "National Blood Service", "Age Concern", "Age UK",
  "Action for Kids", "Sing London", "GASP", "Joint Council for the Welfare of Immigrants",
  "London Community Arts", "Crouch End Festival", "South Asian Arts Festival", "CIDA",
  "Hackney Council", "Westminster Council", "The Learning Trust", "Greenwich", "Docklands Light Railway",
  "National Union of Students", "Haringey Council", "Diageo", "Starbucks", "Sainsbury’s",
  "Brewers Decorating Centres", "Responsible drinking programmes", "Community engagement programmes",
  "AgriEvolve", "Ashima", "Tonight Change", "The Wild Ones Kampala",
];

const featured = [
  ["ActionAid", "Hackney Council", "Starbucks", "Great Ormond Street Hospital", "RSPB", "Comic Relief"],
  ["Greenpeace", "Diageo", "CARE International", "Westminster Council", "RSPCA", "Blue Cross"],
  ["Médecins Sans Frontières", "Sainsbury’s", "STOP THE TRAFFIK", "Docklands Light Railway", "Haringey Council"],
];
const featuredNames = new Set(featured.flat());
const remaining = organisations.filter(name => !featuredNames.has(name));
const rows = featured.map((names, row) => [...names, ...remaining.filter((_, i) => i % 3 === row)]);
const logos: Record<string, string> = { Greenpeace: "/experience/greenpeace.svg", Starbucks: "/experience/starbucks.svg" };

function ExperienceRow({ names, index, paused }: { names: string[]; index: number; paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const interacting = useRef(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let position = element.scrollLeft;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(element);
    const tick = (time: number) => {
      if (previous && visible && !document.hidden && !paused && !reduced.matches && !interacting.current) {
        position += Math.min(time - previous, 40) * (index === 1 ? .012 : .016);
        const group = element.firstElementChild as HTMLElement;
        if (position >= group.offsetWidth) position -= group.offsetWidth;
        element.scrollLeft = position;
      } else position = element.scrollLeft;
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [paused, index]);
  return <div ref={ref} className="experience-lane" tabIndex={0} role="region" aria-label={`Organisation collection ${index + 1}; scroll to explore`}
    onPointerEnter={() => { interacting.current = true; }} onPointerLeave={() => { interacting.current = false; }}
    onTouchStart={() => { interacting.current = true; }} onFocus={() => { interacting.current = true; }} onBlur={() => { interacting.current = false; }}>
    {[0, 1].map(copy => <div className="experience-lane-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
      {names.map((name, i) => <span key={name} className={`experience-tile ${featuredNames.has(name) ? "is-featured" : ""} ${logos[name] ? "has-logo" : ""} tone-${(i + index) % 4}`}
        style={{ "--reveal-delay": `${logos[name] ? -35 : -((i * 7 + index * 11) % 43)}s` } as CSSProperties}>
        <span className="experience-tile-name">{name}</span>
        {logos[name] && <span className="experience-logo" aria-hidden="true"><img src={logos[name]} alt="" width={180} height={70} /></span>}
      </span>)}
    </div>)}
  </div>;
}

export function ExperienceCloud() {
  const [paused, setPaused] = useState(false);
  return (
    <section className="experience-cloud experience-landscape" data-paused={paused} aria-labelledby="experience-title">
      <div className="gateway-width experience-cloud-head">
        <p className="gateway-kicker">Collective experience · charities · communities · campaigns</p>
        <h2 id="experience-title">Experience across our team</h2>
        <p>Organisation names reflect work and experience across our team; they are not presented as endorsements of this platform.</p>
      </div>
      <div className="gateway-width experience-controls">
        <p>Charities. Councils. Communities. Global brands.</p>
        <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Resume movement" : "Pause movement"}</button>
      </div>
      <div className="experience-landscape-stage">
        {rows.map((names, index) => <ExperienceRow key={index} names={names} index={index} paused={paused} />)}
      </div>
      <div className="gateway-width experience-explore">
        <span className="experience-swipe">Swipe or scroll to explore ↔</span>
        <details onToggle={event => { if (event.currentTarget.open) setPaused(true); }}>
          <summary>Explore all organisations <span>{organisations.length} names +</span></summary>
          <ul>{organisations.map(name => <li key={name}>{name}</li>)}</ul>
        </details>
      </div>
    </section>
  );
}

