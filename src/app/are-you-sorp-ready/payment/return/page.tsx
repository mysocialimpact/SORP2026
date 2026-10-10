import type { Metadata } from "next";
import { SorpPaymentReturn } from "../../../sorp-payment-return";
import "../../../sorp-ready.css";

export const metadata: Metadata = { title: "SORP readiness payment", robots: { index: false, follow: false } };

export default function Page() { return <SorpPaymentReturn />; }
