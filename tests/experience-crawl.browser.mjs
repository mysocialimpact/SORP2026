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
    await page.getByRole('heading', { name: 'Impact strikes back.' }).waitFor();
    await page.getByText('Some of the charities and other organisations Marcus and our team have worked with over the years.').waitFor();
    await page.waitForTimeout(250);
    await page.waitForFunction(() => [...document.querySelectorAll('.crawl-organisation')].some(name => name.textContent === 'ActionAid'));
    assert.equal(await page.locator('#experience-collection li').count(), 62);
    const inspect = async phase => {
      const result = await page.evaluate(() => {
        const frame = document.querySelector('.crawl-space').getBoundingClientRect();
        const names = [...document.querySelectorAll('.crawl-name')].flatMap(row =>
          Number(getComputedStyle(row).opacity) < .2 ? [] : [...row.children].filter(name => !name.hidden).map(name => ({
            text: name.textContent, rect: name.getBoundingClientRect().toJSON(), fits: name.scrollWidth <= name.clientWidth + 1,
          })));
        const visible = names.filter(name => name.rect.top >= frame.top && name.rect.bottom <= frame.bottom);
        const collision = visible.some((a, i) => visible.slice(i + 1).some(b =>
          a.rect.left < b.rect.right - 1 && a.rect.right > b.rect.left + 1 &&
          a.rect.top < b.rect.bottom - 1 && a.rect.bottom > b.rect.top + 1));
        return { names: visible.length, collision, clipped: visible.filter(name => !name.fits).map(name => name.text), height: frame.height, width: frame.width, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(result.collision, false, `${width}px ${phase}: names collide`);
      assert.deepEqual(result.clipped, [], `${width}px ${phase}: names clip`);
      assert.equal(result.overflow, false, `${width}px ${phase}: horizontal overflow`);
      assert.ok(result.height <= 380, `${width}px ${phase}: crawl is too tall`);
      if (width > 700) { assert.ok(result.names >= 10, `${phase}: only ${result.names} desktop names visible`); assert.ok(result.width >= 1200, 'desktop crawl is too narrow'); }
      await page.locator('.crawl-frame').screenshot({ path: `/tmp/experience-crawl-${width}-${phase}.png` });
    };
    await inspect('start');
    await page.locator('#home-experience').screenshot({ path: `/tmp/experience-section-${width}.png` });
    const before = await page.locator('.crawl-name').first().evaluate(line => line.style.transform);
    await page.waitForTimeout(250);
    assert.notEqual(await page.locator('.crawl-name').first().evaluate(line => line.style.transform), before, `${width}px crawl must move when visible`);
    await page.waitForTimeout(7500);
    await inspect('middle');
    await page.waitForTimeout(7500);
    await inspect('later');
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
