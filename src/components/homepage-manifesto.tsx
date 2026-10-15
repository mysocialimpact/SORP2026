"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./homepage-manifesto.module.css";

export function HomepageManifesto() {
  const section = useRef<HTMLElement>(null);

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
      <figure className={styles.founders} data-reveal>
        <div className={styles.portraits}>
          <Image className={styles.marcus} src="/images/marcus-editorial.webp" alt="Marcus Warry" width={640} height={857} sizes="(max-width: 700px) 40vw, 240px" />
          <Image className={styles.chris} src="/images/chris-vision.webp" alt="Dr Chris Arnold" width={600} height={534} sizes="(max-width: 700px) 40vw, 240px" />
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
