"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Candidate } from "@/app/sorp-public-model";
import type { Facts } from "@/lib/onboarding/state";
import "./shared-context.css";
export type SharedContext = {
  account: { name: string; email: string };
  facts?: Facts;
  charity?: { candidate: Candidate; status: string };
  documents?: { title: string; source_url: string; status: string }[];
};
export async function loadSharedContext(
  signal?: AbortSignal,
): Promise<SharedContext | null> {
  const response = await fetch("/api/onboarding/context/", {
    cache: "no-store",
    signal,
  });
  if (response.ok) return response.json();
  return null;
}
export function SharedCharityContext() {
  const path = usePathname(),
    [context, setContext] = useState<SharedContext | null>(null);
  const show =
    /^\/(are-you-sorp-ready|ask-sorp|charity-impact-reports|social-impact-excellence|my-impact-director|dashboard)(\/|$)/.test(
      path,
    );
  useEffect(() => {
    if (!show) return;
    const controller = new AbortController();
    void loadSharedContext(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setContext(value);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [show, path]);
  if (!show || !context?.charity) return null;
  const charity = context.charity;
  return (
    <aside
      className="shared-charity-context"
      aria-label="Your shared charity context"
    >
      <div>
        <span>Welcome back, {context.account.name.split(" ")[0]}.</span>
        <strong>Let’s look at {charity.candidate.name}.</strong>
      </div>
      <details>
        <summary>
          {context.documents?.some((d) => d.status === "stored")
            ? "Public documents prepared"
            : context.documents?.length
              ? "Public report links found"
              : ["queued", "running"].includes(charity.status)
                ? "Charity information is being prepared"
                : "Your charity information"}
        </summary>
        <div>
          <a
            href={charity.candidate.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Official charity record ↗
          </a>
          {context.documents?.map((d) => (
            <a
              key={d.source_url}
              href={
                d.status === "stored"
                  ? `/api/onboarding/document/?source=${encodeURIComponent(d.source_url)}`
                  : d.source_url
              }
              target="_blank"
              rel="noreferrer"
            >
              {d.title} ·{" "}
              {d.status === "stored" ? "saved copy prepared" : "source link"} ↗
            </a>
          ))}
          <small>
            Shared public information. Your account, conversations and product
            work remain private.
          </small>
        </div>
      </details>
    </aside>
  );
}
