import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCalendar, slaStatus } from '../src/index.js';

// Datas locais; outubro de 2026: dia 5 é segunda e dia 12 é feriado.
const at = (day, hh, mm = 0) => new Date(2026, 9, day, hh, mm);
const cal = createCalendar();

test('reconhece expediente, almoço, fim de semana e feriado', () => {
  assert.equal(cal.isBusinessTime(at(5, 9)), true);
  assert.equal(cal.isBusinessTime(at(5, 12, 30)), false);
  assert.equal(cal.isBusinessTime(at(5, 18)), false, 'fim do expediente é exclusivo');
  assert.equal(cal.isBusinessDay(at(10, 10)), false, 'sábado');
  assert.equal(cal.isBusinessDay(at(12, 10)), false, 'Nossa Senhora Aparecida');
  assert.equal(cal.isHoliday(at(12, 10)), true);
});

test('próximo horário útil', () => {
  assert.equal(+cal.nextBusinessTime(at(5, 9, 15)), +at(5, 9, 15));
  assert.equal(+cal.nextBusinessTime(at(5, 12, 10)), +at(5, 13));
  assert.equal(+cal.nextBusinessTime(at(9, 19)), +at(13, 8), 'pula fim de semana e feriado');
});

test('soma minutos úteis atravessando almoço, noite, fim de semana e feriado', () => {
  assert.equal(+cal.addBusinessMinutes(at(5, 11, 30), 60), +at(5, 13, 30));
  assert.equal(+cal.addBusinessMinutes(at(5, 12, 30), 30), +at(5, 13, 30));
  assert.equal(+cal.addBusinessMinutes(at(9, 17), 120), +at(13, 9));
  assert.equal(+cal.addBusinessHours(at(5, 8), 9), +at(5, 18));
  assert.equal(+cal.addBusinessMinutes(at(5, 9), 0), +at(5, 9));
});

test('minutos úteis entre duas datas', () => {
  assert.equal(cal.businessMinutesBetween(at(5, 8), at(6, 8)), 540);
  assert.equal(cal.businessMinutesBetween(at(9, 17), at(13, 9)), 120);
  assert.equal(cal.businessMinutesBetween(at(6, 8), at(5, 8)), -540);
  assert.equal(cal.businessMinutesBetween(at(10, 8), at(11, 20)), 0);
});

test('expediente customizado e feriados extras', () => {
  const plantao = createCalendar({
    schedule: { 6: [['09:00', '13:00']] },
    extraHolidays: ['2026-10-17'],
  });
  assert.equal(+plantao.nextBusinessTime(at(5, 9)), +at(10, 9));
  assert.equal(+plantao.addBusinessMinutes(at(10, 12), 120), +at(24, 10), 'pula o sábado 17');
  assert.throws(() => createCalendar({ schedule: {} }), RangeError);
  assert.throws(() => createCalendar({ schedule: { 1: [['10:00', '09:00']] } }), RangeError);
  assert.throws(() => createCalendar({ schedule: { 1: [['08:00', '12:00'], ['11:00', '13:00']] } }), RangeError);
});

test('SLA: ok, atenção e estourado', () => {
  const base = { calendar: cal, startedAt: at(5, 9), targetMinutes: 240 };

  const ok = slaStatus({ ...base, now: at(5, 12) });
  assert.equal(ok.status, 'ok');
  assert.equal(ok.elapsed, 180);
  assert.equal(ok.percent, 75);
  assert.equal(+ok.deadline, +at(5, 14));

  assert.equal(slaStatus({ ...base, now: at(5, 12, 45) }).elapsed, 180, 'almoço não conta');
  assert.equal(slaStatus({ ...base, now: at(5, 13, 30) }).status, 'warning');

  const late = slaStatus({ ...base, now: at(5, 15) });
  assert.equal(late.status, 'breached');
  assert.equal(late.remaining, -60);
  assert.equal(late.deadline, null);
});

test('SLA: pausas e cumprimento', () => {
  const base = { calendar: cal, startedAt: at(5, 9), targetMinutes: 240 };

  const closedPause = slaStatus({ ...base, now: at(5, 12), pauses: [{ from: at(5, 10), to: at(5, 11) }] });
  assert.equal(closedPause.elapsed, 120);
  assert.equal(closedPause.status, 'ok');

  const openPause = slaStatus({ ...base, now: at(5, 12), pauses: [{ from: at(5, 11) }] });
  assert.equal(openPause.status, 'paused');
  assert.equal(openPause.elapsed, 120);
  assert.equal(+openPause.deadline, +at(5, 15));

  const met = slaStatus({ ...base, now: at(6, 12), stoppedAt: at(5, 11) });
  assert.equal(met.status, 'met');
  assert.equal(met.elapsed, 120);
});
