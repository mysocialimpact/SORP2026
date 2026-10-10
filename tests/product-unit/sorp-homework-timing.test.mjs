import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworkMessages, homeworkMessageDuration, homeworkMessageAt, homeworkFinishDelay } from '../../src/app/sorp-homework-timing.ts';

test('homework messages have readable dwell times and finish after the minimum without cutting a message', () => {
  let elapsed = 0;
  homeworkMessages.forEach((message, index) => {
    assert.equal(homeworkMessageAt(elapsed).index, index);
    const duration = homeworkMessageDuration(message);
    assert.ok(duration >= 5000);
    elapsed += duration;
  });
  assert.equal(homeworkMessageAt(elapsed).index, 0);
  for (const finish of [0, 1000, 19999, 20000, 28000, 65000]) {
    const readyAt = finish + homeworkFinishDelay(finish);
    assert.ok(readyAt >= 20000 && readyAt >= finish);
    assert.equal(homeworkMessageAt(readyAt - 1).endAt, readyAt);
  }
});
