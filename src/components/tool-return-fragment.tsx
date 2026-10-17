"use client";
import { useLayoutEffect } from "react";
import { safeDestination } from "@/lib/onboarding/state";
import { isToolPage } from "@/lib/tool-access-policy";

/** Fragments never reach the server. Preserve a direct tool link's inherited
 * fragment at the gateway before the existing onboarding begins. */
export function ToolReturnFragment() {
  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    const next = safeDestination(url.searchParams.get("next"));
    if (!url.hash || next.includes("#") || !isToolPage(new URL(next, url.origin).pathname)) return;
    url.searchParams.set("next", `${next}${url.hash}`);
    url.hash = "";
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, []);
  return null;
}
