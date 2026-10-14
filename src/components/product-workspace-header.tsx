"use client";

import Link from "next/link";
import { AccountControl } from "./account-control";

type ProductWorkspaceHeaderProps = {
  productName: string;
  backHref: string;
  busy?: boolean;
  busyMessage?: string;
  showAccount?: boolean;
};

export function ProductWorkspaceHeader({ productName, backHref, busy = false, busyMessage, showAccount = false }: ProductWorkspaceHeaderProps) {
  return <header className="scr-assessment-header">
    <div className="scr-assessment-lockup" aria-label={`SORP 2026, ${productName}`}>
      <span className="scr-assessment-wordmark"><strong>SORP</strong> 2026<i aria-hidden="true" /></span>
      <span className="scr-assessment-divider" aria-hidden="true" />
      <strong className="scr-assessment-name">{productName}</strong>
    </div>
    {showAccount && <div className="workspace-account"><AccountControl /></div>}
    <Link className="scr-assessment-exit" href={backHref} onClick={(click) => {
      if (busy && !window.confirm(busyMessage || "This step is still working. Leave the application?")) click.preventDefault();
    }}><span aria-hidden="true">←</span><span className="scr-assessment-exit-label">Back to website</span></Link>
  </header>;
}
