import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: {
    default: "SORP 2026 — Better reporting. Greater impact.",
    template: "%s | SORP 2026",
  },
  description:
    "Independent SORP 2026 guidance, practical tools and expert insight for charities and the professionals who support them. Brought to you by My Social Impact.",
  robots: { index: site.live, follow: site.live },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "SORP 2026",
    title: "Better reporting. Greater impact.",
    description:
      "A clearer path through SORP 2026. Independent guidance and practical tools from My Social Impact.",
    images: [
      {
        url: "/social-card.png",
        width: 1200,
        height: 630,
        alt: "SORP 2026 — Better reporting. Greater impact. Brought to you by My Social Impact.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: "#123e32" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header readinessHref={site.readiness ?? "/readiness"} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
