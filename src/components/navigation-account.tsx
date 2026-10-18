"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isReadinessComplete } from "@/lib/readiness-status";

type NavigationAccountState = {
  pathname?: string;
  status: "checking" | "signed-out" | "signed-in" | "unavailable";
  readinessComplete: boolean;
  founder: boolean;
};

const NavigationAccountContext = createContext<NavigationAccountState>({ status: "checking", readinessComplete: false, founder: false });

export function NavigationAccountProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<NavigationAccountState>({ status: "checking", readinessComplete: false, founder: false });

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok && response.status !== 401) throw new Error("Account status unavailable");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setState(data.signedIn === true
          ? { pathname, status: "signed-in", readinessComplete: isReadinessComplete(data.progress), founder: data.platformAccess?.founder === true }
          : { pathname, status: "signed-out", readinessComplete: false, founder: false });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ pathname, status: "unavailable", readinessComplete: false, founder: false }); });
    return () => controller.abort();
  }, [pathname]);

  const current = state.pathname === pathname ? state : { status: "checking" as const, readinessComplete: false, founder: false };
  return <NavigationAccountContext.Provider value={current}>{children}</NavigationAccountContext.Provider>;
}

export function useNavigationAccount() { return useContext(NavigationAccountContext); }
