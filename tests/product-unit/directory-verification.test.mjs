import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificationDecision } from '../../src/lib/directory-verification.ts';

test('research approval, payment, and string truthy values cannot award MSI verification', () => {
  for (const value of [undefined, 'true', 'Approved', 1, {paid:true}, false]) {
    assert.equal(verificationDecision(undefined, value, 'Research approved', 'founder'), undefined);
  }
  assert.throws(() => verificationDecision(undefined, true, '  ', 'founder'), /reason/);
});

test('explicit award and withdrawal preserve attributable decisions without affecting unrelated saves', () => {
  const approved = verificationDecision(undefined, true, 'Charity team interviewed and evidence assessed', 'founder');
  assert.equal(approved.approved, true);
  assert.equal(approved.actor, 'founder');
  assert.ok(Number.isFinite(Date.parse(approved.decidedAt)));
  assert.equal(verificationDecision(approved, undefined, '', 'other'), approved);
  assert.equal(verificationDecision(approved, true, '', 'other'), approved);
  assert.throws(() => verificationDecision(approved, false, '', 'founder'), /reason/);
  const withdrawn = verificationDecision(approved, false, 'Further review required', 'founder');
  assert.equal(withdrawn.approved, false);
  assert.equal(withdrawn.note, 'Further review required');
  assert.equal(approved.approved, true);
});
