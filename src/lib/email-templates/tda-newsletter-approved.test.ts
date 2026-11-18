import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build, trip_state, two_buttons } from './tda-newsletter-approved';
import { renderTdaNewsletter } from './tda-newsletter';

const base = 'https://riderhub.redcherryevents.co.za/__l5e/assets-v1/3588ac34-a250-4c91-aa02-2897b95d0472';
const unsubscribeUrl = 'https://riderhub.redcherryevents.co.za/tda-newsletter-unsubscribe?token=verified';
describe('Approved Tour de Addo generator', () => {
  for (const number of [1, 2, 3, 4]) it(`matches supplied email ${number} exactly for Shaun, 30, 11, 0`, async () => {
    const expected = readFileSync(new URL(`./__fixtures__/tda-newsletter/email-${number}.html`, import.meta.url), 'utf8').replaceAll('__IMG__', base).replace('href="#"', `href="${unsubscribeUrl}"`);
    const actual = await renderTdaNewsletter({ number, name: 'Shaun', counts: { dar1: { sold: 30, remaining: 0, capacity: 30 }, dar2: { sold: 11, remaining: 19, capacity: 30 }, nyati: { sold: 0, remaining: 40, capacity: 40 }, logo: '', checkedAt: '' }, unsubscribeUrl });
    assert.equal(actual, expected);
  });
  it('keeps the approved nothing-sold branch', () => { assert.deepEqual(trip_state(0, 40), { big: 'Open', small: '', foot: 'Just opened &middot; up to 40 riders', pct: 0, open: true, left: 40 }); });
  it('keeps the approved sold-out branch', () => { assert.deepEqual(trip_state(31, 30), { big: 'Sold out', small: '', foot: '30 of 30 taken &middot; waiting list', pct: 100, open: false, left: 0 }); });
  it('hides book buttons for sold-out trips', () => { assert.equal(two_buttons({ d2: trip_state(30,30), ny: trip_state(40,40) }).includes('<a '), false); });
  it('uses the approved singular subject', () => { assert.equal(build('Shaun', 29, 29, 0)[3][0], '1 spot left on Darlington Trip 2'); });
  it('uses the approved full Darlington subject', () => { assert.equal(build('Shaun', 30, 30, 1)[3][0], 'Darlington is full. Nyathi is still open'); });
});