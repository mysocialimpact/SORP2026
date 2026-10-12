"use client";

import { useState } from "react";

export function AskSorpLive({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="ask-live" aria-labelledby="ask-live-title">
      <header className="ask-live-bar">
        <div>
          <span className="ask-live-dot" aria-hidden="true" />
          <strong id="ask-live-title">Ask SORP · Live beta</strong>
          <small>{loaded ? "Assistant ready" : "Opening the assistant…"}</small>
        </div>
        <a href={src} target="_blank" rel="noreferrer">Open in a new window ↗</a>
      </header>
      <iframe
        className="ask-live-frame"
        src={src}
        title="Ask SORP live assistant"
        allow="microphone"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
      <noscript><p><a href={src}>Open the live Ask SORP assistant</a>.</p></noscript>
    </section>
  );
}
