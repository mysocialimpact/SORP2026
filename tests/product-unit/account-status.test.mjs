import test from 'node:test';
import assert from 'node:assert/strict';
import { accountStatus } from '../../src/lib/account-status.ts';

test('visitor status states the actual public Ask SORP allowance', () => {
  assert.deepEqual(accountStatus({ signedIn: false }), {
    label: 'VISITOR · 3 free AI questions', compactLabel: 'VISITOR · 3 AI questions',
    plan: 'Visitor', founder: false,
  });
});

test('the highest active subscription is shown without inferring it from organisation type', () => {
  const status = accountStatus({ signedIn: true, platformAccess: { memberships: [
    { type: 'Adviser', role: 'owner', entitlement: { plan: 'Free', status: 'standard' } },
    { type: 'Charity', role: 'member', entitlement: { plan: 'Plus', status: 'standard' } },
  ] } });
  assert.equal(status.label, 'PLUS · 3 AI questions');
  assert.equal(status.plan, 'Plus');
});

test('verified founder permission is distinct from the subscription plan', () => {
  const status = accountStatus({ signedIn: true, platformAccess: { founder: true, memberships: [
    { type: 'Adviser', entitlement: { plan: 'Adviser', status: 'complimentary_partner', complimentaryEnd: null } },
  ] } });
  assert.equal(status.label, 'FOUNDER · ADVISER PLAN · 3 AI questions');
  assert.equal(status.founder, true);
});

test('every published plan keeps the same currently enforced AI allowance', () => {
  for (const plan of ['Free', 'Plus', 'Adviser', 'Enterprise']) {
    const status = accountStatus({ signedIn: true, platformAccess: { memberships: [
      { type: 'Other', entitlement: { plan, status: 'standard' } },
    ] } });
    assert.equal(status.plan, plan);
    assert.match(status.label, /3 AI questions$/);
  }
});

test('suspended and expired complimentary entitlements do not overstate access', () => {
  const expired = '2026-10-16T12:00:00Z';
  for (const entitlement of [
    { plan: 'Enterprise', status: 'suspended' },
    { plan: 'Adviser', status: 'complimentary_partner', complimentaryEnd: expired },
  ]) {
    assert.equal(accountStatus({ signedIn: true, platformAccess: { memberships: [{ entitlement }] } }, Date.parse('2026-10-17T12:00:00Z')).plan, 'Free');
  }
});
