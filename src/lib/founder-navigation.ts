import type { AdminSection, ProductKey } from "@/components/founder/founder-model";

export type FounderView = ProductKey | AdminSection;

export const FOUNDER_PRODUCT_VIEWS: ProductKey[] = ["home", "readiness", "askSorp", "impactReports", "excellence", "impactDirector"];

export const FOUNDER_ADMIN_NAV: Array<{ key: AdminSection; label: string }> = [
  { key: "organisations", label: "Organisations & Users" },
  { key: "billing", label: "Accounts & Billing" },
  { key: "accountants", label: "Accountants & Advisers" },
  { key: "feedback", label: "Feedback & Enquiries" },
  { key: "platform", label: "Platform Management" },
];

export const FOUNDER_VIEW_EVENT = "sorp2026:founder-view";

const VALID_VIEWS = new Set<FounderView>([...FOUNDER_PRODUCT_VIEWS, ...FOUNDER_ADMIN_NAV.map(item => item.key)]);

export function founderViewFromHash(hash: string): FounderView {
  const candidate = hash.replace(/^#/, "") as FounderView;
  return VALID_VIEWS.has(candidate) ? candidate : "home";
}

export function founderPrimaryView(view: FounderView): ProductKey {
  return FOUNDER_PRODUCT_VIEWS.includes(view as ProductKey) ? view as ProductKey : "home";
}

export function announceFounderView(view: FounderView) {
  window.dispatchEvent(new CustomEvent(FOUNDER_VIEW_EVENT, { detail: { view } }));
}

export function navigateFounderView(view: FounderView) {
  if (window.location.hash !== `#${view}`) window.location.hash = view;
  announceFounderView(view);
}
