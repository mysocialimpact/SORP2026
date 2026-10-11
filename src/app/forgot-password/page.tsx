import type { Metadata } from "next";
import { PasswordRecovery } from "@/components/password-recovery";
export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };
export default function Page() { return <PasswordRecovery />; }
