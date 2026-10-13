import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/lora/400.css";
import "./globals.css";
import "./gateway.css";
import "./platform.css";
import "./typography.css";
import "./refinement.css";
import "./folder-continuity.css";
import "./shared-contact.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductFolderTabs } from "@/components/product-folder-tabs";
import { PlatformNavigation } from "@/components/platform-navigation";
import { ProductActionBar } from "@/components/product-action-bar";
import { SayHello } from "@/components/say-hello";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: {
    default: "SORP 2026. Made simpler.",
    template: "%s | SORP 2026",
  },
  description:
    "Practical tools for charities, accountants and advisers navigating SORP 2026. Independent tools developed by My Social Impact.",
  robots: { index: site.live, follow: site.live },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "SORP 2026",
    title: "SORP 2026. Made simpler.",
    description:
      "A clearer path through SORP 2026. Independent guidance and practical tools from My Social Impact.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SORP 2026. Made simpler. Tools by My Social Impact.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
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
        <PlatformNavigation><Header /><ProductFolderTabs /></PlatformNavigation>
        {children}
        <SayHello />
        <Footer />
        <ProductActionBar />
      </body>
    </html>
  );
}
