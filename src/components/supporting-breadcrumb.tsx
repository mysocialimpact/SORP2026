import Link from "next/link";

export function SupportingBreadcrumb({ current }: { current: string }) {
  return (
    <nav className="supporting-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}
