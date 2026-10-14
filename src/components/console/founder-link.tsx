"use client";

import Link from "next/link";
import {useEffect,useState} from "react";

type Platform={founder?:boolean;memberships?:Array<{organisationId:string;name:string;type:string;role:string;entitlement?:{plan?:string}}>};

export function FounderConsoleLink(){
  const [research,setResearch]=useState(false);const [platform,setPlatform]=useState<Platform>({});
  useEffect(()=>{const controller=new AbortController();void fetch("/api/console/access/",{cache:"no-store",signal:controller.signal}).then(response=>{if(response.ok)setResearch(true);}).catch(()=>{});void fetch("/api/readiness-account/",{cache:"no-store",credentials:"same-origin",signal:controller.signal}).then(async response=>{const data=await response.json().catch(()=>({}));if(response.ok&&data.signedIn===true)setPlatform(data.platformAccess||{});}).catch(()=>{});return()=>controller.abort();},[]);
  const adviser=platform.memberships?.find(item=>item.type==="Adviser"&&["Adviser","Enterprise"].includes(item.entitlement?.plan||""));
  if(!research&&!platform.founder&&!adviser)return null;
  return <nav className="dashboard-tools-strip" aria-label="Private workspaces"><span>Private workspaces</span>{platform.founder&&<Link href="/founder/">Founder Control Centre</Link>}{adviser&&<Link href="/adviser/">{adviser.name} clients</Link>}{research&&<Link href="/console/">Research console</Link>}</nav>;
}
