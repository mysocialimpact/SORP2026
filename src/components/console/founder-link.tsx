"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function FounderConsoleLink() {
  const [allowed, setAllowed] = useState(false);
  const [platform, setPlatform] = useState<{founder?:boolean;memberships?:Array<{organisationId:string;name:string;type:string;role:string;entitlement?:{plan?:string;status?:string}}>;approvalRequests?:Array<{id:string;adviserName:string;charityName:string;permissions:{progress:boolean;answers:boolean;edit:boolean;invitations:boolean}}>;activeClientAccess?:Array<{id:string;adviserName:string;charityName:string;permissions:{progress:boolean;answers:boolean;edit:boolean;invitations:boolean}}>}>({});
  const [notice,setNotice]=useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/console/access/", { cache: "no-store", signal: c.signal })
      .then((r) => {
        if (r.ok) setAllowed(true);
      })
      .catch(() => {});
    fetch("/api/readiness-account/", { cache: "no-store", credentials: "same-origin" })
      .then(async r => { const data=await r.json().catch(()=>({})); if(r.ok&&data.signedIn===true)setPlatform(data.platformAccess||{}); })
      .catch(() => {});
    return () => c.abort();
  }, []);
  async function decide(id:string,decision:"approve"|"deny") { const response=await fetch("/api/readiness-account/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"client-access-decide",accessId:id,decision})});const data=await response.json().catch(()=>({}));if(response.ok){setPlatform(current=>{const request=(current.approvalRequests||[]).find(item=>item.id===id);const active=(current.activeClientAccess||[]).filter(item=>item.id!==id);if(decision==="approve"&&request)active.push(request);return {...current,approvalRequests:(current.approvalRequests||[]).filter(item=>item.id!==id),activeClientAccess:active};});setNotice(decision==="approve"?"Adviser access approved.":"Adviser access revoked or declined.");}else setNotice(data.error||"That decision could not be saved."); }
  const advisers=(platform.memberships||[]).filter(item=>item.type==="Adviser"&&["Adviser","Enterprise"].includes(item.entitlement?.plan||""));
  return allowed || platform.founder || advisers.length || platform.approvalRequests?.length || platform.activeClientAccess?.length || notice ? <div className="dashboard-private-tools">
    {platform.founder&&<aside className="dashboard-state dashboard-state--founder"><p className="gateway-kicker">Founder Control Centre · private</p><h2>Control the platform.</h2><p>Manage organisations, live invitations, complimentary plans and consent-based adviser access.</p><Link className="gateway-action" href="/founder/">Open Founder Control Centre →</Link></aside>}
    {advisers.length>0&&<aside className="dashboard-state"><p className="gateway-kicker">Adviser workspace</p><h2>{advisers[0].name}</h2><p>{advisers[0].entitlement?.plan||"Adviser"} Plan · {advisers[0].entitlement?.status==="complimentary_partner"?"Complimentary Partner":advisers[0].role}</p><Link className="gateway-action" href="/adviser/">Open adviser clients →</Link></aside>}
    {(platform.approvalRequests||[]).map(request=><aside className="dashboard-state" key={request.id}><p className="gateway-kicker">Your charity controls its data</p><h2>{request.adviserName} has requested access.</h2><p>{request.charityName} · Progress{request.permissions.answers?" and individual answers":""}{request.permissions.edit?" · Editing requested":" · Read-only"}</p><div className="dashboard-consent-actions"><button type="button" onClick={()=>void decide(request.id,"approve")}>Approve access</button><button type="button" onClick={()=>void decide(request.id,"deny")}>Decline</button></div></aside>)}
    {(platform.activeClientAccess||[]).map(access=><aside className="dashboard-state" key={access.id}><p className="gateway-kicker">Authorised adviser access</p><h2>{access.adviserName} can access {access.charityName}.</h2><p>Progress{access.permissions.answers?" and individual answers":""}{access.permissions.edit?" · Editing allowed":" · Read-only"}</p><div className="dashboard-consent-actions"><button type="button" onClick={()=>void decide(access.id,"deny")}>Revoke access</button></div></aside>)}
    {notice&&<p className="dashboard-consent-notice" role="status">{notice}</p>}
    {allowed&&<aside className="dashboard-state"><p className="gateway-kicker">Your research workspace · private</p><h2>The research console.</h2><p>Discover charity-accounting expertise, inspect the evidence and build your shortlist.</p><Link className="gateway-action" href="/console/">Open research console →</Link></aside>}
  </div>:null;
}
