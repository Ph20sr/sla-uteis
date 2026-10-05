import { brazilianHolidays, dateKey } from './holidays.js';

const MINUTE = 60_000;
const MAX_DAYS_SCAN = 3660;

/** Expediente padrão: segunda a sexta, 08:00-12:00 e 13:00-18:00. */
export const DEFAULT_SCHEDULE = Object.freeze({
  1: [['08:00', '12:00'], ['13:00', '18:00']],
  2: [['08:00', '12:00'], ['13:00', '18:00']],
  3: [['08:00', '12:00'], ['13:00', '18:00']],
  4: [['08:00', '12:00'], ['13:00', '18:00']],
  5: [['08:00', '12:00'], ['13:00', '18:00']],
});

function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) throw new TypeError(`Horário inválido: ${hhmm}`);
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes > 24 * 60 || Number(match[2]) > 59) throw new RangeError(`Horário inválido: ${hhmm}`);
  return minutes;
}

function normalizeSchedule(schedule) {
  const result = new Map();
  for (const [weekday, ranges] of Object.entries(schedule)) {
    const day = Number(weekday);
    if (!Number.isInteger(day) || day < 0 || day > 6) throw new RangeError(`Dia da semana inválido: ${weekday}`);
    const parsed = ranges
      .map(([start, end]) => [toMinutes(start), toMinutes(end)])
      .sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i][0] >= parsed[i][1]) throw new RangeError(`Intervalo vazio em ${weekday}`);
      if (i > 0 && parsed[i][0] < parsed[i - 1][1]) throw new RangeError(`Intervalos sobrepostos em ${weekday}`);
    }
    if (parsed.length) result.set(day, parsed);
  }
  if (result.size === 0) throw new RangeError('O expediente precisa ter pelo menos um intervalo');
  return result;
}

/**
 * Cria um calendário de horário comercial.
 *
 * @param {object} [options]
 * @param {Record<number, [string, string][]>} [options.schedule] 0 = domingo ... 6 = sábado
 * @param {boolean} [options.nationalHolidays=true] considera os feriados nacionais
 * @param {boolean} [options.optionalHolidays=false] considera Carnaval e Corpus Christi
 * @param {string[]} [options.extraHolidays] datas YYYY-MM-DD (feriados municipais, recesso...)
 */
export function createCalendar({
  schedule = DEFAULT_SCHEDULE,
  nationalHolidays = true,
  optionalHolidays = false,
  extraHolidays = [],
} = {}) {
  const hours = normalizeSchedule(schedule);
  const extra = new Set(extraHolidays);
  const yearCache = new Map();

  function isHoliday(date) {
    const key = dateKey(date);
    if (extra.has(key)) return true;
    if (!nationalHolidays) return false;
    const year = date.getFullYear();
    if (!yearCache.has(year)) {
      yearCache.set(year, new Set(brazilianHolidays(year, { optional: optionalHolidays }).map((h) => h.date)));
    }
    return yearCache.get(year).has(key);
  }

  /** Intervalos de expediente de um dia, como pares [início, fim] de Date. */
  function intervalsOf(date) {
    if (isHoliday(date)) return [];
    const ranges = hours.get(date.getDay()) ?? [];
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    return ranges.map(([s, e]) => [new Date(y, m, d, 0, s), new Date(y, m, d, 0, e)]);
  }

  /** Itera os trechos de expediente a partir de `from`, já recortados. */
  function* businessSpans(from) {
    let day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let scanned = 0; scanned < MAX_DAYS_SCAN; scanned++) {
      for (const [start, end] of intervalsOf(day)) {
        if (end <= from) continue;
        yield [start < from ? from : start, end];
      }
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    }
    throw new RangeError('Nenhum horário útil encontrado nos próximos 10 anos');
  }

  function isBusinessTime(date) {
    return intervalsOf(date).some(([start, end]) => date >= start && date < end);
  }

  function isBusinessDay(date) {
    return intervalsOf(date).length > 0;
  }

  /** Próximo instante útil (o próprio `date` se já estiver no expediente). */
  function nextBusinessTime(date) {
    return businessSpans(date).next().value[0];
  }

  /** Soma minutos úteis a uma data. */
  function addBusinessMinutes(date, minutes) {
    if (!(minutes >= 0)) throw new RangeError('minutes deve ser >= 0');
    let remaining = minutes * MINUTE;
    for (const [start, end] of businessSpans(date)) {
      const span = end - start;
      if (remaining <= span) return new Date(start.getTime() + remaining);
      remaining -= span;
    }
    throw new Error('unreachable');
  }

  /** Minutos úteis entre duas datas (negativo se `to` < `from`). */
  function businessMinutesBetween(from, to) {
    if (to < from) return -businessMinutesBetween(to, from);
    let total = 0;
    for (const [start, end] of businessSpans(from)) {
      if (start >= to) break;
      total += (end < to ? end : to) - start;
    }
    return total / MINUTE;
  }

  return {
    isHoliday,
    isBusinessDay,
    isBusinessTime,
    nextBusinessTime,
    addBusinessMinutes,
    addBusinessHours: (date, h) => addBusinessMinutes(date, h * 60),
    businessMinutesBetween,
  };
}
