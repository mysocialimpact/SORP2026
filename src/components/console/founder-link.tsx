"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function FounderConsoleLink() {
  const [allowed, setAllowed] = useState(false);
  const [founderAllowed, setFounderAllowed] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/console/access/", { cache: "no-store", signal: c.signal })
      .then((r) => {
        if (r.ok) setAllowed(true);
      })
      .catch(() => {});
    fetch("/api/founder/dashboard/", { cache: "no-store", credentials: "same-origin" })
      .then((r) => { if (r.ok) setFounderAllowed(true); })
      .catch(() => {});
    return () => c.abort();
  }, []);
  return allowed || founderAllowed ? (
    <aside className="dashboard-state">
      {founderAllowed && <><p className="gateway-kicker">Founder workspace · private</p><h2>Control the platform.</h2><p>Manage organisations, complimentary access, invitations and authorised client relationships.</p><Link className="gateway-action" href="/founder/">Open Founder Control Centre →</Link></>}
      {allowed && <><p className="gateway-kicker">Your research workspace · private</p><h2>The research console.</h2><p>Discover charity-accounting expertise, inspect the evidence and build your shortlist.</p><Link className="gateway-action" href="/console/">Open research console →</Link></>}
    </aside>
  ) : null;
}
