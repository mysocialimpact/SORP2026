import { notFound } from "next/navigation";
import { GrowthWorkspace } from "@/components/founder/growth-workspace";
import { isKind } from "@/lib/growth/model";

export default async function GrowthChannel({ params, searchParams }: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { channel } = await params;
  if (!isKind(channel) && channel !== "digital") notFound();
  const query = await searchParams;
  const search = Object.fromEntries(["id","q","stage","sort","page"].flatMap(key => typeof query[key] === "string" ? [[key,query[key]]] : []));
  return <GrowthWorkspace key={JSON.stringify([channel,search])} view={channel} search={search}/>;
}
