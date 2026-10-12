BEGIN;
INSERT INTO research_console.benchmarks(id,label,source_url,accessed_at,statement,limitations) VALUES('icaew-directory-published','12,000+ ICAEW firms','https://www.icaew.com/about-icaew/find-a-chartered-accountant','2026-10-12T20:00:00Z','ICAEW describes its official directory as containing over 12,000 firms.','ICAEW published directory figure — UK-only unique total not yet verified. This is an approximate published benchmark, never an exact research denominator.') ON CONFLICT(id) DO NOTHING;
INSERT INTO research_console.migrations(version) VALUES('003') ON CONFLICT DO NOTHING;
COMMIT;
