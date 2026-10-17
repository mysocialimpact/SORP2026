// Opt-in browser verification against the real preview database/model/registry.
// No mocked routes, production accounts or payment calls. Signup is isolated.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import chromiumBinary from '../tests/live-runtime/node_modules/@sparticuz/chromium/build/index.js';
import pg from 'pg';

if (process.env.VERCEL_ENV !== 'preview' || process.env.FLAGSHIP_LIVE_QA !== 'true') throw Error('Explicit preview opt-in required');
const database = new URL(process.env.CONSOLE_DATABASE_URL || '');
assert.equal(database.pathname, '/sorp_flagship_pr94');
assert.equal(database.username, 'sorp_flagship_pr94_runtime');
assert.equal(process.env.SORP_BACKEND_ORIGIN, 'https://isolated-preview.invalid');
assert.notEqual(process.env.SORP_ISOLATED_PREVIEW, 'true', 'Synthetic mode must be off');
const base = process.env.FLAGSHIP_REMOTE_URL || 'http://localhost:4314';
const remote = !!process.env.FLAGSHIP_REMOTE_URL;
if (remote) assert.ok(new URL(base).hostname.endsWith('.vercel.app'));
const output = 'public/flagship-qa';
await mkdir(output, { recursive: true });
const pool = new pg.Pool({ connectionString: process.env.CONSOLE_DATABASE_URL, max: 1 });
const server = remote ? null : spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '4314'], { env: { ...process.env, SORP_AUTH_BASE_URL: base }, stdio: 'ignore' });
let browser;
const report = { environment: 'preview', realServices: true, checks: [], emailDelivery: 'Private preview sandbox, not external delivery' };
try {
  for (let n = 0; n < 80; n++) {
    try { if ((await fetch(base + '/build-info.json')).ok) break; } catch {}
    if (n === 79) throw Error('Preview server did not start');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  for (const width of [1440, 390]) {
    browser = await chromium.launch({ executablePath: await chromiumBinary.executablePath(), args: chromiumBinary.args.filter(arg => arg !== '--disable-web-security'), headless: true });
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, isMobile: width === 390, hasTouch: width === 390 });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    // Public-page third-party resources must not block an otherwise usable UI.
    page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/get-started/?next=/ask-sorp/workspace/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#introduction-answer')).toBeEnabled();
    const email = `qa-${width}-${Date.now()}@example.invalid`;
    const password = `Preview-${crypto.randomUUID()}-Password!`;
    const transcript = `I’m Sarah Jones, an accountant at Burton Sweet. My email is ${email}.`;
    const responsePromise = page.waitForResponse(response => response.url().includes('/api/onboarding/turn/'), { timeout: 90000 });
    await page.locator('#introduction-answer').fill(transcript);
    await page.locator('.onboarding-send').click();
    await expect(page.locator('.history-user')).toContainText(transcript, { timeout: 1500 });
    await expect(page.locator('input[name=name]')).toHaveValue('Sarah Jones', { timeout: 1500 });
    await expect(page.locator('.conversation-activity')).toBeVisible();
    if (width === 390) await expect(page.locator('.onboarding-mobile-summary')).toBeInViewport();
    const response = await responsePromise;
    const answer = await response.json();
    assert.equal(response.status(), 200);
    assert.equal(answer.notice || '', '', 'Live model must not fall back');
    assert.equal(answer.state.response.generated, true);
    assert.equal(answer.state.facts.organisation, 'Burton Sweet');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[name=name]')).toHaveValue('Sarah Jones');
    const id = (await context.cookies()).find(cookie => cookie.name === 'sorp_onboarding')?.value;
    assert.ok(id);
    const persisted = await pool.query('SELECT state,messages FROM research_console.onboarding_sessions WHERE id=$1', [id]);
    assert.equal(persisted.rows[0].state.facts.organisation, 'Burton Sweet');
    assert.ok(persisted.rows[0].messages.some(message => message.text === transcript));
    report.checks.push({ width, firstAnswer: true, genuineAI: true, databasePersistence: true, refresh: true });
    await page.getByRole('button', { name: 'Fill in the form', exact: true }).click();
    await expect(page.locator('#onboarding-profile-form textarea')).toHaveCount(3);
    await page.locator('input[name=name]').fill('Sarah Jones ACA');
    await page.getByLabel('Charity name or registration number').fill('Oxfam');
    const searchPromise = page.waitForResponse(response => response.url().includes('/api/onboarding/search/'), { timeout: 90000 });
    await page.getByRole('button', { name: 'Find →', exact: true }).click();
    const searchResponse = await searchPromise;
    const search = await searchResponse.json();
    assert.equal(searchResponse.status(), 200, search.error);
    assert.ok(search.candidates?.length, 'Real regulator match required');
    assert.ok(search.candidates.some(candidate => /oxfam/i.test(candidate.name)));
    await page.getByRole('button', { name: 'Yes, this is the charity' }).first().click();
    await expect(page.locator('.confirmed-charity')).toBeVisible();
    await expect(page.locator('.profile-next button')).toBeEnabled();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Fill in the form', exact: true }).click();
    await expect(page.locator('input[name=name]')).toHaveValue('Sarah Jones ACA');
    await expect(page.locator('.confirmed-charity')).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/real-preview-${width}.png`, fullPage: true });
    report.checks.push({ width, manualCorrection: true, officialSearch: true, charityConfirmation: true, noOverflow: true });
    await page.locator('.profile-next button').click();
    await page.getByLabel('Choose a password').fill(password);
    await page.getByLabel('Confirm your password').fill(password);
    await page.getByRole('button', { name: 'Create my account' }).click();
    await expect(page.getByRole('link', { name: 'Open preview verification →' })).toBeVisible();
    const unverified = await context.request.post(base + '/api/readiness-account/', { headers: { origin: base }, data: { action: 'login', email, password } });
    assert.equal(unverified.status(), 403, 'Unverified sign-in must fail');
    const verification = page.waitForResponse(response => response.url().includes('/api/sorp-auth/verify-email'));
    await page.getByRole('link', { name: 'Open preview verification →' }).click();
    assert.ok((await verification).status() < 400, 'Signed verification link must succeed');
    report.checks.push({ width, secureSignup: true, unverifiedLoginDenied: true, signedEmailLinkAccepted: true });
    await page.goto(base + '/login/?next=' + encodeURIComponent('/get-started/?next=/ask-sorp/workspace/'), { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.locator('form').filter({ has: page.getByLabel('Password', { exact: true }) }).getByRole('button', { name: /Log in/i }).click();
    await page.waitForURL('**/ask-sorp/workspace/**', { timeout: 30000, waitUntil: 'domcontentloaded' });
    const accountResponse = await context.request.get(base + '/api/readiness-account/');
    const account = await accountResponse.json();
    assert.equal(account.signedIn, true);
    assert.equal(account.account.email, email);
    assert.equal(account.account.organisation, 'Burton Sweet');
    const linked = await pool.query('SELECT facts,charity_identity FROM research_console.onboarding_profiles WHERE account_id=$1', [account.account.id]);
    assert.equal(linked.rows[0].facts.organisation, 'Burton Sweet');
    assert.ok(linked.rows[0].charity_identity.startsWith('ccew:'));
    report.checks.push({ width, secureSignup: true, unverifiedLoginDenied: true, signedEmailLinkAccepted: true, authenticatedReturn: true, accountProfilePersisted: true });
    await browser.close(); browser = null;
  }
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.message;
  process.exitCode = 1;
} finally {
  console.log('FLAGSHIP_PREVIEW_QA ' + JSON.stringify(report));
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  await pool.end();
  server?.kill();
}
