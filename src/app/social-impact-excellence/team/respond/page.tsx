import type { Metadata } from "next";
import { TeamResponse } from "@/features/excellence/team-response";

export const metadata: Metadata = { title: "Your Team Perspective | Social Impact Excellence", robots: { index: false, follow: false } };
export default function TeamResponsePage() { return <TeamResponse/>; }
