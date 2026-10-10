import { ImageResponse } from "next/og";
export const alt =
  "SORP 2026. Made simpler. Practical tools by My Social Impact.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function SocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#faf9f6",
          color: "#242329",
          padding: "65px 75px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 26 }}>SORP 2026</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 55,
            fontSize: 88,
            letterSpacing: -5,
            lineHeight: 1.05,
          }}
        >
          <span>SORP 2026.</span>
          <span style={{ color: "#77717d" }}>Made simpler.</span>
        </div>
        <div style={{ display: "flex", marginTop: 45, gap: 20, fontSize: 24 }}>
          <div
            style={{
              display: "flex",
              background: "#ff633b",
              padding: "20px 25px",
            }}
          >
            Are You SORP Ready? · Live beta
          </div>
          <div
            style={{
              display: "flex",
              background: "#e7e2f1",
              padding: "20px 25px",
            }}
          >
            Ask SORP · Coming soon
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 35, fontSize: 21 }}>
          Developed by My Social Impact
        </div>
      </div>
    ),
    size,
  );
}
