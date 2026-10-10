"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SorpWorkspace } from "./sorp-workspace";

export function SorpSnapshotLegacyGate() {
  const router = useRouter();
  const [hasSavedSnapshot, setHasSavedSnapshot] = useState(false);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("msi-sorp-readiness-v2");
        const saved = raw ? JSON.parse(raw) as { setupWorkflow?: unknown } : null;
        if (saved?.setupWorkflow) {
          setHasSavedSnapshot(true);
          return;
        }
      } catch {
        // An unreadable old draft should not open a second public entry route.
      }
      router.replace("/are-you-sorp-ready/conversation");
    }, 0);
    return () => window.clearTimeout(restore);
  }, [router]);

  return hasSavedSnapshot ? <SorpWorkspace view="snapshot" /> : <main className="sorp-snapshot-redirect" role="status">Opening your free SORP readiness check…</main>;
}
