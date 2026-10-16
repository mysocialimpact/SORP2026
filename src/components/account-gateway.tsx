"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { currentAccountDestination, registrationHref, signInHref } from "@/lib/account-navigation";

/** Existing products keep their local draft; account creation has one home. */
export function AccountGateway({ returnTo, onLeave }: { returnTo: string; onLeave?: () => void }) {
  const [destination, setDestination] = useState(returnTo);
  useEffect(() => { setDestination(currentAccountDestination()); }, []);
  function navigate(event: React.MouseEvent<HTMLAnchorElement>, signIn = false) {
    // Keep modified clicks and open-in-new-tab behaviour conventional.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onLeave?.();
    const destination = currentAccountDestination();
    window.location.assign(signIn ? signInHref(destination) : registrationHref(destination));
  }
  return <div className="account-gateway">
    <p>One account for your SORP2026 tools. Your progress stays on this device while you register or sign in.</p>
    <Link className="gateway-action" href={registrationHref(destination)} onClick={event => navigate(event)}>Let’s get started →</Link>
    <p><Link className="account-forgot" href={signInHref(destination)} onClick={event => navigate(event, true)}>Already registered? Sign in</Link></p>
  </div>;
}
