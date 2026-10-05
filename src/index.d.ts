export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Schedule = Partial<Record<Weekday, [string, string][]>>;

export interface Holiday { date: string; name: string; type: 'national' | 'optional' }

export function easterSunday(year: number): Date;
export function brazilianHolidays(year: number, options?: { optional?: boolean }): Holiday[];
export function dateKey(date: Date): string;

export const DEFAULT_SCHEDULE: Readonly<Schedule>;

export interface CalendarOptions {
  schedule?: Schedule;
  nationalHolidays?: boolean;
  optionalHolidays?: boolean;
  extraHolidays?: string[];
}

export interface BusinessCalendar {
  isHoliday(date: Date): boolean;
  isBusinessDay(date: Date): boolean;
  isBusinessTime(date: Date): boolean;
  nextBusinessTime(date: Date): Date;
  addBusinessMinutes(date: Date, minutes: number): Date;
  addBusinessHours(date: Date, hours: number): Date;
  businessMinutesBetween(from: Date, to: Date): number;
}

export function createCalendar(options?: CalendarOptions): BusinessCalendar;

export type SlaState = 'ok' | 'warning' | 'paused' | 'met' | 'breached';

export interface SlaResult {
  status: SlaState;
  elapsed: number;
  remaining: number;
  percent: number;
  deadline: Date | null;
}

export function slaStatus(params: {
  calendar: BusinessCalendar;
  startedAt: Date;
  targetMinutes: number;
  now?: Date;
  stoppedAt?: Date;
  pauses?: { from: Date; to?: Date }[];
  warnAt?: number;
}): SlaResult;
