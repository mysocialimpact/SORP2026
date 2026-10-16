import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base = process.env.CENTRAL_TEST_REMOTE_URL || 'http://127.0.0.1:4310';
const local = !process.env.CENTRAL_TEST_REMOTE_URL;
const output = process.env.CENTRAL_QA_DIRECTORY || 'public/preview-qa';
if (process.env.VERCEL_ENV !== 'preview' || process.env.SORP_ISOLATED_PREVIEW !== 'true') throw new Error('Refusing to test outside the explicitly isolated Preview');
let server;
const run = (cmd, args, env) => new Promise((resolve, reject) => {
 const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
 child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Browser verification failed (${code})`)));
});
try {
 if (local) {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '4310', '--hostname', '127.0.0.1'], { stdio: ['ignore', 'ignore', 'inherit'], env: process.env });
  let ready = false;
  for (let i = 0; i < 60; i++) {
   try { if ((await fetch(base + '/build-info.json')).ok) { ready = true; break; } } catch {}
   await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Isolated application did not start');
 }
 await run(process.execPath, ['tests/central-registration.browser.mjs'], { CENTRAL_TEST_URL: base, CENTRAL_TEST_OUTPUT: output });
 for (const width of [390, 1440]) {
  const png = await readFile(`${output}/build-bar-${width}.png`);
  await writeFile(`${output}/build-bar-${width}.json`, JSON.stringify({ base64: png.toString('base64') }));
 }
} finally { server?.kill(); }
