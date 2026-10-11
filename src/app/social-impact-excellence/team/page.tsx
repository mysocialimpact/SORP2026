import type { Metadata } from "next";
import { TeamWorkspace } from "@/features/excellence/team-workspace";

export const metadata: Metadata = { title: "Team Perspective | Social Impact Excellence", robots: { index: false, follow: false } };
export default function TeamPage() { return <TeamWorkspace/>; }
