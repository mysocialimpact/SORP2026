import { createElement, type CSSProperties, type HTMLAttributes } from "react";
import { folderTabs } from "@/lib/products";

/** Keeps each existing hero's content and semantics; shares only the paper surface. */
export function FolderHero({ product, as = "section", paper = "#faf9f6", className = "", style, ...props }: HTMLAttributes<HTMLElement> & {
  product: string;
  as?: "section" | "div" | "header";
  paper?: string;
}) {
  const theme = folderTabs.find(tab => tab.slug === product);
  return createElement(as, {
    ...props,
    className: `folder-hero ${className}`,
    "data-folder-surface": product,
    style: { "--folder-colour": theme?.tabColour, "--folder-page": paper, ...style } as CSSProperties,
  });
}
