import Image from "next/image";
import { site } from "@/lib/site";
export function MsiBrand({
  attribution = "Brought to you by",
}: {
  attribution?: string;
}) {
  return (
    <a className="gateway-msi" href={site.msi}>
      <span>{attribution}</span>
      <Image
        src="/brand/my-social-impact.png"
        alt="My Social Impact"
        width={1088}
        height={124}
        sizes="200px"
      />
    </a>
  );
}
export function IdeasBrand() {
  return (
    <a className="gateway-studio" href={site.studio!}>
      <Image
        src="/brand/the-ideas-shed.png"
        alt="The Ideas Shed"
        width={1254}
        height={1254}
        sizes="72px"
      />
      <span>
        Built by
        <br />
        <strong>The Ideas Shed</strong>
      </span>
    </a>
  );
}
