"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { folderForPath } from "@/lib/products";

export function PlatformNavigation({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const folder = folderForPath(pathname);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => document.documentElement.style.setProperty("--platform-navigation-height", `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--platform-navigation-height"); };
  }, []);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    let compact = false;
    const update = () => {
      frame = 0;
      // Hysteresis prevents a compacting sticky header from toggling at its
      // own threshold as the document reflows. No React render per scroll.
      compact = window.scrollY > (compact ? 24 : 110);
      element.dataset.compact = String(compact);
      const hero = document.querySelector<HTMLElement>("[data-folder-surface]");
      const beyondHero = !hero || hero.getBoundingClientRect().bottom <= element.getBoundingClientRect().bottom;
      element.dataset.beyondHero = String(beyondHero);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    // Account-aware pages replace their loading state after hydration.
    const contentObserver = new ResizeObserver(schedule);
    contentObserver.observe(document.body);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { contentObserver.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [pathname]);
  return <div ref={ref} className="platform-sticky-navigation" style={{ "--active-folder-colour": folder.tabColour } as CSSProperties}>{children}</div>;
}
