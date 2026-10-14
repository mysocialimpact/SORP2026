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
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          root.setAttribute("data-active", "true");
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3, rootMargin: "-120px 0px -12% 0px" });
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
          <Image className={styles.marcus} src="/images/marcus-editorial.webp" alt="Marcus Warry" width={640} height={857} sizes="(max-width: 700px) 40vw, 240px" />
          <div className={styles.photoPending}><span>Dr Chris Arnold</span><small>Preview: awaiting the original attached photograph file.</small></div>
        </div>
        <figcaption>
          <span className={styles.founderNames}><strong>Marcus Warry &amp; Dr Chris Arnold</strong><span>Co-founders, My Social Impact</span></span>
          <Image className={styles.logo} src="/brand/my-social-impact.png" alt="My Social Impact" width={1088} height={124} sizes="150px" />
        </figcaption>
      </figure>
    </section>
  );
}
