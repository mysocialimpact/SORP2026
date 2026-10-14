"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./homepage-manifesto.module.css";

export function HomepageManifesto() {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = section.current;
    if (!root || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    root.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
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
          <Image className={styles.marcus} src="/images/marcus-vision.webp" alt="Marcus Warry" width={600} height={803} sizes="(max-width: 700px) 42vw, 23vw" />
          <Image className={styles.chris} src="/images/chris-vision.webp" alt="Dr Chris Arnold" width={600} height={534} sizes="(max-width: 700px) 52vw, 28vw" />
        </div>
        <figcaption><strong>Marcus Warry &amp; Dr Chris Arnold</strong><span>Co-founders, My Social Impact</span></figcaption>
      </figure>
    </section>
  );
}
