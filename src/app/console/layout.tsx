import type { Metadata } from "next";
import "./console.css";
export const metadata: Metadata = {
  title: "Private research console",
  robots: { index: false, follow: false },
};
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="research-console">{children}</div>;
}
