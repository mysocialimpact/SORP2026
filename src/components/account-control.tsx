"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Arrow } from "./ui";

export function AccountControl({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const next = path === "/" ? "/dashboard/" : path;
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [founder,setFounder]=useState(false);
  const [adviser,setAdviser]=useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        const active=response.ok && data.signedIn === true;
        setSignedIn(active);
        setFounder(active && data.platformAccess?.founder === true);
        setAdviser(active && Array.isArray(data.platformAccess?.memberships) && data.platformAccess.memberships.some((item:{type?:string;entitlement?:{plan?:string}})=>item.type==="Adviser"&&["Adviser","Enterprise"].includes(item.entitlement?.plan||"")));
      })
      .catch(() => setSignedIn(false));
    return () => controller.abort();
  }, []);
  if(founder||adviser)return <div className="gateway-account-group">{founder&&<Link className="gateway-founder-control" href="/founder/" onClick={onNavigate}>Founder <Arrow diagonal /></Link>}{adviser&&<Link className="gateway-founder-control" href="/adviser/" onClick={onNavigate}>Adviser <Arrow diagonal /></Link>}<Link className="gateway-account-control" href="/dashboard/" onClick={onNavigate}>My Dashboard <Arrow diagonal /></Link></div>;
  return (
    <Link className="gateway-account-control" href={signedIn ? "/dashboard/" : `/get-started/?next=${encodeURIComponent(next)}`} onClick={event => {
      onNavigate?.();
      if (!signedIn && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        const current = new URLSearchParams(window.location.search);
        const target = new URLSearchParams({ next: path === "/get-started" || path === "/get-started/" ? current.get("next") || current.get("return") || "/dashboard/" : path === "/" ? "/dashboard/" : `${path}${window.location.search}${window.location.hash}` });
        for (const key of ["utm_source", "utm_medium", "utm_campaign"]) if (current.has(key)) target.set(key, current.get(key)!.slice(0,200));
        router.push(`/get-started/?${target}`);
      }
    }}>
      {signedIn ? "My Dashboard" : "Let’s Get Started"}
      <Arrow diagonal />
    </Link>
  );
}

