import type { Metadata } from "next";
import { ProductWorkspaceHeader } from "@/components/product-workspace-header";
import SorpFilm from "../../sorp-film/sorp-film";
import "../../assessment-mode.css";

export const metadata: Metadata = {
  title: "Are You SORP Ready? Presentation",
  description: "A short presentation explaining the free SORP 2026 readiness review.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <main id="main" className="sorp-presentation-workspace scr-page">
    <ProductWorkspaceHeader productName="Are You SORP Ready?" backHref="/are-you-sorp-ready/" />
    <div className="sf-presentation">
      <SorpFilm startHref="/are-you-sorp-ready/review/?entry=intro" />
    </div>
  </main>;
}
