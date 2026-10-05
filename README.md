# sla-uteis

[![CI](https://github.com/Ph20sr/sla-uteis/actions/workflows/ci.yml/badge.svg)](https://github.com/Ph20sr/sla-uteis/actions/workflows/ci.yml)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

Cálculo de **SLA em horário comercial** para helpdesks, CRMs e painéis de atendimento, com os **feriados brasileiros** já embutidos.

"4 horas úteis" não é `abertura + 4h`. Este pacote pula almoço, noites, fins de semana, feriados nacionais (incluindo Páscoa e Sexta-feira Santa, que mudam de data todo ano), feriados locais e períodos em que o ticket ficou "aguardando cliente".

## Instalação

```bash
npm install github:Ph20sr/sla-uteis
```

## Uso

```js
import { createCalendar, slaStatus } from 'sla-uteis';

const calendar = createCalendar({
  // padrão: seg–sex, 08:00–12:00 e 13:00–18:00
  extraHolidays: ['2026-01-25'],   // aniversário da cidade, recesso...
  optionalHolidays: true,          // Carnaval e Corpus Christi
});

// Ticket aberto sexta 17:00 com SLA de 2 horas úteis
calendar.addBusinessMinutes(new Date(2026, 9, 9, 17, 0), 120);
// → terça 13/10 09:00 (pula o fim de semana e o feriado de 12/10)

const sla = slaStatus({
  calendar,
  startedAt: ticket.createdAt,
  targetMinutes: 240,
  pauses: ticket.waitingCustomer,      // [{ from, to? }]
  stoppedAt: ticket.firstResponseAt,   // opcional
});
// → { status: 'warning', elapsed: 210, remaining: 30, percent: 87.5, deadline: Date }
```

### Status

| status | quando |
| --- | --- |
| `ok` | abaixo de `warnAt` (padrão 80%) da meta |
| `warning` | a partir de 80% da meta |
| `paused` | há uma pausa em aberto (relógio congelado) |
| `met` | `stoppedAt` informado dentro da meta |
| `breached` | meta ultrapassada |

### Expediente customizado

```js
const plantao = createCalendar({
  schedule: {
    1: [['08:00', '18:00']],
    2: [['08:00', '18:00']],
    3: [['08:00', '18:00']],
    4: [['08:00', '18:00']],
    5: [['08:00', '17:00']],
    6: [['09:00', '13:00']],  // sábado de manhã
  },
});
```

`0` é domingo e `6` é sábado. Intervalos sobrepostos ou vazios lançam `RangeError` na criação do calendário, e não no meio de um cálculo.

### Feriados

```js
import { brazilianHolidays } from 'sla-uteis';

brazilianHolidays(2026);
// [{ date: '2026-01-01', name: 'Confraternização Universal', type: 'national' }, ...]
```

Inclui os 9 feriados fixos (com o Dia da Consciência Negra, nacional desde 2024) e a Sexta-feira Santa, calculada pela data da Páscoa. Com `{ optional: true }`, entram também Carnaval (segunda e terça) e Corpus Christi.

## Fuso horário

Os cálculos usam o horário local do processo. No servidor, defina `TZ=America/Sao_Paulo` (ou o fuso da operação) para que "08:00" signifique o expediente real.

## Desenvolvimento

```bash
npm test
```

## Licença

MIT
