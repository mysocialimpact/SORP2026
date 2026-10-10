import Link from "next/link";
import { Eyebrow } from "./ui";
export function Article({
  title,
  eyebrow,
  lead,
  children,
}: {
  title: string;
  eyebrow: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="shell article-shell">
      <div className="breadcrumbs">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        {title}
      </div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      <p className="article-lead">{lead}</p>
      <div className="article-body">{children}</div>
    </main>
  );
}
