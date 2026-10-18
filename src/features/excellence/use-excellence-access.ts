"use client";

import { useEffect, useState } from "react";
import type { ExcellenceAccess, ExcellencePillar } from "@/lib/excellence/access-policy";

export type CustomerExcellenceAccess = {
  organisation: { id: string; name: string } | null;
  access: ExcellenceAccess;
  legacy: boolean;
  ambiguous: boolean;
  maturity: { status: string; percentage: number; score: number | null; completed: boolean; available: boolean };
  pillars: Record<ExcellencePillar, { status: string; percentage: number; score: number | null; available: boolean }>;
};

export function useExcellenceAccess() {
  const [access, setAccess] = useState<CustomerExcellenceAccess | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/excellence-access/", { cache:"no-store", signal:controller.signal })
      .then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Your access could not be checked."); setAccess(payload); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Your access could not be checked."); });
    return () => controller.abort();
  }, []);
  return { access, error };
}
