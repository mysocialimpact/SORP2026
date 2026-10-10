import { test, expect } from '@playwright/test';
test('IONOS export loads real assets, links, portraits and mobile navigation', async ({ page }, testInfo) => {
  test.skip(process.env.TEST_STATIC !== 'true', 'Run against exported files with TEST_STATIC=true.');
  const failed: string[] = [];
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:4173')) failed.push(response.url()); });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 247, 239)');
  for (const img of await page.getByRole('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty('complete', true);
    expect(await img.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({ path: `test-results/ionos-${testInfo.project.name}.png`, fullPage: true });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'About us' }).click();
  await expect(page.getByRole('heading', { name: 'Purpose behind the platform.' })).toBeVisible();
  expect(failed).toEqual([]);
});
