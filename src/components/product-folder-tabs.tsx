"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { allProducts } from "@/lib/products";
import { isReadinessComplete } from "@/lib/readiness-status";

const homeTab = {
  number: "Index",
  slug: "home",
  tabLabel: "Home",
  status: "Platform index",
  href: "/",
  className: "is-home",
  tabColour: "#cfddcf",
  tabInk: "#1b3931",
};
const folderTabs = [homeTab, ...allProducts];
function activeFolderPath(pathname: string) {
  const product = allProducts.find((tab) => pathname === tab.href || pathname.startsWith(tab.href));
  return product?.href || "/";
}

export function ProductFolderTabs() {
  const pathname = usePathname();
  const [readinessComplete, setReadinessComplete] = useState(false);
  const tabStrip = useRef<HTMLElement>(null);
  const selectedTab = useRef<HTMLAnchorElement>(null);
  const normalisedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const activePath = activeFolderPath(normalisedPath);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        setReadinessComplete(response.ok && data.signedIn === true && isReadinessComplete(data.progress));
      })
      .catch(() => setReadinessComplete(false));
    return () => controller.abort();
  }, []);

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
    <div className="product-folder" data-active-product={activePath}>
      <nav ref={tabStrip} className="product-folder-tabs" aria-label="SORP2026 products">
        <div className="product-folder-tabs-track">
          {folderTabs.map((tab, index) => {
            const active = activePath === tab.href;
            const exact = normalisedPath === tab.href;
            const laterJourney = tab.number !== "Index" && Number(tab.number) >= 3 && !readinessComplete;
            const style = {
              "--tab-colour": tab.tabColour,
              "--tab-ink": tab.tabInk,
              "--tab-step": `${index % 3}px`,
            } as CSSProperties;
            return (
              <Link
                key={tab.slug}
                ref={active ? selectedTab : undefined}
                href={tab.href}
                className={`product-folder-tab ${tab.className}${active ? " is-active" : ""}${laterJourney ? " is-journey-later" : ""}`}
                aria-current={active ? (exact ? "page" : "location") : undefined}
                style={style}
              >
                <span aria-hidden="true">{tab.number}</span>
                <strong>{tab.tabLabel}</strong>
                <small>{active ? "Current section" : tab.status}</small>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="product-folder-sheet-edge" aria-hidden="true" />
    </div>
  );
}
