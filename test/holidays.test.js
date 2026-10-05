import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easterSunday, brazilianHolidays, dateKey } from '../src/index.js';

test('Páscoa em anos conhecidos', () => {
  assert.equal(dateKey(easterSunday(2024)), '2024-03-31');
  assert.equal(dateKey(easterSunday(2025)), '2025-04-20');
  assert.equal(dateKey(easterSunday(2026)), '2026-04-05');
  assert.equal(dateKey(easterSunday(2027)), '2027-03-28');
  assert.equal(dateKey(easterSunday(2038)), '2038-04-25');
});

test('feriados nacionais de 2026', () => {
  const dates = brazilianHolidays(2026).map((h) => h.date);
  assert.deepEqual(dates, [
    '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
    '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  ]);
});

test('pontos facultativos opcionais', () => {
  const optional = brazilianHolidays(2026, { optional: true }).filter((h) => h.type === 'optional');
  assert.deepEqual(optional.map((h) => h.date), ['2026-02-16', '2026-02-17', '2026-06-04']);
});

test('Consciência Negra só é nacional a partir de 2024', () => {
  assert.equal(brazilianHolidays(2023).some((h) => h.date === '2023-11-20'), false);
  assert.equal(brazilianHolidays(2024).some((h) => h.date === '2024-11-20'), true);
});
