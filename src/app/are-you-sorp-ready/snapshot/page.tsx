import type { Metadata } from "next";
import { SorpSnapshotLegacyGate } from "../../sorp-snapshot-legacy-gate";
import "../../sorp-ready.css";

export const metadata: Metadata = {
  title: "SORP Ready Snapshot",
  description: "Complete the free My Social Impact SORP 2026 readiness snapshot, focused on narrative and impact reporting.",
};

export default function Page() {
  return <SorpSnapshotLegacyGate />;
}
