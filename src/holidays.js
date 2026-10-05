const pad = (n) => String(n).padStart(2, '0');

/** Chave YYYY-MM-DD no fuso local. */
export const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const shift = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const FIXED = [
  ['01-01', 'Confraternização Universal'],
  ['04-21', 'Tiradentes'],
  ['05-01', 'Dia do Trabalho'],
  ['09-07', 'Independência do Brasil'],
  ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'],
  ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'],
  ['12-25', 'Natal'],
];

/**
 * Feriados nacionais do ano. Com `optional: true` inclui também os pontos
 * facultativos mais comuns (Carnaval e Corpus Christi), que muitas empresas
 * tratam como feriado.
 *
 * @returns {{ date: string, name: string, type: 'national' | 'optional' }[]}
 */
export function brazilianHolidays(year, { optional = false } = {}) {
  const list = FIXED
    .filter(([md]) => md !== '11-20' || year >= 2024) // nacional pela Lei 14.759/2023
    .map(([md, name]) => ({ date: `${year}-${md}`, name, type: 'national' }));

  const easter = easterSunday(year);
  list.push({ date: dateKey(shift(easter, -2)), name: 'Sexta-feira Santa', type: 'national' });

  if (optional) {
    list.push(
      { date: dateKey(shift(easter, -48)), name: 'Carnaval (segunda)', type: 'optional' },
      { date: dateKey(shift(easter, -47)), name: 'Carnaval (terça)', type: 'optional' },
      { date: dateKey(shift(easter, 60)), name: 'Corpus Christi', type: 'optional' },
    );
  }

  return list.sort((a, b) => a.date.localeCompare(b.date));
}
