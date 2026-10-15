"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { folderForPath } from "@/lib/products";
import { isReadinessComplete, isReadinessStarted, type ReadinessProgress } from "@/lib/readiness-status";

type Action = { label: string; href: string };
type AccountResponse = { signedIn?: boolean; progress?: ReadinessProgress };

function defaultAction(path: string): Action {
  if (path.startsWith("/ask-sorp/")) return { label: "Ask a question", href: "/ask-sorp/workspace/" };
  if (path.startsWith("/charity-impact-reports/")) return { label: "Get your report reviewed", href: "/charity-impact-reports/review/" };
  if (path.startsWith("/social-impact-excellence/")) return { label: "Explore Social Impact Excellence", href: "/social-impact-excellence/#excellence-start" };
  if (path.startsWith("/my-impact-director/")) return { label: "Start your free assessment", href: "/my-impact-director/#assessment" };
  return { label: "Start your free SORP review", href: "/are-you-sorp-ready/review/?entry=intro" };
}

function readinessAction(progress?: ReadinessProgress): Action {
  if (isReadinessComplete(progress)) return { label: "View your SORP report", href: "/are-you-sorp-ready/review/" };
  if (isReadinessStarted(progress)) return { label: "Continue your SORP review", href: "/are-you-sorp-ready/review/" };
  return { label: "Start your free SORP review", href: "/are-you-sorp-ready/review/?entry=intro" };
}

export function ProductActionBar() {
  const pathname = usePathname();
  const path = `${pathname.replace(/\/$/, "")}/`;
  const founderMode = path.startsWith("/founder/");
  const folder = folderForPath(path);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [director, setDirector] = useState<{ completed?: boolean; started?: boolean } | null>(null);
  const bar = useRef<HTMLElement>(null);
  const readinessLanding = path === "/are-you-sorp-ready/";

  useEffect(() => {
    if (founderMode) return;
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => response.ok ? setAccount(await response.json()) : setAccount({ signedIn: false }))
      .catch(() => { if (!controller.signal.aborted) setAccount({ signedIn: false }); });
    if (path.startsWith("/my-impact-director/")) {
      void fetch("/api/impact-director/", { cache: "no-store", signal: controller.signal })
        .then(async response => {
          if (!response.ok) return;
          const value = await response.json();
          const progress = value.progress?.data;
          setDirector({ completed: progress?.completed === true, started: Array.isArray(progress?.ratings) && progress.ratings.some(Boolean) });
        }).catch(() => undefined);
    }
    return () => controller.abort();
  }, [founderMode, path]);

  const action = useMemo(() => {
    if (path === "/" || path.startsWith("/are-you-sorp-ready/") || path === "/dashboard/") return readinessAction(account?.signedIn ? account.progress : undefined);
    if (path.startsWith("/my-impact-director/") && director) {
      if (director.completed) return { label: "View your Impact Director report", href: "/my-impact-director/#assessment" };
      if (director.started) return { label: "Continue your free assessment", href: "/my-impact-director/#assessment" };
    }
    return defaultAction(path);
  }, [account, director, path]);

  useLayoutEffect(() => {
    if (founderMode) {
      document.documentElement.style.removeProperty("--folder-action-height");
      return;
    }
    if (!bar.current) return;
    const element = bar.current;
    const measure = () => document.documentElement.style.setProperty("--folder-action-height", `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure); measure(); observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--folder-action-height"); };
  }, [founderMode]);

  if (founderMode) return null;
  return <>
    <aside ref={bar} className={`folder-action-bar${readinessLanding ? " is-readiness" : ""}`} data-action-page={path} data-action-product={folder.slug} style={{ "--action-accent": folder.tabColour, "--action-ink": folder.tabInk } as React.CSSProperties} aria-label="Page actions">
      {readinessLanding && <Link className="folder-action-utility folder-action-presentation" href="/are-you-sorp-ready/presentation/">Play Presentation <span aria-hidden="true">▶</span></Link>}
      <Link className="folder-action-primary" href={action.href}>{readinessLanding && !account?.signedIn ? "Start Free Review" : action.label} <span aria-hidden="true">→</span></Link>
      {readinessLanding && <a className="folder-action-utility folder-action-feedback" href="#page-feedback">Give Feedback <span aria-hidden="true">→</span></a>}
      <a className="folder-action-secondary" href="#say-hello">{readinessLanding ? "Talk to Us" : "Talk to us"} <span aria-hidden="true">→</span></a>
    </aside>
    <div className="folder-action-clearance" aria-hidden="true" />
  </>;
}
