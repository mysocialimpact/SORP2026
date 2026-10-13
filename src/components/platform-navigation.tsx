"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function PlatformNavigation({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => document.documentElement.style.setProperty("--platform-navigation-height", `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--platform-navigation-height"); };
  }, []);
  return <div ref={ref} className="platform-sticky-navigation">{children}</div>;
}
