"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { folderTabs, folderForPath } from "@/lib/products";
import { isReadinessComplete } from "@/lib/readiness-status";
import { FOUNDER_PRODUCT_VIEWS, FOUNDER_VIEW_EVENT, announceFounderView, founderPrimaryView, founderViewFromHash, type FounderView } from "@/lib/founder-navigation";

export function ProductFolderTabs() {
  const pathname = usePathname();
  const [readinessComplete, setReadinessComplete] = useState(false);
  const [founderView, setFounderView] = useState<FounderView>("home");
  const tabStrip = useRef<HTMLElement>(null);
  const selectedTab = useRef<HTMLAnchorElement>(null);
  const normalisedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const founderMode = normalisedPath.startsWith("/founder/");
  const founderPrimary = founderPrimaryView(founderView);
  const founderIndex = FOUNDER_PRODUCT_VIEWS.indexOf(founderPrimary);
  const activeFolder = founderMode ? folderTabs[Math.max(0, founderIndex)] : folderForPath(normalisedPath);
  const activePath = activeFolder.href;

  useEffect(() => {
    if (!founderMode) return;
    const syncHash = () => setFounderView(founderViewFromHash(window.location.hash));
    const syncEvent = (event: Event) => setFounderView((event as CustomEvent<{ view?: FounderView }>).detail?.view || founderViewFromHash(window.location.hash));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener(FOUNDER_VIEW_EVENT, syncEvent);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener(FOUNDER_VIEW_EVENT, syncEvent);
    };
  }, [founderMode]);

  useEffect(() => {
    if (founderMode) return;
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        setReadinessComplete(response.ok && data.signedIn === true && isReadinessComplete(data.progress));
      })
      .catch(() => setReadinessComplete(false));
    return () => controller.abort();
  }, [founderMode]);

  useLayoutEffect(() => {
    const strip = tabStrip.current;
    const tab = selectedTab.current;
    if (!strip || !tab) return;
    strip.scrollTo({
      left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2,
      behavior: "auto",
    });
  }, [activePath]);

  return (
    <div className="product-folder" data-active-product={activePath} style={{ "--folder-paper": activeFolder.tabColour } as CSSProperties}>
      <nav ref={tabStrip} className="product-folder-tabs" aria-label="SORP2026 products">
        <div className="product-folder-tabs-track">
          {folderTabs.map((tab, index) => {
            const founderTarget = FOUNDER_PRODUCT_VIEWS[index] || "home";
            const active = founderMode ? founderPrimary === founderTarget : activePath === tab.href;
            const exact = founderMode || normalisedPath === tab.href;
            const laterJourney = !founderMode && tab.number !== "Index" && Number(tab.number) >= 3 && !readinessComplete;
            const style = {
              "--tab-colour": tab.tabColour,
              "--tab-ink": tab.tabInk,
              "--tab-step": `${index % 3}px`,
            } as CSSProperties;
            return (
              <Link
                key={tab.slug}
                ref={active ? selectedTab : undefined}
                href={founderMode ? `/founder/#${founderTarget}` : tab.href}
                className={`product-folder-tab ${tab.className}${active ? " is-active" : ""}${laterJourney ? " is-journey-later" : ""}`}
                aria-current={active ? (exact ? "page" : "location") : undefined}
                style={style}
                onClick={founderMode ? () => { setFounderView(founderTarget); announceFounderView(founderTarget); } : undefined}
              >
                <span aria-hidden="true">{tab.number}</span>
                <strong>{tab.tabLabel}</strong>
                <small>{active ? (founderMode ? "Founder dashboard" : "Current section") : tab.status}</small>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="product-folder-sheet-edge" aria-hidden="true" />
    </div>
  );
}
