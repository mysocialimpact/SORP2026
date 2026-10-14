import type { Metadata } from "next";
import { AskSorpWorkspace } from "@/components/ask-sorp-workspace";
import "../../assessment-mode.css";
import "../ask-sorp.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Ask SORP workspace",
  description: "Ask questions about SORP 2026 and read evidence-led answers with official references.",
  robots: { index: false, follow: false },
};

export default async function AskSorpWorkspacePage({ searchParams }: { searchParams: Promise<{ question?: string | string[] }> }) {
  const parameters = await searchParams;
  const question = typeof parameters.question === "string" ? parameters.question.slice(0, 1200) : "";
  return <AskSorpWorkspace initialQuestion={question} />;
}
