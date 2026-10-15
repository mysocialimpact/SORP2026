"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Arrow } from "./ui";

export function AccountControl({ onNavigate }: { onNavigate?: () => void }) {
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
    <Link className="gateway-account-control" href={signedIn ? "/dashboard/" : "/login/"} onClick={onNavigate}>
      {signedIn ? "My Dashboard" : "Log in"}
      <Arrow diagonal />
    </Link>
  );
}

