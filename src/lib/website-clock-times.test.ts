import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keepVerbatimTimes } from './schedule-scrape.server';

test('Nyati website hour-only am/pm and noon times verify without inventing times', () => {
  const items = ['13:00', '14:30', '08:00', '07:00', '12:00', '09:00'].map(time => ({ time, label: 'Programme' }));
  const { kept, dropped } = keepVerbatimTimes(items, [{ text: '1 pm registration, 2:30 pm game drive, 8 am ride begins, 7 am ride begins, back at noon' }]);
  assert.deepEqual(kept.map(i => i.time), ['13:00', '14:30', '08:00', '07:00', '12:00']);
  assert.deepEqual(dropped.map(i => i.time), ['09:00']);
});