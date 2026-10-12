import { protectPage } from "@/lib/console/auth";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectPage();
  return children;
}
