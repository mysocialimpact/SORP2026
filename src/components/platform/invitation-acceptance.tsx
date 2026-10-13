"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function InvitationAcceptance({token}:{token:string}) {
  const [signedIn,setSignedIn]=useState<boolean|null>(null); const [email,setEmail]=useState(""); const [status,setStatus]=useState<"ready"|"busy"|"accepted"|"error">("ready"); const [message,setMessage]=useState("");
  useEffect(()=>{const controller=new AbortController();void fetch("/api/readiness-account/",{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json().catch(()=>({}));setSignedIn(response.ok&&data.signedIn===true);setEmail(data.account?.email||"");}).catch(()=>setSignedIn(false));return()=>controller.abort();},[]);
  async function accept(){setStatus("busy");setMessage("");const response=await fetch("/api/readiness-account/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"invitation-accept",invitationToken:token})});const data=await response.json().catch(()=>({}));if(response.ok){setStatus("accepted");setMessage("Invitation accepted. Your workspace is now connected to this account.");}else{setStatus("error");setMessage(data.error||"The invitation could not be accepted.");}}
  const next=`/invitation/${encodeURIComponent(token)}/`;
  return <section className="account-panel" style={{maxWidth:760,margin:"70px auto 120px"}}><p className="gateway-kicker">Secure SORP2026 invitation</p><h1 style={{fontSize:"clamp(52px,8vw,100px)",letterSpacing:"-.07em",lineHeight:.9}}>You’re invited.</h1>{signedIn===null?<p>Checking your account…</p>:signedIn===false?<><p>Sign in or create your SORP2026 account using the email address that received the invitation. You’ll return here to accept it.</p><Link className="gateway-action" href={`/login/?next=${encodeURIComponent(next)}`}>Sign in to accept →</Link></>:status==="accepted"?<><p role="status">{message}</p><Link className="gateway-action" href="/dashboard/">Open My Dashboard →</Link></>:<><p>You are signed in as <strong>{email}</strong>. Accepting connects only the organisation and permissions described in your invitation. It never starts billing.</p>{message&&<p role="alert">{message}</p>}<button className="gateway-action" type="button" onClick={()=>void accept()} disabled={status==="busy"}>{status==="busy"?"Accepting…":"Accept invitation →"}</button></>}</section>;
}
