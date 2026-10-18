"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Invitation = { email:string; role:string; status:string; organisationId:string; organisationName:string; organisationType:string; expiresAt:string };

function roleLabel(value:string) { return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()); }

function dashboardLabel(invitation: Invitation | null) {
  return invitation?.organisationType === "Adviser" ? "Adviser Dashboard" : "organisation dashboard";
}

export function InvitationAcceptance({token}:{token:string}) {
  const router = useRouter();
  const [signedIn,setSignedIn]=useState<boolean|null>(null); const [email,setEmail]=useState(""); const [invitation,setInvitation]=useState<Invitation|null>(null); const [status,setStatus]=useState<"ready"|"busy"|"accepted"|"error">("ready"); const [message,setMessage]=useState("");
  useEffect(()=>{const controller=new AbortController();void Promise.all([
    fetch("/api/readiness-account/",{cache:"no-store",signal:controller.signal}),
    fetch("/api/readiness-account/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"invitation-preview",invitationToken:token}),cache:"no-store",signal:controller.signal}),
  ]).then(async([accountResponse,invitationResponse])=>{const [accountData,invitationData]=await Promise.all([accountResponse.json().catch(()=>({})),invitationResponse.json().catch(()=>({}))]);setSignedIn(accountResponse.ok&&accountData.signedIn===true);setEmail(accountData.account?.email||"");if(!invitationResponse.ok)throw new Error(invitationData.error||"This invitation could not be opened.");setInvitation(invitationData.invitation);}).catch(caught=>{if(!controller.signal.aborted){setSignedIn(false);setStatus("error");setMessage(caught instanceof Error?caught.message:"This invitation could not be opened.");}});return()=>controller.abort();},[token]);
  const next=`/invitation/${encodeURIComponent(token)}/`;
  const destination=invitation?.organisationType==="Adviser"?"/adviser/":"/dashboard/";
  const matches=Boolean(invitation&&email&&invitation.email.toLowerCase()===email.toLowerCase());
  async function accept(){setStatus("busy");setMessage("");const response=await fetch("/api/readiness-account/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"invitation-accept",invitationToken:token})});const data=await response.json().catch(()=>({}));if(response.ok){setStatus("accepted");setMessage(`Invitation accepted. Opening ${invitation?.organisationName||"your organisation"}…`);window.setTimeout(()=>router.push(destination),700);}else{setStatus("error");setMessage(data.error||"The invitation could not be accepted.");}}
  async function switchAccount(){setStatus("busy");setMessage("");const response=await fetch("/api/readiness-account/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"logout"})});if(response.ok)router.push(`/login/?mode=login&next=${encodeURIComponent(next)}`);else{setStatus("error");setMessage("We could not sign out securely. Please try again.");}}
  const unavailable=invitation&&["revoked","expired"].includes(invitation.status);
  const accepted=invitation?.status==="accepted"||status==="accepted";
  const loading=signedIn===null||(!invitation&&!message);
  const organisation=invitation?.organisationName;
  const role=invitation?.role?roleLabel(invitation.role):"member";
  return <section className="invitation-card" aria-labelledby="invitation-title">
    <p className="gateway-kicker">Your secure SORP 2026 invitation</p>
    <h1 id="invitation-title">{organisation?`Welcome to ${organisation}.`:"Opening your invitation…"}</h1>
    {loading?<p className="invitation-loading" role="status">Just a moment while we check the invitation securely.</p>
    :message&&(!invitation||unavailable)?<p className="invitation-notice is-error" role="alert">{message}</p>
    :unavailable?<div className="invitation-content"><p className="invitation-notice is-error" role="alert">This invitation is {invitation.status}. Please ask {organisation} to send you a new one.</p><Link className="gateway-action" href="/">Return to SORP 2026 <span aria-hidden="true">→</span></Link></div>
    :accepted?<div className="invitation-content"><p className="invitation-lead" role="status">{message||`You have already joined ${organisation}. Everything is ready for you.`}</p><Link className="gateway-action" href={destination}>Open your {dashboardLabel(invitation)} <span aria-hidden="true">→</span></Link></div>
    :signedIn===false?<div className="invitation-content">
      <p className="invitation-lead"><strong>{organisation}</strong> has invited you to join its SORP 2026 workspace with the {role} role.</p>
      <div className="invitation-next" aria-labelledby="invitation-next-title">
        <h2 id="invitation-next-title">Here’s what happens next.</h2>
        <ol>
          <li><span>01</span><div><strong>Create your account</strong><p>Use <b>{invitation?.email}</b>. You’ll create your own secure password as part of registration.</p></div></li>
          <li><span>02</span><div><strong>Accept the invitation</strong><p>We’ll bring you straight back here, with your invitation safely preserved.</p></div></li>
          <li><span>03</span><div><strong>Start with {organisation}</strong><p>You’ll go directly to your {dashboardLabel(invitation)}.</p></div></li>
        </ol>
      </div>
      <div className="invitation-actions">
        <Link className="gateway-action" href={`/get-started/?next=${encodeURIComponent(next)}`}>Create my account <span aria-hidden="true">→</span></Link>
        <Link className="invitation-existing" href={`/login/?mode=login&next=${encodeURIComponent(next)}`}>Already use SORP 2026 with {invitation?.email}? Log in instead</Link>
      </div>
    </div>
    :!matches?<div className="invitation-content">
      <p className="invitation-lead">You’re nearly there, but this invitation was sent to <strong>{invitation?.email}</strong> and you’re signed in with a different account.</p>
      <p className="invitation-notice">To keep {organisation}’s workspace secure, please switch to the invited account. Your invitation will be waiting for you.</p>
      {message&&<p className="invitation-notice is-error" role="alert">{message}</p>}
      <button className="gateway-action" type="button" onClick={()=>void switchAccount()} disabled={status==="busy"}>{status==="busy"?"Signing out…":"Switch to the invited account →"}</button>
    </div>
    :<div className="invitation-content">
      <p className="invitation-lead">Welcome. You’re signed in as <strong>{email}</strong> and ready to join <strong>{organisation}</strong> with the {role} role.</p>
      <p className="invitation-notice">Accepting will add you to {organisation} and take you directly to your {dashboardLabel(invitation)}.</p>
      {message&&<p className="invitation-notice is-error" role="alert">{message}</p>}
      <button className="gateway-action" type="button" onClick={()=>void accept()} disabled={status==="busy"}>{status==="busy"?"Joining…":`Join ${organisation} →`}</button>
    </div>}
  </section>;
}
