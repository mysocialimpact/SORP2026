# SORP / My Impact Director review integration

Methodological source: `mysocialimpact/my-social-impact`, `apps/my-impact-director`, deployed commit `a6478448d89e522d4fb5c80f6fa5aa4e695f62a1`.

`src/lib/impact-review/mid` reuses its rubrics, scoring, structured schemas, passage reference resolver and Gateway transport. The authenticated public MID APIs depend on MID browser identities; they are not a server-to-server SORP service. SORP therefore runs these reusable modules with its own account permissions, document storage and durable queue. MID itself is unchanged. Future methodology changes should be synchronized from that source.

Twenty criteria per lens. Claims, report context and text are shared. Models select existing passage IDs; the server resolves exact source text and physical pages. Published outcomes use the original coverage thresholds and numeric anchors. SIE scores describe report disclosure only. Existing five-section saved results remain readable; the new method has a separate version.

One free document per account, reserved transactionally on first assessment, covers both lenses and retries. No new paid entitlement or checkout. New report-review registrations enter `/are-you-sorp-ready/review/`; returning users log straight back into the review. Existing accounts are not forced to repeat readiness.

Migration: `migrations/impact-report-methodologies.sql` adds progress, shared understanding and account allowances. No identity, subscription or customer data changes.

SORP retains its existing 4 MB upload and searchable-PDF limits. The MID scanner/visual-transcription pipeline and 50 MB upload infrastructure are not ported. Communication assessment receives the original PDF; unreadable pages suppress absence judgements. Unsupported PDFs produce an actionable error. Reviews checkpoint each four-criterion group; polling or the existing worker cron resumes queued stages. No turnaround guarantee. Saved results remain private to authorised scopes.

Print/save PDF uses the browser's print facility. It is not MID's server-rendered PDF exporter. No public sharing endpoint or email-delivery flow is introduced.

Verification must distinguish controlled transport/browser fixtures from live model assessment. The local transport test exercises both lenses with one understanding, source grounding, all forty criteria and scoring; it never substitutes synthetic results in production.
