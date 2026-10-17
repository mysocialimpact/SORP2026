"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import styles from "./homepage-manifesto.module.css";

export function HomepageManifesto() {
  const section = useRef<HTMLElement>(null);
  const portraits = useRef<HTMLDivElement>(null);
  const artworkId = useId().replaceAll(":", "");

  useEffect(() => {
    const stage = portraits.current;
    if (!stage || !window.IntersectionObserver) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      if (motion.matches) {
        stage.dataset.portraitMotion = "complete";
        return;
      }
      if (stage.dataset.portraitMotion === "playing" || stage.dataset.portraitMotion === "complete") return;
      stage.dataset.portraitMotion = "waiting";
      // Observe the photographs, not the taller manifesto: on mobile they enter later.
      observer = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.55) return;
        stage.dataset.portraitMotion = "playing";
        observer?.disconnect();
      }, { threshold: 0.55, rootMargin: "-140px 0px -90px 0px" });
      observer.observe(stage);
    };
    observe();
    motion.addEventListener("change", observe);
    return () => { observer?.disconnect(); motion.removeEventListener("change", observe); };
  }, []);

  useEffect(() => {
    const root = section.current;
    if (!root || !window.IntersectionObserver) return;
    root.setAttribute("data-animated", "true");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;

      root.setAttribute("data-active", "true");
      root.querySelectorAll("[data-reveal]").forEach((element) => {
        element.setAttribute("data-revealed", "true");
      });
      observer.unobserve(root);
    }, { threshold: 0.24, rootMargin: "0px 0px -8% 0px" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={section} className={styles.manifesto} id="our-ambition" aria-labelledby="ambition-title">
      <div className={styles.ambition} data-reveal>
        <p className={styles.label}>Our ambition</p>
        <h2 id="ambition-title">Greater impact.<span>Accessible to everyone.</span></h2>
      </div>
      <div className={styles.vision} data-reveal>
        <p className={styles.label}>Our vision</p>
        <h2 id="home-vision-title">Imagine a world where social impact was taken as seriously as financial performance.</h2>
      </div>
      <figure className={styles.founders}>
        <div ref={portraits} className={styles.portraits} data-portrait-stage>
          <svg className={styles.artwork} viewBox="0 0 600 420" fill="none" aria-hidden="true" focusable="false">
            <defs>
              <pattern id={`${artworkId}-grid`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" stroke="#476C62" strokeWidth=".6" opacity=".38" /></pattern>
              <linearGradient id={`${artworkId}-join`} x1="90" y1="70" x2="520" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="#476C62"/><stop offset=".48" stopColor="#758D66"/><stop offset=".72" stopColor="#B77B77"/><stop offset="1" stopColor="#D77B55"/></linearGradient>
            </defs>
            <g className={styles.digital}>
              <path fill={`url(#${artworkId}-grid)`} d="M0 0H315V420H0Z"/>
              <path d="M-20 184H42L90 136V64H185L234 113H278M25 330V230L76 179H165L211 133V34H270M0 96H42V30H127M76 179V296L148 368H252" stroke="#476C62" strokeWidth="1.2"/>
              {[[42,184],[90,64],[185,64],[234,113],[76,179],[211,133],[211,34],[127,30],[148,368]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#E9DFD2" stroke="#476C62" strokeWidth="1.5"/>)}
            </g>
            <g className={styles.creative}>
              <path d="M620 44C523-1 421 15 378 74C350 112 394 157 459 143C521 131 523 77 491 66C454 52 412 83 425 111" stroke="#B997AF" strokeWidth="30" opacity=".55" strokeLinecap="round"/>
              <path d="M624 224C561 169 508 205 487 174C468 143 520 118 555 143C594 171 571 277 496 286C452 292 418 267 425 235" stroke="#C97C58" strokeWidth="16" opacity=".7" strokeLinecap="round"/>
              <path d="M607 323C517 378 452 338 398 301C354 270 327 289 313 324" stroke="#A5B59B" strokeWidth="48" opacity=".6" strokeLinecap="round"/>
              <path d="M554 31C470 0 347 73 387 133M589 238C552 335 417 347 365 288" stroke="#805C77" strokeWidth="1.2"/>
            </g>
            <g className={styles.connection} stroke={`url(#${artworkId}-join)`} strokeLinecap="round">
              <path className={styles.connectionLine} pathLength="1" d="M90 64H185L234 113H278C320 113 302 38 355 38C404 38 398 104 448 92C481 84 477 55 510 53" strokeWidth="2"/>
              <path className={styles.connectionEcho} pathLength="1" d="M165 179L211 133H271C331 133 313 56 357 56C392 56 398 130 452 110" strokeWidth="1"/>
              <circle className={styles.convergence} cx="303" cy="90" r="16" fill="#DAE6B7" strokeWidth="1"/>
              <circle className={styles.convergence} cx="303" cy="90" r="4" fill="#476C62" stroke="none"/>
            </g>
          </svg>
          <Image className={styles.marcus} src="/images/marcus-outdoor-original.jpg" alt="Marcus Warry" width={960} height={1280} sizes="(max-width: 700px) 48vw, 320px" unoptimized />
          <Image className={styles.chris} src="/images/chris-vision.webp" alt="Dr Chris Arnold" width={600} height={534} sizes="(max-width: 700px) 48vw, 320px" />
        </div>
        <div className={styles.founderProfiles}>
          <div>
            <strong>Marcus Warry, ACA</strong>
            <span>Chartered Accountant</span>
            <span>Social Impact Consultant</span>
          </div>
          <div>
            <strong>Dr Chris Arnold</strong>
            <span>Creative Director</span>
            <span>Social Impact Strategist</span>
          </div>
        </div>
        <figcaption>Co-founders, My Social Impact</figcaption>
      </figure>
    </section>
  );
}
