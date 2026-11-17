import { test } from 'node:test';
import assert from 'node:assert/strict';
import { riderScheduleForEmail } from './entry-welcome.server';

test('JBFE Sea to Sea emails include the website 08:00 riding departure', () => {
  const result = riderScheduleForEmail({ days: [{ id: 'd1', label: 'Day 1', date: '2027-05-08' }], schedule: [{ dayId: 'd1', time: '08:00', label: 'Riders depart' }] }, null);
  assert.deepEqual(result.flatMap(d => d.items.map(i => i.time)), ['08:00']);
});

test('TDA Nyati emails include riding starts on all three days', () => {
  const days = ['d1', 'd2', 'd3'].map((id, i) => ({ id, label: `Day ${i + 1}`, date: `2027-08-${19 + i}` }));
  const schedule = days.map((d, i) => ({ dayId: d.id, time: i === 2 ? '07:00' : '08:00', label: 'Ride begins' }));
  const result = riderScheduleForEmail({ days, schedule }, null);
  assert.deepEqual(result.flatMap(d => d.items.map(i => i.time)), ['08:00', '08:00', '07:00']);
});

test('Otto1890 Weekend Warrior keeps the correct category starts without TBC', () => {
  const result = riderScheduleForEmail({ days: [{ id: 'd1', label: 'Day 1', date: '2027-04-03' }, { id: 'd2', label: 'Day 2', date: '2027-04-04' }], schedule: [
    { dayId: 'd1', time: '12:30', label: 'Gold riders start' },
    { dayId: 'd1', time: '12:35', label: 'Silver riders start' },
    { dayId: 'd2', time: '08:05', label: 'Silver riders start' },
  ] }, 'Silver');
  assert.deepEqual(result.flatMap(d => d.items.map(i => i.time)), ['12:35', '08:05']);
});