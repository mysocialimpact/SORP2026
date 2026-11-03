import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.SORP_TEST_URL || 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base);
    await page.locator('#home-experience').waitFor();
    await page.evaluate(() => {
      const section = document.querySelector('#home-experience');
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 190, behavior: 'instant' });
    });
    await page.getByRole('heading', { name: 'Creativity strikes back.' }).waitFor();
    await page.waitForTimeout(250);
    await page.waitForFunction(() => [...document.querySelectorAll('.crawl-name')].some(line => line.textContent.includes(' · ')));
    assert.equal(await page.locator('.crawl-name').filter({ hasText: 'Diageo · Starbucks · Sainsbury’s' }).count(), 1);
    const before = await page.locator('.crawl-name').first().evaluate(line => line.style.transform);
    await page.waitForTimeout(250);
    assert.notEqual(await page.locator('.crawl-name').first().evaluate(line => line.style.transform), before, `${width}px crawl must move when visible`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px horizontal overflow`);
    await page.screenshot({ path: `/tmp/experience-crawl-${width}.png` });
    const play = page.getByRole('button', { name: /Play original cue/ });
    await play.click();
    assert.equal(await page.getByRole('button', { name: /Stop original cue/ }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: /Stop original cue/ }).click();
    assert.equal(await play.getAttribute('aria-pressed'), 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.getByRole('button', { name: 'Motion reduced' }).isDisabled(), true);
    await page.close();
  }
} finally {
  await browser.close();
}
