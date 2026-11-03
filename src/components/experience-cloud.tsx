"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "./experience-crawl.css";

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

const colours = [[35, 77, 59], [173, 57, 32], [112, 80, 139], [48, 81, 109]];
const slots = 12;
export function ExperienceCloud() {
  const stage = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const firstName = useRef(0);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    update(); motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    let frame = 0, previous = 0, visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(root);
    const render = (time: number) => {
      if (previous && visible && !paused && !reduced && !document.hidden) progress.current += Math.min(time - previous, 40) / 72000;
      previous = time;
      const height = root.clientHeight;
      const mobile = root.clientWidth < 700;
      const pitch = (height - 64) / slots;
      Array.from(root.children).forEach((node, i) => {
        const item = node as HTMLElement;
        const journey = progress.current + i / slots;
        const distance = journey % 1;
        const cycle = Math.floor(journey);
        const index = ((firstName.current - i + cycle * slots) % organisations.length + organisations.length) % organisations.length;
        const name = organisations[index];
        const near = 1 - distance;
        const scale = (mobile ? .58 : .5) + (mobile ? .42 : .5) * Math.pow(near, 1.4);
        const y = 32 + near * (height - 64);
        const colour = colours[index % colours.length];
        const blend = Math.pow(near, .7);
        item.textContent = name;
        item.style.transform = `translate(-50%, -50%) translateY(${y}px) scale(${scale})`;
        item.style.color = `rgb(${colour.map((channel, c) => Math.round([112,117,112][c] * (1-blend) + channel * blend)).join(",")})`;
        item.style.opacity = String(Math.min(1, distance * slots * 3, (1-distance) * slots * 3) * (.8 + .2 * near));
        const baseSize = mobile ? (name.length > 26 ? 17 : name.length > 16 ? 20 : 30) : (name.length > 36 ? 30 : 40);
        item.style.fontSize = `${Math.max(baseSize, (mobile ? 14 : 18) / scale)}px`;
        item.style.maxHeight = `${pitch - 4}px`;
      });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [paused, reduced]);
  function explore(index: number) {
    firstName.current = index;
    progress.current = .04;
    setSelected(index);
    setPaused(true);
  }
  return <section className="experience-cloud experience-crawl" id="home-experience" aria-labelledby="experience-title">
    <div className="gateway-width crawl-heading">
      <div><p className="gateway-kicker">Different perspectives. Shared experience.</p>
      <h2 id="experience-title">Experience across our team</h2>
      <p className="crawl-introduction">A world of organisations. A wealth of experience to draw on.</p></div>
      <div className="crawl-controls">
        <button type="button" onClick={() => { if (reduced) return; setPaused(value => !value); }} aria-pressed={paused || reduced} disabled={reduced}>{reduced ? "Motion reduced" : paused ? "Resume movement" : "Pause movement"}</button>
        <a href="#experience-collection" onClick={() => setPaused(true)}>Explore the names ↓</a>
      </div>
    </div>
    <div className="crawl-frame">
      <div className="crawl-plane" aria-hidden="true" />
      <div className="crawl-space" ref={stage} aria-hidden="true">
        {Array.from({length: slots}, (_, i) => <span className="crawl-name" key={i} style={{ top: 0, transform: `translate(-50%, -50%) translateY(${32 + (1-i/slots)*576}px) scale(${.64+.36*(1-i/slots)**2})` }}>{organisations[(slots-i)%slots]}</span>)}
      </div>
    </div>
    <div className="gateway-width crawl-explore" id="experience-collection">
      {selected !== null && <p className="crawl-selected" aria-live="polite">{organisations[selected]}</p>}
      <details open={reduced || undefined} onToggle={event => { if (event.currentTarget.open) setPaused(true); }}>
        <summary>Explore all {organisations.length} organisations <span>+</span></summary>
        <p>Historical experience across our team; no endorsement of SORP2026 is implied.</p>
        <ul>{organisations.map((name, i) => <li key={name}><button type="button" onClick={() => explore(i)}>{name}{name === "Greenpeace" && <Image src="/experience/greenpeace.svg" alt="" width={90} height={30} />}{name === "Starbucks" && <Image src="/experience/starbucks.svg" alt="" width={35} height={35} />}</button></li>)}</ul>
      </details>
    </div>
  </section>;
}

