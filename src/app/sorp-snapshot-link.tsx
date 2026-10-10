"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "msi-sorp-readiness-v2";

export function SorpSnapshotLink({ className, startLabel = "Check your readiness", arrow = "→" }: { className?: string; startLabel?: string; arrow?: string }) {
  const [state, setState] = useState<"start" | "continue" | "result">("start");

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { mode?: string; coreAnswers?: Record<string, string> };
        if (saved.mode === "result") setState("result");
        else if ((saved.mode && saved.mode !== "welcome") || Object.keys(saved.coreAnswers ?? {}).length > 0) setState("continue");
      } catch {
        setState("start");
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const href = state === "result" ? "/are-you-sorp-ready/results" : "/are-you-sorp-ready/snapshot";
  const label = state === "result" ? "View your result" : state === "continue" ? "Continue your snapshot" : startLabel;

  return <Link className={className} href={href}>{label} <span>{arrow}</span></Link>;
}
