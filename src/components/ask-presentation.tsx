"use client";
import { useState, useRef, type KeyboardEvent, type TouchEvent } from "react";
import Link from "next/link";
import { Arrow } from "./ui";
const slides = [
  {
    label: "The idea",
    title: (
      <>
        A complex standard.
        <br />
        <em>A simpler conversation.</em>
      </>
    ),
    text: "Have a question about SORP 2026? Ask SORP. We’re developing a clearer route into the guidance you need.",
    detail: "AI-supported guidance, across the whole SORP.",
    visual: "?",
  },
  {
    label: "For you",
    title: (
      <>
        For the people
        <br />
        <em>behind the numbers.</em>
      </>
    ),
    text: "Charity finance teams, trustees, accountants and advisers. A shared starting point for better-informed decisions.",
    detail: "Your charity. Your clients. Your questions.",
    visual: "You.",
  },
  {
    label: "The questions",
    title: (
      <>
        From accounting
        <br />
        <em>to impact.</em>
      </>
    ),
    text: "Financial reporting, accounting treatments, disclosures and narrative reporting. The whole SORP, within reach.",
    detail: "“Which disclosures apply to our charity?”",
    visual: "↗",
  },
  {
    label: "What’s next",
    title: (
      <>
        Good questions.
        <br />
        <em>Worth getting right.</em>
      </>
    ),
    text: "Ask SORP is in development. While we build it, explore your charity’s impact and sustainability reporting readiness.",
    detail: "Coming soon. The assistant is not available yet.",
    visual: "Soon.",
  },
];
export function AskPresentation() {
  const [slide, setSlide] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (n: number) =>
    setSlide(Math.max(0, Math.min(slides.length - 1, n)));
  const key = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(slide + (e.key === "ArrowRight" ? 1 : -1));
    }
  };
  const end = (e: TouchEvent) => {
    const t = touch.current;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5)
      go(slide + (dx < 0 ? 1 : -1));
    touch.current = null;
  };
  return (
    <section
      className="ask-presentation"
      aria-label="Ask SORP presentation; use Previous, Next or arrow keys"
      tabIndex={0}
      onKeyDown={key}
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={end}
    >
      <div className="ask-stage">
        <div className="ask-stage-header">
          <span>My Social Impact · Ask SORP</span>
          <span>{String(slide + 1).padStart(2, "0")} / 04</span>
        </div>
        <div
          className="ask-scene"
          key={slide}
          aria-live="polite"
          aria-atomic="true"
        >
          <div>
            <p className="gateway-kicker">{slides[slide].label}</p>
            <h2>{slides[slide].title}</h2>
            <p className="ask-scene-copy">{slides[slide].text}</p>
            <p className="ask-scene-detail">{slides[slide].detail}</p>
            {slide === 3 && (
              <Link className="gateway-quiet-link" href="/are-you-sorp-ready/">
                Explore Are You SORP Ready? <Arrow />
              </Link>
            )}
          </div>
          <span className="ask-scene-symbol" aria-hidden="true">
            {slides[slide].visual}
          </span>
        </div>
      </div>
      <div className="ask-controls">
        <button disabled={slide === 0} onClick={() => go(slide - 1)}>
          ← Previous
        </button>
        <span aria-live="polite">Slide {slide + 1} of 4</span>
        <button disabled={slide === 3} onClick={() => go(slide + 1)}>
          Next →
        </button>
      </div>
      <nav className="ask-chapters" aria-label="Ask SORP chapters">
        {slides.map((s, i) => (
          <button
            key={s.label}
            aria-label={`${i + 1}. ${s.label}`}
            aria-current={slide === i ? "step" : undefined}
            onClick={() => go(i)}
          >
            <span />
          </button>
        ))}
      </nav>
    </section>
  );
}
