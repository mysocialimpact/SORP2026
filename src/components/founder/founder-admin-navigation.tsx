"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FOUNDER_ADMIN_NAV, FOUNDER_VIEW_EVENT, announceFounderView, founderViewFromHash, type FounderView } from "@/lib/founder-navigation";

export function FounderAdminNavigation() {
  const pathname = usePathname();
  const [active, setActive] = useState<FounderView>("home");
  const founderMode = pathname === "/founder" || pathname.startsWith("/founder/");

  useEffect(() => {
    if (!founderMode) return;
    const syncHash = () => setActive(founderViewFromHash(window.location.hash));
    const syncEvent = (event: Event) => setActive((event as CustomEvent<{ view?: FounderView }>).detail?.view || founderViewFromHash(window.location.hash));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener(FOUNDER_VIEW_EVENT, syncEvent);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener(FOUNDER_VIEW_EVENT, syncEvent);
    };
  }, [founderMode]);

  if (!founderMode) return null;
  return <nav className="founder-admin-navigation" aria-label="Founder administration">
    <div className="gateway-width founder-admin-navigation-track">
      {FOUNDER_ADMIN_NAV.map(item => <a key={item.key} href={`/founder/#${item.key}`} className={active === item.key ? "is-active" : ""} aria-current={active === item.key ? "page" : undefined} onClick={() => { setActive(item.key); announceFounderView(item.key); }}>{item.label}</a>)}
    </div>
  </nav>;
}
