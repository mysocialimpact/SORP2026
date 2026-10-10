"use client";

import { useEffect, useState } from "react";

// Presentation only: no preview data is passed into research or assessment.
export function SorpIdentityPreview({ website, name }: { website: string; name: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  let homepage = "";
  try {
    const url = new URL(website);
    if (url.protocol === "https:" && !url.username && !url.password) homepage = `${url.origin}/`;
  } catch { /* Missing or invalid websites retain the text-only confirmation. */ }

  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => setStatus("failed"), 20000);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (!homepage || status === "failed") return null;
  return <figure className={`scr-website-preview${status === "ready" ? " is-ready" : ""}`}>
    <figcaption>OFFICIAL WEBSITE PREVIEW</figcaption>
    <div className="scr-website-preview-image" aria-busy={status === "loading"}>
      {status === "loading" && <span role="status">Loading website preview…</span>}
      {/* A static image works even when the charity blocks iframe embedding. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://image.thum.io/get/noanimate/width/1000/crop/600/${homepage}`} alt={`${name} official homepage — logo, header and branding`} width={1000} height={500} referrerPolicy="no-referrer" decoding="async" onLoad={event => setStatus(event.currentTarget.naturalWidth >= 400 ? "ready" : "failed")} onError={() => setStatus("failed")} />
    </div>
  </figure>;
}
