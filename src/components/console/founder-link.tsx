"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function FounderConsoleLink() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/console/access/", { cache: "no-store", signal: c.signal })
      .then((r) => {
        if (r.ok) setAllowed(true);
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  return allowed ? (
    <aside className="dashboard-state">
      <p className="gateway-kicker">Your founder workspace · private</p>
      <h2>The research console.</h2>
      <p>
        Discover charity-accounting expertise, inspect the evidence and build
        your shortlist.
      </p>
      <Link className="gateway-action" href="/console/">
        Open research console ↗
      </Link>
    </aside>
  ) : null;
}
