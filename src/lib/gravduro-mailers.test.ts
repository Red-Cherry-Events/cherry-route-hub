import { test } from 'node:test';
import assert from 'node:assert/strict';
import { riderScheduleForEmail, offersForEvent } from './entry-welcome.server';
import { eventPromosFrom } from './event-promos';
import type { Promo } from './mock-data';

const name = 'GravDuro powered by Westvaal Somerset West Isuzu 2027';
test('GravDuro email carries website times including both cut-offs', () => {
  const schedule = [
    ['06:30', 'Registration and late entries'],
    ['08:00', 'Start: 6-stage gravel riders'],
    ['08:05', 'Start: 6-stage MTB riders'],
    ['08:20', 'Start: 6-stage e-bike riders'],
    ['08:25', 'Start: 4-stage gravel riders'],
    ['08:30', 'Start: 4-stage MTB riders'],
    ['08:35', 'Start: 4-stage e-bike riders'],
    ['13:00', 'Cut-off: Stage 5 start'],
    ['13:15', 'Prize giving'],
    ['14:00', 'Cut-off: Hans se Kop base'],
  ].map(([time, label]) => ({ time, label, dayId: 'd1' }));
  const days = riderScheduleForEmail({ days: [{ id: 'd1', label: 'Race day', date: '2027-05-30' }], schedule }, '6 Timed Stages');
  assert.deepEqual(days[0]?.items.map(i => i.time), ['06:30','08:00','08:05','08:20','08:25','08:30','08:35','13:00','13:15','14:00']);
});
test('GravDuro uses the same three existing offers in app and emails', () => {
  const promos = [
    { brand: 'Cycle Lab', discount: 'R150', code: '', redeem: 'Give the cell number on your entry' },
    { brand: 'Green Motion', discount: '15', code: 'RCE15' },
    { brand: 'Rudy Project', discount: 'R750', code: '', redeem: 'Event only' },
  ].map((p, i) => ({ ...p, id: String(i), title: p.brand, eventMatch: 'weekend warrior,gravduro', active: true })) as Promo[];
  const email = offersForEvent(promos, name);
  assert.deepEqual(email.map(p => [p.brand, p.discount, p.code]), [['Cycle Lab','R150',null],['Green Motion','15','RCE15'],['Rudy Project','R750',null]]);
  assert.deepEqual(eventPromosFrom(promos, name).map(p => p.brand), email.map(p => p.brand));
  assert.equal(eventPromosFrom(promos, 'Unrelated event').length, 0);
});