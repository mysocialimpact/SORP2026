import { writeFile, mkdir } from 'node:fs/promises';
import pg from 'pg';

// Public releases start at v1 with the intelligent status bar. Increment this
// deliberately for each production release; the deployment ledger remains the
// immutable, internal build record used by the footer and operations.
export const PUBLIC_RELEASE_VERSION = 1;

// Allocate once per deployment, not per Next worker or page render. Retries of
// the same deployment keep their original number and timestamp.
export async function allocateBuild(client, deployment, environment) {
  const result = await client.query('SELECT * FROM sorp_build_metadata.allocate($1,$2)', [deployment, environment]);
  const row = result.rows[0];
  if (!Number.isSafeInteger(row?.number) || row.number <= 20) throw new Error('Invalid deployment build identifier');
  return { number: row.number, version: PUBLIC_RELEASE_VERSION,
    deployedAt: new Date(row.deployed_at).toISOString(), environment };
}
/** Unconnected previews show their actual deployment ID, never an invented number. */
export function previewBuild(deployment, deployedAt = new Date()) {
  return { number: null, deploymentId: deployment, version: PUBLIC_RELEASE_VERSION,
    deployedAt: deployedAt.toISOString(), environment: 'preview' };
}
if (process.argv[1]?.endsWith('prepare-build.mjs')) {
  let metadata = { number: null, version: PUBLIC_RELEASE_VERSION, deployedAt: null, environment: 'development' };
  if (process.env.VERCEL === '1') {
    const deployment = process.env.VERCEL_DEPLOYMENT_ID || (process.env.VERCEL_ENV === 'preview'
      ? process.env.VERCEL_URL || process.env.VERCEL_GIT_COMMIT_SHA : '');
    if (!deployment) throw new Error('Deployment ID is required for build information.');
    if (process.env.VERCEL_ENV === 'preview' && !process.env.SORP_BUILD_METADATA_URL) {
      metadata = previewBuild(deployment);
    } else {
      if (!process.env.SORP_BUILD_METADATA_URL) throw new Error('Deployment metadata configuration is required; refusing to label a production deployment with stale build information.');
      const client = new pg.Client({ connectionString: process.env.SORP_BUILD_METADATA_URL, connectionTimeoutMillis: 12000, query_timeout: 12000 });
      try {
        await client.connect();
        metadata = await allocateBuild(client, deployment, process.env.VERCEL_ENV === 'production' ? 'production' : 'preview');
      } finally { await client.end(); }
    }
  }
  await writeFile('.sorp-build.json', JSON.stringify(metadata));
  await mkdir('public', { recursive: true });
  await writeFile('public/build-info.json', JSON.stringify(metadata));
  console.log(metadata.number ? `Build ${metadata.number} · ${metadata.environment} · ${metadata.deployedAt}` : metadata.environment === 'preview' ? `Preview build · ${metadata.deployedAt}` : 'Local development build');
}
