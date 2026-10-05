/**
 * Calcula o estado de um SLA.
 *
 * @param {object} params
 * @param {ReturnType<import('./calendar.js').createCalendar>} params.calendar
 * @param {Date} params.startedAt     quando o relógio começou (abertura do ticket)
 * @param {number} params.targetMinutes meta em minutos úteis
 * @param {Date} [params.now]          default: agora
 * @param {Date} [params.stoppedAt]    quando foi cumprido (primeira resposta, resolução)
 * @param {{ from: Date, to?: Date }[]} [params.pauses] períodos "aguardando cliente"
 * @param {number} [params.warnAt=0.8] fração da meta a partir da qual vira "warning"
 */
export function slaStatus({ calendar, startedAt, targetMinutes, now = new Date(), stoppedAt, pauses = [], warnAt = 0.8 }) {
  if (!(targetMinutes > 0)) throw new RangeError('targetMinutes deve ser > 0');
  const end = stoppedAt ?? now;

  const paused = pauses.reduce((sum, p) => {
    const from = p.from < startedAt ? startedAt : p.from;
    const to = p.to ?? end;
    const clipped = to > end ? end : to;
    return clipped > from ? sum + calendar.businessMinutesBetween(from, clipped) : sum;
  }, 0);

  const elapsed = Math.max(0, calendar.businessMinutesBetween(startedAt, end) - paused);
  const remaining = targetMinutes - elapsed;
  const percent = Math.round((elapsed / targetMinutes) * 1000) / 10;

  // O prazo projetado considera as pausas já registradas; uma pausa aberta
  // congela o relógio, então o prazo é recalculado a partir de "agora".
  const openPause = pauses.some((p) => !p.to) && !stoppedAt;
  const deadline = remaining > 0
    ? calendar.addBusinessMinutes(openPause ? end : calendar.nextBusinessTime(end), remaining)
    : null;

  let status;
  if (elapsed > targetMinutes) status = 'breached';
  else if (stoppedAt) status = 'met';
  else if (openPause) status = 'paused';
  else if (elapsed >= targetMinutes * warnAt) status = 'warning';
  else status = 'ok';

  return { status, elapsed, remaining, percent, deadline };
}
