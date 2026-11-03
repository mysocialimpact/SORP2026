"use client";

import { useEffect, useRef, useState } from "react";
import "./experience-orbit.css";

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

const colours = ["#faf9f6", "#d8ff52", "#f0a7c1", "#c8dbed"];
const slots = 6;
export function ExperienceCloud() {
  const stage = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(0);
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
      if (previous && visible && !paused && !reduced && !document.hidden) angle.current += Math.min(time - previous, 40) * .000055;
      previous = time;
      const width = root.clientWidth;
      Array.from(root.children).forEach((node, i) => {
        const item = node as HTMLElement;
        const phase = angle.current + i * Math.PI * 2 / slots;
        const depth = (Math.cos(phase) + 1) / 2;
        const scale = .24 + Math.pow(depth, 4) * .76;
        const x = Math.sin(phase) * width * .36;
        const y = -Math.cos(phase) * -75;
        const lap = Math.floor((phase + Math.PI) / (Math.PI * 2));
        const index = ((i - lap * slots) % organisations.length + organisations.length) % organisations.length;
        item.textContent = organisations[index];
        item.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
        item.style.opacity = String(.2 + Math.pow(depth, 3) * .8);
        item.style.filter = `grayscale(${1-depth}) blur(${(1-depth)*1.3}px)`;
        item.style.zIndex = String(Math.round(depth*100));
        item.style.color = colours[index % colours.length];
      });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [paused, reduced]);
  function step(direction: number) {
    setPaused(true);
    const next = Math.round(-angle.current / (Math.PI * 2 / slots)) + direction;
    angle.current = -next * Math.PI * 2 / slots;
    setSelected(((next % organisations.length) + organisations.length) % organisations.length);
  }
  return <section className="experience-cloud experience-orbit" id="home-experience" aria-labelledby="experience-title">
    <div className="gateway-width">
      <p className="gateway-kicker">Different perspectives. Shared experience.</p>
      <h2 id="experience-title">Experience across our team</h2>
      <p className="orbit-introduction">A world of organisations. A wealth of experience to draw on.</p>
      <div className="orbit-controls">
        <button type="button" onClick={() => step(-1)} aria-label="Previous organisation">←</button>
        <button type="button" onClick={() => { if (!paused) step(0); else setPaused(false); }} aria-pressed={paused}>{paused ? "Play orbit" : "Pause orbit"}</button>
        <button type="button" onClick={() => step(1)} aria-label="Next organisation">→</button>
      </div>
    </div>
    <div className="orbit-space" ref={stage} aria-hidden="true">
      {Array.from({length: slots}, (_, i) => <span className="orbit-name" key={i}>{organisations[i]}</span>)}
    </div>
    <div className="gateway-width orbit-explore">
      {paused && <p className="orbit-selected" aria-live="polite">{organisations[selected]}</p>}
      <details open={reduced || undefined} onToggle={event => { if (event.currentTarget.open) setPaused(true); }}>
        <summary>Explore all {organisations.length} organisations <span>+</span></summary>
        <p>Historical experience across our team; no endorsement of SORP2026 is implied.</p>
        <ul>{organisations.map((name, i) => <li key={name}><button type="button" onClick={() => { angle.current = -i * Math.PI * 2 / slots; setSelected(i); setPaused(true); }}>{name}{name === "Greenpeace" && <img src="/experience/greenpeace.svg" alt="" width={90} height={30} />}{name === "Starbucks" && <img src="/experience/starbucks.svg" alt="" width={35} height={35} />}</button></li>)}</ul>
      </details>
    </div>
  </section>;
}

