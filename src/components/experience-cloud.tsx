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
const featured = ["Great Ormond Street Hospital", "ActionAid", "Greenpeace", "Comic Relief", "Blue Cross", "Farm Africa", "CARE International", "Friends of the Earth", "Interim Spaces"];
const crawlOrganisations = [...featured, ...organisations.filter(name => !featured.includes(name))];
function makeRows(mobile: boolean) {
  const rows: string[][] = [];
  for (const name of crawlOrganisations) {
    const last = rows.at(-1);
    const length = last?.reduce((total, item) => total + item.length, 0) || 0;
    const canJoin = mobile
      ? last && last.length < 2 && length + name.length <= 25
      : last && (last.length < 3 || last.length < 4 && length + name.length <= 56 && name.length <= 22);
    if (canJoin && last) last.push(name);
    else rows.push([name]);
  }
  return rows;
}
const desktopRows = makeRows(false);
const mobileRows = makeRows(true);
const slots = 6;
const openingLine = 5;
export function ExperienceCloud() {
  const stage = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const firstLine = useRef(openingLine);
  const audio = useRef<AudioContext | null>(null);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    update(); motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);
  useEffect(() => () => {
    if (cueTimer.current) clearTimeout(cueTimer.current);
    void audio.current?.close();
  }, []);
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    let frame = 0, previous = 0, visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(root);
    const render = (time: number) => {
      if (previous && visible && !paused && !reduced && !document.hidden) progress.current += Math.min(time - previous, 40) / 16000;
      previous = time;
      const height = root.clientHeight;
      const mobile = root.clientWidth < 700;
      const rows = mobile ? mobileRows : desktopRows;
      const pitch = (height - 72) / slots;
      Array.from(root.children).forEach((node, i) => {
        const item = node as HTMLElement;
        const journey = progress.current + i / slots;
        const distance = journey % 1;
        const cycle = Math.floor(journey);
        const index = ((firstLine.current - i + cycle * slots) % rows.length + rows.length) % rows.length;
        const row = rows[index];
        const near = 1 - distance;
        const scale = (mobile ? .78 : .72) + (mobile ? .22 : .28) * Math.pow(near, 1.4);
        const y = 36 + near * (height - 72);
        const colour = colours[index % colours.length];
        const blend = Math.pow(near, .7);
        item.style.transform = `translate(-50%, -50%) translateY(${y}px) scale(${scale})`;
        item.style.color = `rgb(${colour.map((channel, c) => Math.round([112,117,112][c] * (1-blend) + channel * blend)).join(",")})`;
        item.style.opacity = String(Math.min(1, distance * slots * 3, (1-distance) * slots * 3) * (.8 + .2 * near));
        item.style.height = `${pitch}px`;
        Array.from(item.children).forEach((child, position) => {
          const name = row[position] || "";
          const label = child as HTMLElement;
          if (label.textContent !== name) label.textContent = name;
          label.hidden = !name;
          label.style.fontSize = `${mobile ? name.length > 30 ? 13 : name.length > 22 ? 15 : name.length > 14 ? 18 : 23 : name.length > 34 ? 15 : name.length > 25 ? 18 : name.length > 18 ? 21 : 25}px`;
        });
      });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [paused, reduced]);
  function explore(index: number) {
    const rows = stage.current && stage.current.clientWidth < 700 ? mobileRows : desktopRows;
    firstLine.current = rows.findIndex(row => row.includes(organisations[index])) + openingLine;
    progress.current = .04;
    setSelected(index);
    setPaused(true);
  }
  async function toggleCue() {
    if (audio.current) {
      if (cueTimer.current) clearTimeout(cueTimer.current);
      void audio.current.close();
      audio.current = null;
      setPlaying(false);
      return;
    }
    const context = new AudioContext();
    audio.current = context;
    try {
      await context.resume();
      const master = context.createGain();
      master.gain.value = 0.28;
      master.connect(context.destination);
      const start = context.currentTime + 0.05;
      const chords = [
        [146.83, 174.61, 220, 329.63],
        [116.54, 174.61, 233.08, 293.66],
        [130.81, 174.61, 220, 261.63],
        [130.81, 164.81, 196, 261.63],
      ];
      const note = (frequency: number, at: number, duration: number, level: number, kind: OscillatorType) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.001, at);
        gain.gain.linearRampToValueAtTime(level, at + Math.min(0.7, duration / 4));
        gain.gain.setValueAtTime(level, at + duration - 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
        oscillator.connect(gain).connect(master);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.02);
      };
      chords.forEach((chord, passage) => {
        const at = start + passage * 4;
        chord.forEach((frequency, index) => note(frequency, at, 4.3, index === 0 ? 0.11 : 0.055, "sine"));
        [0, 2, 1, 3, 2, 1].forEach((index, beat) => note(chord[index] * 2, at + beat * 0.58, 1.1, 0.035, "triangle"));
      });
      setPlaying(true);
      cueTimer.current = setTimeout(() => {
        void context.close();
        if (audio.current === context) audio.current = null;
        setPlaying(false);
      }, 17500);
    } catch {
      void context.close();
      audio.current = null;
      setPlaying(false);
    }
  }
  return <section className="experience-cloud experience-crawl" id="home-experience" aria-labelledby="experience-title">
    <div className="gateway-width crawl-heading">
      <div><p className="gateway-kicker">Experience across our team.</p>
      <h2 id="experience-title">Impact strikes back.</h2>
      <p className="crawl-introduction">A new era of charity reporting is taking shape. Measuring and reporting impact matters more than ever, and we’re excited to help charities turn that change into greater impact.</p>
      <p className="crawl-context">Some of the charities and other organisations Marcus and our team have worked with over the years.</p></div>
      <div className="crawl-controls">
        <button type="button" onClick={() => { if (reduced) return; setPaused(value => !value); }} aria-pressed={paused || reduced} disabled={reduced}>{reduced ? "Motion reduced" : paused ? "Resume movement" : "Pause movement"}</button>
        <button type="button" onClick={() => void toggleCue()} aria-pressed={playing}>{playing ? "Stop original cue" : "Play original cue ♪"}</button>
        <a href="#experience-collection" onClick={() => setPaused(true)}>Explore the names ↓</a>
      </div>
    </div>
    <div className="crawl-frame">
      <div className="crawl-plane" aria-hidden="true" />
      <div className="crawl-space" ref={stage} aria-hidden="true">
        {Array.from({length: slots}, (_, i) => <span className="crawl-name" key={i} style={{ top: 0 }}>{Array.from({length: 4}, (_, position) => <span className="crawl-organisation" key={position}>{desktopRows[((openingLine-i)%desktopRows.length+desktopRows.length)%desktopRows.length][position] || ""}</span>)}</span>)}
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

