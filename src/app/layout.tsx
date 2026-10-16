import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/lora/400.css";
import "./globals.css";
import "./build-information.css";
import { BuildInformationBar } from "@/components/build-information-bar";
import "./gateway.css";
import "./platform.css";
import "./typography.css";
import "./refinement.css";
import "./folder-continuity.css";
import "./shared-contact.css";
import { SharedCharityContext } from "@/features/onboarding/shared-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductFolderTabs } from "@/components/product-folder-tabs";
import { PlatformNavigation } from "@/components/platform-navigation";
import { ProductActionBar } from "@/components/product-action-bar";
import { PageFeedback } from "@/components/page-feedback";
import { SayHello } from "@/components/say-hello";
import { FounderAdminNavigation } from "@/components/founder/founder-admin-navigation";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: {
    default: "SORP 2026 — Reporting for greater impact",
    template: "%s | SORP 2026",
  },
  description:
    "Free tools and affordable expertise to help charities navigate SORP 2026 and achieve greater impact.",
  robots: { index: site.live, follow: site.live },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "SORP 2026",
    title: "SORP 2026 — Reporting for greater impact",
    description:
      "Free tools and affordable expertise to help charities navigate SORP 2026 and achieve greater impact.",
    images: [
      {
        url: "https://sorp2026.org/social-share-sorp2026-v2.png",
        width: 1200,
        height: 630,
        alt: "SORP 2026. Reporting for greater impact. Free tools and affordable expertise for charities.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SORP 2026 — Reporting for greater impact",
    description: "Free tools and affordable expertise to help charities navigate SORP 2026 and achieve greater impact.",
    images: ["https://sorp2026.org/social-share-sorp2026-v2.png"],
  },
};
export const viewport: Viewport = { themeColor: "#faf9f6", viewportFit: "cover" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <BuildInformationBar />
        <PlatformNavigation><Header /><ProductFolderTabs /><FounderAdminNavigation /></PlatformNavigation>
        <SharedCharityContext />
        {children}
        <PageFeedback />
        <SayHello />
        <Footer />
        <ProductActionBar />
      </body>
    </html>
  );
}
