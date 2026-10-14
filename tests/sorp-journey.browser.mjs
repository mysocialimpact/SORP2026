// Run against a local dev server: node --experimental-strip-types tests/sorp-journey.browser.mjs
// All API traffic is intercepted. No real emails or assessments are sent.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { tests, methodologyV1 } from '../src/app/sorp-methodology-v1.ts';
import { APPROVED_COW_METHODOLOGY_HASH } from '../src/app/sorp-public-model.ts';

const base = process.env.SORP_TEST_URL || 'http://localhost:3000';
const key = 'msi-sorp-canonical-methodology-v1';
const candidate = { name: 'Example Charity — browser fixture', registrationNumber: '1234567', entityType: 'registered_charity', jurisdiction: 'england_wales', latestIncome: 400000, officialUrl: 'https://example.org/charity', website: 'https://example.org', reportUrl: 'https://example.org/report.pdf', sources: [], publicReadiness: { impactReport: { found: false } } };
const document = { id: 'e06df411-3b94-4db4-a08f-80f9e985fe26', expiresAt: new Date(Date.now() + 3600000).toISOString(), title: 'Trustees’ Annual Report and accounts', period: 'Year ended 31 March 2025', sourceUrl: candidate.reportUrl, pageCount: 26, pagesProcessed: 26, validation: 'passed', storedCopyUsed: true };
const quote = 'The charity provides affordable workspace and support to creative organisations, helping local people develop skills and build sustainable livelihoods.';
const lens = { lens: 'tar', methodologyVersion: '1.0', methodologySnapshot: methodologyV1, assessmentRun: { methodologyContentHash: APPROVED_COW_METHODOLOGY_HASH, sourceDigest: 'browser-fixture' }, publicationStatus: 'PUBLISHABLE', readable: true, score: 50, confidence: 'MEDIUM', title: document.title, period: document.period, sourceUrl: candidate.reportUrl, limitation: '', diagnostics: { pageCount: 26, pagesProcessed: 26, textExtractionSuccess: true, extractedTextLength: 26000, allChunksIndexed: true, assessmentRetrievalSucceeded: true }, findings: tests.map((test, index) => ({ fieldId: index + 1, questionId: test.id, answer: 'partly', confidence: 'MEDIUM', classification: 'MUST', finding: test.question, reason: 'Some, but not all, conditions are established.', excerpt: quote, page: '3', sources: [], assessmentTrail: { source: { document: document.title, reportingPeriod: document.period, url: candidate.reportUrl, digest: 'browser-fixture' }, evidence: [{ id: 'E1', page: 3, excerpt: quote }], propositions: [{ id: 'P1', condition: 'The charity’s purposes and activities are described.', state: 'established', evidenceIds: ['E1'] }, { id: 'P2', condition: 'The description explains all relevant connections.', state: 'not_established', evidenceIds: [] }], validation: [{ propositionId: 'P1', valid: true }, { propositionId: 'P2', valid: true }], sorpTest: { requirement: test.question, references: ['Module 1'] }, classification: 'partly', why: 'Some, but not all, conditions are established.', whyNotHigher: 'The connection to all relevant purposes was not established.' } })) };
for (const finding of lens.findings) {
  finding.action = 'Strengthen the reporting evidence.';
  finding.sourceUrl = candidate.reportUrl;
  for (const validation of finding.assessmentTrail.validation) validation.reasons = [];
}
const initial = { sessionId: 'browser-journey-test', step: 'homework', candidate, state: { setup: { income: 'tier1_high', jurisdiction: 'ew' } }, intelligence: { effectiveVersion: 'fixture', layers: [] } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: viewport.width < 700 ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => console.error('Browser error:', error.message));
    await page.route('https://js.stripe.com/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.Stripe = function () { return {}; };' }));
    let events = [], completeDocument, completeAssessment, savedProgress = initial, emailRequests = 0;
    const operations = [];
    await page.route('**/api/**', async route => {
      if (route.request().url().includes('/api/readiness-account')) {
        if (route.request().method()==='POST' && route.request().postDataJSON().action==='save') savedProgress=route.request().postDataJSON().progress;
        return route.fulfill({ json: { signedIn: true, account: { name: 'Test User', email: 'test@example.org', position: 'Trustee' }, progress: savedProgress } });
      }
      if (route.request().url().includes('/api/readiness/review-report-email')) {
        const payload=route.request().postDataJSON();
        assert.equal(payload.deliveryStage,'report-complete');
        assert.equal(payload.result.currentReadiness.answered,19);
        emailRequests++;
        return route.fulfill({json:{ok:true,attachment:'fixture-report.pdf'}});
      }
      if (!route.request().url().includes('/api/published-review')) return route.fulfill({ json: { ok: true } });
      if (route.request().method() === 'GET') return route.fulfill({ json: { events } });
      const operation = route.request().postDataJSON().operation;
      operations.push(operation);
      if (operation === 'prepare-tar') { await new Promise(resolve => { completeDocument = resolve; }); return route.fulfill({ json: { preparedDocument: document } }); }
      if (operation === 'assess-tar') { await new Promise(resolve => { completeAssessment = resolve; }); return route.fulfill({ json: { lens } }); }
      throw new Error('Unexpected API operation: ' + operation);
    });
    await page.addInitScript(({ key, initial }) => { if (!sessionStorage.getItem('qa-seeded')) { localStorage.setItem(key, JSON.stringify(initial)); sessionStorage.setItem('qa-seeded','true'); } }, { key, initial });
    await page.goto(base + '/are-you-sorp-ready/review');
    await page.locator('.scr-assessment-header').waitFor();
    assert.equal(await page.locator('.platform-sticky-navigation').isVisible(), false);
    assert.equal(await page.locator('.scr-top nav li').count(), 8);
    assert.match(await page.locator('.scr-top [aria-current=step]').textContent(), /Published report/i);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.scr-bottom').evaluate(element => getComputedStyle(element).position), 'fixed');
    await page.screenshot({ path: `/tmp/sorp-before-${viewport.width}.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: /LOCATE AND READ MY REPORT/ }).evaluate((button) => button.click());
    await page.waitForFunction(() => document.querySelector('.sj-milestones'));
    assert.equal(await page.locator('.sj-milestones .is-complete').count(), 0);
    events = [{ stage: 'pdf-download', phase: 'retry', createdAt: new Date().toISOString(), message: 'Charity Commission returned HTTP 504. We’re retrying the public report.' }];
    await page.getByText('Charity Commission returned HTTP 504.', { exact: false }).waitFor();
    assert.equal(await page.locator('.sj-milestones .is-complete').count(), 0);
    assert.deepEqual(operations, ['prepare-tar']);
    completeDocument();
    await page.getByRole('button', { name: 'CONTINUE TO ASSESSMENT', exact: false }).waitFor();
    assert.equal(await page.locator('.sj-milestones .is-complete').count(), 4);
    await page.screenshot({ path: `/tmp/sorp-document-${viewport.width}.png`, fullPage: true, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.reload();
    await page.locator('.scr-assessment-header').waitFor();
    await page.getByRole('button', { name: /CONTINUE TO ASSESSMENT/ }).click();
    assert.match(await page.locator('.scr-top [aria-current=step]').textContent(), /Assessment/i);
    await page.getByText('Every answer starts with your report.').waitFor();
    assert.equal(await page.locator('.sj-question-map .is-complete').count(), 0);
    assert.deepEqual(operations, ['prepare-tar', 'assess-tar']);
    completeAssessment();
    await page.getByRole('button', { name: 'The question' }).waitFor();
    for (const chapter of ['The question', 'The evidence', 'The conditions', 'The answer']) {
      await page.getByRole('button', { name: new RegExp(chapter) }).click();
      if (chapter === 'The evidence') await page.getByText('“' + quote + '”', { exact: true }).waitFor();
      if (chapter === 'The answer') await page.getByRole('heading', { name: 'Partly evidenced' }).waitFor();
      if (chapter === 'The evidence') await page.screenshot({ path: `/tmp/sorp-assessment-${viewport.width}.png`, fullPage: true, animations: 'disabled' });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (viewport.width < 700) assert.equal(await page.locator('.sj-success-mark path').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.getByRole('button', { name: 'FINISH EXPLANATION ✓' }).click();
    await page.getByRole('button', { name: /VIEW MY HISTORICAL SNAPSHOT/ }).waitFor();
    await page.reload();
    await page.locator('.scr-assessment-header').waitFor();
    await page.locator('.sj-assessment.is-assessed').waitFor();
    assert.deepEqual(operations, ['prepare-tar', 'assess-tar']);
    await page.getByRole('button', {name:/VIEW MY HISTORICAL SNAPSHOT/}).click();
    assert.match(await page.locator('.scr-top [aria-current=step]').textContent(), /Historical snapshot/i);
    await page.getByRole('button', {name:/CONTINUE TO CURRENT READINESS/}).click();
    await page.getByRole('button', {name:'SKIP FOR NOW',exact:true}).click();
    await page.getByRole('button', {name:/START MY CURRENT READINESS REVIEW/}).click();
    assert.match(await page.locator('.scr-top [aria-current=step]').textContent(), /Current readiness/i);
    for(let q=0;q<19;q++) {
      await page.locator('.scr-answer-grid button').first().click();
      await page.locator('.scr-bottom > div:last-child > button').click();
    }
    await page.getByRole('button', {name:/BUILD MY PERSONALISED REPORT/}).click();
    console.log('Report input check',await page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));return {step:s.step,hasEmail:!!s.email,hasReport:!!s.report,setup:s.state?.setup,answers:Object.values(s.corrections).filter(x=>x.reviewed).length};},key));
    await page.getByRole('button', {name:/VIEW MY PERSONALISED REPORT/}).click({timeout:30000});
    assert.match(await page.locator('.scr-top [aria-current=step]').textContent(), /Your report/i);
    assert.equal(emailRequests,0,'Opening the report does not request an email prematurely');
    await page.getByRole('button', {name:/SEE MY PRIORITIES/}).click();
    await page.screenshot({path:`/tmp/sorp-report-${viewport.width}.png`,fullPage:true});
    await page.getByRole('button', {name:/FINISH MY REVIEW/}).click();
    assert.match(await page.locator('.scr-top [aria-current=step]').textContent(), /What next/i);
    await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).emailSent,key);
    await expect.poll(()=>savedProgress.emailSent).toBe(true);
    assert.equal(emailRequests,1);
    await page.reload();
    await page.getByRole('button', {name:'SKIP FOR NOW',exact:true}).waitFor();
    assert.equal(emailRequests,1,'Restoring the finished review does not send another email');
    // A new browser has no local work. Restore the saved account report alone.
    await page.evaluate(()=>localStorage.clear());
    await page.reload();
    await page.getByRole('button', {name:'SKIP FOR NOW',exact:true}).waitFor();
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).report.tar.findings.length,key),19);
    assert.equal(emailRequests,1);
    await context.close();
    console.log(`${viewport.width}px: document checkpoint, evidence walkthrough, all 19 answers, report generation, priorities, mocked PDF email deduplication and account-only report restoration passed`);
  }
} finally { await browser.close(); }
