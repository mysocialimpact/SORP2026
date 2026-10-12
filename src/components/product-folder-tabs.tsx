"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { allProducts } from "@/lib/products";

const productPaths = new Set(allProducts.map((product) => product.href));

export function ProductFolderTabs() {
  const pathname = usePathname();
  const tabStrip = useRef<HTMLElement>(null);
  const selectedTab = useRef<HTMLAnchorElement>(null);
  const normalisedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;

  useLayoutEffect(() => {
    const strip = tabStrip.current;
    const tab = selectedTab.current;
    if (!productPaths.has(normalisedPath) || !strip || !tab) return;
    strip.scrollTo({
      left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2,
      behavior: "auto",
    });
  }, [normalisedPath]);

  if (!productPaths.has(normalisedPath)) return null;

  return (
    <div className="product-folder" data-active-product={normalisedPath}>
      <nav ref={tabStrip} className="product-folder-tabs" aria-label="SORP2026 products">
        <div className="product-folder-tabs-track">
          {allProducts.map((product, index) => {
            const active = normalisedPath === product.href;
            const style = {
              "--tab-colour": product.tabColour,
              "--tab-ink": product.tabInk,
              "--tab-step": `${index % 3}px`,
            } as CSSProperties;
            return (
              <Link
                key={product.slug}
                ref={active ? selectedTab : undefined}
                href={product.href}
                className={`product-folder-tab ${product.className}${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                style={style}
              >
                <span aria-hidden="true">{product.number}</span>
                <strong>{product.tabLabel}</strong>
                <small>{active ? "Current section" : product.status}</small>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="product-folder-sheet-edge" aria-hidden="true" />
    </div>
  );
}
