"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { site } from "@/lib/site";

const actions: Record<string, { label: string; href: string; secondary?: { label: string; href: string } }> = {
  "/": { label: "Start your free SORP review", href: site.readiness!, secondary: { label: "Ask SORP", href: "/ask-sorp/#ask-sorp-live" } },
  "/charity-impact-reports/": { label: "Review your impact report", href: "/charity-impact-reports/review/" },
  "/social-impact-excellence/": { label: "See your next step", href: "#excellence-start" },
  "/my-impact-director/": { label: "Start your free assessment", href: "#assessment", secondary: { label: "Talk to us", href: "#director-conversation" } },
};

export function ProductActionBar() {
  const pathname = usePathname();
  const path = `${pathname.replace(/\/$/, "")}/`;
  const action = actions[path];
  const bar = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!action || !bar.current) return;
    const element = bar.current;
    const measure = () => document.documentElement.style.setProperty("--folder-action-height", `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    measure(); observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--folder-action-height"); };
  }, [action]);
  // Ready and Ask retain their own working CTAs (including presentation/chat
  // behaviour). Internal assessments keep their existing task controls only.
  if (!action) return null;
  return <>
    <aside ref={bar} className="folder-action-bar" data-action-page={path} aria-label="Page actions">
      <Link className="folder-action-primary" href={action.href}>{action.label} <span aria-hidden="true">→</span></Link>
      {action.secondary && <Link className="folder-action-secondary" href={action.secondary.href}>{action.secondary.label} <span aria-hidden="true">→</span></Link>}
    </aside>
    <div className="folder-action-clearance" aria-hidden="true" />
  </>;
}
