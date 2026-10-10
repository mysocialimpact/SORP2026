import type { NextConfig } from "next";
const live = process.env.SITE_LIVE === "true";
const config: NextConfig = {
  poweredByHeader: false,
  trailingSlash: true,
  ...(process.env.STATIC_EXPORT === "true"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
  async redirects() {
    return live
      ? [
          {
            source: "/:path*",
            has: [{ type: "host", value: "(www\\.)?sorp2026\\.com" }],
            destination: "https://sorp2026.org/:path*",
            permanent: true,
          },
          {
            source: "/:path*",
            has: [{ type: "host", value: "www\\.sorp2026\\.org" }],
            destination: "https://sorp2026.org/:path*",
            permanent: true,
          },
        ]
      : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(!live
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
    ];
  },
};
export default config;
