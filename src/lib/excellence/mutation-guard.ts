import "server-only";
import { isDeepStrictEqual } from "node:util";
import { AccessError } from "@/lib/access-error";
import { excellenceContext, accessMessage } from "./access-server";
import { EXCELLENCE_PILLARS } from "./access-policy";

export async function guardExcellenceMutation(request: Request, payload: Record<string, unknown>): Promise<Response | null> {
  const action = String(payload.action || "").trim();
  const productId = String(payload.productId || "").trim();
  // The legacy account service can persist its product map through the generic
  // assessment "save" action. Never let that route sidestep the permission check.
  if (action === "save" && payload.progress && typeof payload.progress === "object") {
    const products = (payload.progress as Record<string, unknown>).__sorpPlatformProducts;
    if (products !== undefined) {
      const excellence = products && typeof products === "object" ? (products as Record<string, unknown>)["social-impact-excellence"] : undefined;
      try {
        const context = await excellenceContext(request.headers.get("cookie") || "");
        if (!isDeepStrictEqual(excellence ?? null, context.product))
          return Response.json({ error: "Use the protected Social Impact Excellence assessment to update this work." }, { status: 403 });
      } catch (cause) {
        const status = cause instanceof AccessError ? cause.status : 503;
        return Response.json({ error: "Your saved product access could not be verified." }, { status });
      }
    }
  }
  if (productId !== "social-impact-excellence" ||
      !["save-product", "create-product-file-upload", "list-product-files"].includes(action)) return null;
  try {
    const context = await excellenceContext(request.headers.get("cookie") || "");
    if (action === "save-product") {
      const proposed = payload.data;
      if (!proposed || typeof proposed !== "object" || Array.isArray(proposed))
        return Response.json({ error: "The assessment data is invalid." }, { status: 400 });
      const next = proposed as Record<string, unknown>, current = context.product?.data || {};
      for (const pillar of EXCELLENCE_PILLARS) {
        if (!context.pillars[pillar].available && !isDeepStrictEqual(next[pillar] ?? null, current[pillar] ?? null))
          return Response.json({ error: accessMessage(context, pillar) }, { status: 403 });
      }
      const baselineFields = ["answers", "result", "requestId", "route", "index", "startedAt", "updatedAt", "completedAt", "migration"];
      if (!context.access.stages.maturity && baselineFields.some(field => !isDeepStrictEqual(next[field] ?? null, current[field] ?? null)))
        return Response.json({ error: "The Maturity Assessment is locked for your organisation." }, { status: 403 });
    } else {
      const pillar = EXCELLENCE_PILLARS.find(item => String(payload.purpose || "").trim() === `${item}-evidence`);
      if (!pillar) return Response.json({ error: "Unknown Social Impact Excellence evidence area." }, { status: 400 });
      if (pillar && !context.pillars[pillar].available)
        return Response.json({ error: accessMessage(context, pillar) }, { status: 403 });
    }
    return null;
  } catch (cause) {
    const status = cause instanceof AccessError ? cause.status : 503;
    return Response.json({ error: status === 401 ? "Please sign in before continuing." : "Your organisation access could not be verified. Please try again." }, { status });
  }
}
