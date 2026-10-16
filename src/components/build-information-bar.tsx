import { buildInformation, formatBuildTimestamp } from "@/lib/build-information";

export function BuildInformationBar() {
  const { number, deployedAt, environment } = buildInformation;
  return <aside className="build-information-bar" aria-label="Website build information" data-build={number} data-environment={environment}>
    <span>{environment === "production" ? "Production" : environment === "preview" ? "Preview" : "Development"}</span>
    {number ? <><span aria-hidden="true">·</span><span>Build {number}</span><span aria-hidden="true">·</span><time dateTime={deployedAt}>Updated {formatBuildTimestamp(deployedAt)}</time></> : <span>· Local build</span>}
    {process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === "true" && <span className="build-isolation-note">Synthetic accounts · payments disabled</span>}
  </aside>;
}
