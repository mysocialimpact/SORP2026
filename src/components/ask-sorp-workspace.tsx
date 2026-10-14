"use client";

import { useEffect, useRef, useState } from "react";
import { AskSorpLive } from "@/components/ask-sorp-live";
import { ProductWorkspaceHeader } from "@/components/product-workspace-header";

export function AskSorpWorkspace({ initialQuestion = "" }: { initialQuestion?: string }) {
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      if (viewport.scale === 1) root.current?.style.setProperty("--ask-viewport-height", `${viewport.height}px`);
    };
    resize();
    viewport.addEventListener("resize", resize);
    return () => viewport.removeEventListener("resize", resize);
  }, []);
  return <main ref={root} id="main" className="ask-workspace-page">
    <ProductWorkspaceHeader
      productName="Ask SORP"
      showAccount
      backHref="/ask-sorp/"
      busy={busy}
      busyMessage="Ask SORP is still checking the source. Leave the workspace?"
    />
    <div className="ask-workspace">
      <AskSorpLive mode="workspace" initialQuestion={initialQuestion} onBusyChange={setBusy} />
    </div>
  </main>;
}
