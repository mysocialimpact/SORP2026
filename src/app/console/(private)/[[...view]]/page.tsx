import { ConsoleApp } from "@/components/console/console-app";
import { protectPage } from "@/lib/console/auth";
export default async function ConsolePage() {
  await protectPage();
  return <ConsoleApp />;
}
