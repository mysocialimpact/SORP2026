import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "./ui";

type ProductAdviserNoteProps = {
  title: string;
  children: ReactNode;
};

export function ProductAdviserNote({ title, children }: ProductAdviserNoteProps) {
  return (
    <aside className="product-adviser-note gateway-width" aria-labelledby="product-adviser-title">
      <p className="gateway-kicker">For accountants &amp; advisers</p>
      <div>
        <h2 id="product-adviser-title">{title}</h2>
        <p>{children}</p>
      </div>
      <Link className="gateway-quiet-link" href="/for-advisers/">
        How we work alongside advisers <Arrow diagonal />
      </Link>
    </aside>
  );
}
