import assert from 'node:assert/strict';
import { chromium, expect as baseExpect } from '@playwright/test';
const expect = baseExpect.configure({ timeout: 15000 });
import chromiumBinary from './live-runtime/node_modules/@sparticuz/chromium/build/index.js';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.CENTRAL_TEST_URL || 'http://127.0.0.1:3000';
const output = process.env.CENTRAL_TEST_OUTPUT || 'test-results/central-registration';
await mkdir(output, { recursive: true });
const results = [];
const record = result => { results.push(result); console.log(JSON.stringify(result)); };
const journeys = [
 ['/are-you-sorp-ready/review/?client=synthetic#report', 'Readiness'],
 ['/ask-sorp/workspace/?question=synthetic%20question#answers', 'Ask SORP'],
 ['/charity-impact-reports/review/?draft=synthetic#upload', 'Impact Reporting'],
 ['/social-impact-excellence/assessment/?question=8#baseline', 'Excellence'],
 ['/my-impact-director/?view=synthetic#assessment', 'Impact Director'],
];
async function run(viewport) {
 const browser = await chromium.launch({ executablePath: await chromiumBinary.executablePath(), args: chromiumBinary.args.filter(arg => arg !== '--disable-web-security'), headless: true });
 const context = await browser.newContext({ viewport, reducedMotion: 'reduce', isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
 const page = await context.newPage();
 page.setDefaultTimeout(20000);
 page.setDefaultNavigationTimeout(30000);
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 if (process.env.CENTRAL_DEBUG) page.on('response', async response => { if (response.url().includes('/api/onboarding/') || response.url().includes('/api/readiness-account/')) console.log(response.status(), response.url(), (await response.text().catch(() => '')).slice(0,230)); });
 try {
  for (const [destination, name] of journeys.filter(item => !process.env.CENTRAL_FILTER || item[1].includes(process.env.CENTRAL_FILTER))) {
   console.log(`Checking ${name} at ${viewport.width}px`);
   await context.clearCookies();
   if (name === 'Readiness') {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('msi-sorp-canonical-methodology-v1', JSON.stringify({ sessionId: 'synthetic-local-draft', step: 'account', candidate: { name: 'Synthetic saved charity', registrationNumber: '0000000', website: 'https://example.invalid', officialUrl: 'https://register-of-charities.charitycommission.gov.uk/' } })));
   }
   await page.goto(base + destination, { waitUntil: 'domcontentloaded' });
   if (name === 'Excellence') {
    await page.waitForURL('**/get-started/**'); // account-required workspace guard
   } else if (!page.url().includes('/get-started/')) {
    const gateway = page.locator('.account-gateway .gateway-action').first();
    if (name === 'Readiness' || name === 'Impact Reporting') {
      await expect(gateway).toBeVisible();
      await gateway.click();
    } else {
      const register = page.locator('.gateway-account-control:visible').filter({ hasText: 'Let’s Get Started' }).first();
      await expect(register).toBeVisible();
      await register.click();
    }
   }
   await page.waitForURL('**/get-started/**');
   assert.equal(new URL(page.url()).searchParams.get('next'), destination);
   const manual = page.getByRole('button', { name: /Fill in the form yourself/ });
   await manual.click();
   await page.locator('.onboarding-profile input[name=name]').fill('Synthetic Test User');
   await page.locator('.onboarding-profile input[name=email]').fill('synthetic@example.invalid');
   await page.locator('.onboarding-profile input[name=role]').fill('Trustee');
   await page.locator('.onboarding-profile input[name=organisation]').fill('Synthetic Organisation');
   await expect(page.locator('.profile-next button')).toBeDisabled();
   await page.getByLabel('Charity name or registration number').fill('Synthetic Test Charity');
   await page.getByRole('button', { name: 'Find →', exact: true }).click();
   await expect(page.getByRole('heading', { name: 'Synthetic Test Charity', exact: true })).toBeVisible();
   await page.getByRole('button', { name: /Yes, this is the charity/ }).click();
   await expect(page.locator('.profile-next button')).toBeEnabled();
   if (name === 'Readiness') {
    await page.locator('.onboarding-profile input[name=email]').fill('not-an-email');
    await expect(page.locator('.profile-next button')).toBeDisabled();
    await page.locator('.onboarding-profile input[name=email]').fill('synthetic@example.invalid');
    await page.locator('.onboarding-profile input[name=organisation]').fill('');
    await expect(page.locator('.profile-next button')).toBeDisabled();
    await page.getByLabel('I work independently', { exact: true }).check();
    await expect(page.locator('.profile-next button')).toBeEnabled();
    await expect(page.locator('.profile-count')).toContainText('5/5');
   }
   await page.locator('.profile-next button').click();
   await page.getByLabel('Choose a password').fill('Synthetic-Test-Password-123');
   await page.getByLabel('Confirm your password').fill('Synthetic-Test-Password-123');
   await page.locator('dialog').getByRole('button', { name: /Create my account/ }).click();
   await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash).toBe(destination);
   await page.waitForLoadState('domcontentloaded');
   await expect(page.getByLabel('Your shared charity context')).toContainText('Synthetic Test Charity', { timeout: 15000 });
   if (name === 'Readiness') assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('msi-sorp-canonical-methodology-v1')).candidate.name), 'Synthetic saved charity');
   // Known users may visit the central gateway, but it returns them immediately.
   await page.goto(base + '/get-started/?next=' + encodeURIComponent(destination), { waitUntil: 'domcontentloaded' });
   await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash).toBe(destination);
   record({ viewport: viewport.width, test: name + ' registration, full workflow return and existing-user bypass', passed: true });
  }
  await context.clearCookies();
  const returnTo = '/ask-sorp/workspace/?question=saved#answers';
  await page.goto(base + '/login/?return=' + encodeURIComponent(returnTo), { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address', { exact: true }).fill('returning@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-Test-Password-123');
  await page.getByRole('button', { name: /Log in to SORP2026/ }).click();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash).toBe(returnTo);
  record({ viewport: viewport.width, test: 'Returning-user sign-in bypasses onboarding and preserves query/hash', passed: true });
  await page.goto(base + '/settings/#subscription', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Your plans.' })).toBeVisible();
  assert.equal(new URL(page.url()).pathname, '/settings/');
  const checkout = await page.request.post(base + '/api/sorp-payments/checkout/', { data: { product: 'synthetic' } });
  assert.equal(checkout.status(), 503);
  assert.equal(checkout.headers()['x-sorp-isolation'], 'synthetic');
  record({ viewport: viewport.width, test: 'Billing settings bypass onboarding; Preview checkout cannot charge', passed: true });
  await context.clearCookies();
  for (const old of ['/login/?mode=signup&next=', '/register/?next=', '/signup/?next=', '/sign-up/?next=']) {
   await page.goto(base + old + encodeURIComponent(returnTo), { waitUntil: 'domcontentloaded' });
   await page.waitForURL('**/get-started/**');
   assert.equal(new URL(page.url()).searchParams.get('next'), returnTo);
  }
  record({ viewport: viewport.width, test: 'Four legacy registration URLs converge on the central gateway', passed: true });
  const barRoutes = ['/', '/are-you-sorp-ready/', '/ask-sorp/', '/charity-impact-reports/', '/social-impact-excellence/', '/my-impact-director/', '/get-started/', '/login/'];
  let label;
  for (const route of barRoutes) {
   await page.goto(base + route, { waitUntil: 'domcontentloaded' });
   const bar = page.getByLabel('Website build information').first();
   await expect(bar).toBeVisible();
   const text = await bar.innerText();
   label ||= text;
   assert.equal(text, label);
   assert.equal(await bar.evaluate(el => getComputedStyle(el).position), 'static');
   await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
   await expect.poll(() => bar.evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
   await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
   await expect(bar).toBeInViewport();
  }
  await page.goto(base + '/get-started/', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: output + `/build-bar-${viewport.width}.png` });
  record({ viewport: viewport.width, test: 'Same non-sticky build bar on eight pages', buildLabel: label, passed: true });
  assert.deepEqual(errors, []);
 } catch (error) {
  console.error('Failed at', page.url());
  await page.screenshot({ path: output + `/failure-${viewport.width}.png` }).catch(() => {});
  throw error;
 } finally { await browser.close(); }
}
try {
 await run({ width: 1440, height: 1000 });
 await run({ width: 390, height: 844 });
 await writeFile(output + '/results.json', JSON.stringify({ passed: results.length, results }, null, 2));
 console.log(JSON.stringify({ passed: results.length, results }));
} catch(error) {
 await writeFile(output + '/results.json', JSON.stringify({ passed: results.length, results, error: String(error) }, null, 2));
 console.error(error); process.exitCode = 1;
}
