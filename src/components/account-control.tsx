"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AccountControl({ onNavigate }: { onNavigate?: () => void }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        setSignedIn(response.ok && data.signedIn === true);
      })
      .catch(() => setSignedIn(false));
    return () => controller.abort();
  }, []);
  return (
    <Link className="gateway-account-control" href={signedIn ? "/dashboard/" : "/login/"} onClick={onNavigate}>
      {signedIn === null ? "Account" : signedIn ? "My Dashboard" : "Log in"}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}

