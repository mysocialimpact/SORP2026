"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

// Keep both columns mounted: changing mobile context never resets the form.
export function SorpMobilePanes({ children }: { children: ReactNode }) {
  const [pane, setPane] = useState<"chat" | "guide">("chat");
  const body = useRef<HTMLDivElement>(null);
  const scroll = useRef({ chat: 0, guide: 0 });
  const touch = useRef<{ x: number; y: number } | null>(null);
  function select(next: "chat" | "guide") {
    if (next === pane || !window.matchMedia("(max-width: 900px)").matches) return;
    if (body.current) scroll.current[pane] = body.current.scrollTop;
    setPane(next);
  }
  useLayoutEffect(() => { if (body.current) body.current.scrollTop = scroll.current[pane]; }, [pane]);
  return <>
    <nav className="sorp-mobile-pane-switch" aria-label="Assessment view">
      <button type="button" aria-pressed={pane === "chat"} onClick={() => select("chat")}>Chat</button>
      <button type="button" aria-pressed={pane === "guide"} onClick={() => select("guide")}>Guide</button>
    </nav>
    <div ref={body} className="sorp-journey-body sorp-mobile-panes" data-pane={pane}
      onTouchStart={event => { touch.current = (event.target as Element).closest("button,a,input,textarea,summary") ? null : { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchEnd={event => { const start = touch.current; touch.current = null; if (!start) return; const dx = event.changedTouches[0].clientX - start.x; const dy = event.changedTouches[0].clientY - start.y; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) select(dx < 0 ? "guide" : "chat"); }}
      onClick={event => { const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]'); if (pane === "guide" && link) { const target = document.getElementById(link.hash.slice(1)); if (target && body.current?.lastElementChild?.contains(target)) { select("chat"); requestAnimationFrame(() => target.scrollIntoView({ block: "start" })); } } }}>
      {children}
    </div>
  </>;
}
