"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { accountStatus, type StatusAccountPayload } from "@/lib/account-status";
import { buildInformation, formatBuildTimestamp } from "@/lib/build-information";

export function BuildInformationBar() {
  const pathname = usePathname();
  const { number, version, deployedAt, environment } = buildInformation;
  const [payload, setPayload] = useState<StatusAccountPayload | null>(null);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/readiness-account/", { cache: "no-store", signal });
      if (response.status === 401) {
        setPayload({ signedIn: false });
        setUnavailable(false);
        return;
      }
      if (!response.ok) throw new Error("Account status unavailable");
      setPayload(await response.json());
      setUnavailable(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setUnavailable(true);
    } finally { if (!signal?.aborted) setChecking(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [pathname, refresh]);
  useEffect(() => {
    const update = () => void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") update(); };
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    window.addEventListener("sorp2026:account-changed", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("sorp2026:account-changed", update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
  const status = accountStatus(payload);
  const statusLabel = checking ? "CHECKING ACCOUNT" : unavailable ? "ACCOUNT STATUS UNAVAILABLE" : status.label;
  const compactStatusLabel = checking ? "CHECKING" : unavailable ? "STATUS UNAVAILABLE" : status.compactLabel;
  const isolated = process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === "true";
  const environmentLabel = environment === "production" ? "PRODUCTION" : environment === "preview" ? "PREVIEW" : "DEVELOPMENT";
  const compactEnvironmentLabel = environment === "production" ? "PROD" : environment === "preview" ? "PREVIEW" : "DEV";
  return <aside className="build-information-bar" aria-label="Website build information and account status" data-build={number} data-version={version} data-environment={environment} data-plan={status.plan.toLowerCase()} data-founder={String(status.founder)}>
    <span className="build-release"><strong>BETA</strong><span aria-hidden="true">·</span><span>v{version}</span>{deployedAt ? <><span aria-hidden="true">·</span><time dateTime={deployedAt}><span className="build-time-full">Updated {formatBuildTimestamp(deployedAt)}</span><span className="build-time-compact">{formatBuildTimestamp(deployedAt).replace(/ \d{4},/, " ·")}</span></time></> : <><span aria-hidden="true">·</span><span>Local</span></>}</span>
    <span className="build-account"><span className="build-environment-full">{environmentLabel} ·</span><span className="build-environment-compact">{compactEnvironmentLabel} ·</span><span aria-live="polite"><span className="build-account-full">{statusLabel}</span><span className="build-account-compact">{compactStatusLabel}</span></span></span>
    {environment === "preview" && isolated && <span className="build-isolation-note"><strong>PREVIEW</strong> · Synthetic services · AI &amp; payments off</span>}
  </aside>;
}
