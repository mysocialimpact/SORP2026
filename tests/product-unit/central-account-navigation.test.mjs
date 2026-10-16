import test from 'node:test';
import assert from 'node:assert/strict';
import { currentAccountDestination, registrationHref, signInHref } from '../../src/lib/account-navigation.ts';
import { safeDestination } from '../../src/lib/onboarding/state.ts';
import { formatBuildTimestamp } from '../../src/lib/build-information.ts';
import { allocateBuild } from '../../scripts/prepare-build.mjs';

for (const destination of [
 '/are-you-sorp-ready/review/?client=one#report',
 '/ask-sorp/workspace/?question=reporting%20requirements#answers',
 '/charity-impact-reports/review/?draft=synthetic#upload',
 '/social-impact-excellence/assessment/?question=12#baseline',
 '/my-impact-director/?view=report#assessment',
 `/invitation/${'a'.repeat(64)}/`,
]) test(`central gateway and sign in retain ${destination}`, () => {
 assert.equal(new URL(registrationHref(destination), 'https://sorp2026.org').searchParams.get('next'), destination);
 assert.equal(new URL(signInHref(destination), 'https://sorp2026.org').searchParams.get('return'), destination);
});
for (const destination of ['https://evil.invalid/', '//evil.invalid', '/\\evil.invalid', '/api/checkout/', '/login/?next=//evil.invalid', '/get-started/?next=/get-started/']) test(`reject unsafe or looping return ${destination}`, () => assert.equal(safeDestination(destination), '/dashboard/'));
test('client return context keeps the current query and anchor', () => {
 globalThis.window = { location: new URL('https://sorp2026.org/social-impact-excellence/assessment/?question=8#details') };
 assert.equal(currentAccountDestination('/social-impact-excellence/assessment/'), '/social-impact-excellence/assessment/?question=8#details');
 assert.equal(currentAccountDestination('/ask-sorp/workspace/'), '/ask-sorp/workspace/');
 delete globalThis.window;
});
test('build timestamp uses UK time across BST and GMT, not the browser clock', () => {
 assert.equal(formatBuildTimestamp('2026-10-16T17:45:00.000Z'), '16 Oct 2026, 18:45');
 assert.equal(formatBuildTimestamp('2026-12-16T17:45:00.000Z'), '16 Dec 2026, 17:45');
 assert.equal(formatBuildTimestamp(''), '');
});
test('deployment ledger result is immutable and cannot reset to the old build sequence', async () => {
 const client = { query: async (sql, args) => { assert.deepEqual(args, ['dpl_synthetic', 'preview']); assert.match(sql, /allocate\(\$1,\$2\)/); return { rows: [{ number: 21, deployed_at: '2026-10-16T17:45:00Z' }] }; } };
 assert.deepEqual(await allocateBuild(client, 'dpl_synthetic', 'preview'), { number: 21, deployedAt: '2026-10-16T17:45:00.000Z', environment: 'preview' });
 await assert.rejects(() => allocateBuild({ query: async () => ({ rows: [{ number: 20 }] }) }, 'dpl_synthetic', 'preview'));
});
