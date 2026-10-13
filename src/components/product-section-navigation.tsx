"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type Section = { id: string; label: string };
type PageIndex = { title: string; colour: string; ink?: string; sections: Section[] };

const pageIndexes: Record<string, PageIndex> = {
  "/": {
    title: "Home",
    colour: "#cfddcf",
    ink: "#1b3931",
    sections: [
      { id: "home-overview", label: "Overview" },
      { id: "home-audience", label: "Who it’s for" },
      { id: "products", label: "Start here" },
      { id: "home-experience", label: "Experience" },
      { id: "home-team", label: "Our team" },
      { id: "home-support", label: "Keep it free" },
      { id: "say-hello", label: "Say hello" },
    ],
  },
  "/are-you-sorp-ready/": {
    title: "Are You SORP Ready?",
    colour: "#ff633b",
    sections: [
      { id: "top", label: "Overview" },
      { id: "sr-audiences", label: "Who it’s for" },
      { id: "sr-benefits", label: "What you’ll get" },
      { id: "presentation", label: "Presentation" },
      { id: "sr-more", label: "More information" },
    ],
  },
  "/ask-sorp/": {
    title: "Ask SORP",
    colour: "#d9e4f2",
    sections: [
      { id: "ask-overview", label: "Overview" },
      { id: "ask-sorp-live", label: "Ask SORP now" },
      { id: "ask-how", label: "How it works" },
    ],
  },
  "/charity-impact-reports/": {
    title: "Charity Impact Reports",
    colour: "#ffd567",
    sections: [
      { id: "reports-overview", label: "Overview" },
      { id: "reports-why", label: "Why it matters" },
      { id: "reports-review", label: "£100 review" },
      { id: "reports-full", label: "Full report" },
    ],
  },
  "/social-impact-excellence/": {
    title: "Social Impact Excellence",
    colour: "#f0a7c1",
    sections: [
      { id: "excellence-overview", label: "Overview" },
      { id: "excellence-start", label: "Start or continue" },
      { id: "excellence-pillars", label: "Five pillars" },
      { id: "excellence-account", label: "Your journey" },
    ],
  },
  "/purpose-works/": {
    title: "Purpose Works",
    colour: "#493b72",
    ink: "#ffffff",
    sections: [
      { id: "purpose-overview", label: "Overview" },
      { id: "purpose-services", label: "Services" },
      { id: "purpose-expertise", label: "Expertise" },
      { id: "purpose-claims", label: "Credible claims" },
      { id: "purpose-review", label: "Start with a review" },
    ],
  },
  "/my-impact-director/": {
    title: "My Impact Director",
    colour: "#d8ff52",
    sections: [
      { id: "director-overview", label: "Overview" },
      { id: "director-ambition", label: "The ambition" },
      { id: "assessment", label: "Free assessment" },
      { id: "director-support", label: "Support today" },
      { id: "director-measurement", label: "What matters" },
      { id: "director-future", label: "The future" },
      { id: "director-conversation", label: "Talk to us" },
    ],
  },
};

function normalise(pathname: string) {
  return pathname === "/" ? "/" : `${pathname.replace(/\/$/, "")}/`;
}

export function ProductSectionNavigation() {
  const pathname = normalise(usePathname());
  const pageIndex = pageIndexes[pathname];
  const [active, setActive] = useState(pageIndex?.sections[0]?.id || "");
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageIndex) return;
    const sections = pageIndex.sections.map(section => document.getElementById(section.id)).filter((element): element is HTMLElement => Boolean(element));
    if (!sections.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const platformHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--platform-navigation-height")) || 0;
      const offset = platformHeight + (track.current?.parentElement?.getBoundingClientRect().height || 0) + 28;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = sections[0].id;
      if (atBottom) current = sections[sections.length - 1].id;
      else for (const section of sections) if (section.getBoundingClientRect().top <= offset) current = section.id;
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [pageIndex, pathname]);

  useEffect(() => {
    const link = track.current?.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(active)}"]`);
    if (!link || !track.current) return;
    const left = link.offsetLeft - (track.current.clientWidth - link.offsetWidth) / 2;
    track.current.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  if (!pageIndex) return null;
  const style = { "--section-colour": pageIndex.colour, "--section-ink": pageIndex.ink || "#242329" } as CSSProperties;
  return (
    <nav className="product-section-navigation" aria-label="On this page" style={style}>
      <div className="product-section-navigation-inner">
        <div className="product-section-context"><span>On this page</span><strong>{pageIndex.title}</strong></div>
        <div ref={track} className="product-section-navigation-track">
          {pageIndex.sections.map((section, index) => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined} onClick={() => setActive(section.id)}><span>{String(index + 1).padStart(2, "0")}</span>{section.label}</a>)}
        </div>
      </div>
    </nav>
  );
}
