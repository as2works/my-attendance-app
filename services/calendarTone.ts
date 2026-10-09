/** 日曜・事業休日（祝日/年末年始など）= holiday(赤), 土曜 = saturday(青) */
export type DayTone = 'holiday' | 'saturday' | 'weekday';

export function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getDayTone(dateStr: string, holidays: string[] = []): DayTone {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay();
  if (dow === 0 || holidays.includes(dateStr)) return 'holiday';
  if (dow === 6) return 'saturday';
  return 'weekday';
}

export function dayToneHeaderClass(tone: DayTone): string {
  if (tone === 'holiday') return 'bg-rose-100 text-rose-700';
  if (tone === 'saturday') return 'bg-blue-100 text-blue-700';
  return '';
}

export function dayToneCellClass(tone: DayTone): string {
  if (tone === 'holiday') return 'bg-rose-50/50';
  if (tone === 'saturday') return 'bg-blue-50/50';
  return '';
}

export function dayToneTextClass(tone: DayTone): string {
  if (tone === 'holiday') return 'text-rose-600';
  if (tone === 'saturday') return 'text-blue-600';
  return 'text-slate-700';
}

export function mergeHolidays(current: string[], added: string[]): string[] {
  return Array.from(new Set([...(current || []), ...added])).sort();
}

/** YYYY-MM-DD の文字列比較でシーズン内判定（ローカル日付想定） */
export function isDateInSeason(dateStr: string, seasonStart: string, seasonEnd: string): boolean {
  return dateStr >= seasonStart && dateStr <= seasonEnd;
}

/** 指定月のうち、シーズン期間に含まれる日番号だけ返す */
export function daysInMonthWithinSeason(
  year: number,
  monthIndex: number,
  seasonStart: string,
  seasonEnd: string
): number[] {
  const numDays = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: numDays }, (_, i) => i + 1).filter((day) =>
    isDateInSeason(toDateKey(year, monthIndex, day), seasonStart, seasonEnd)
  );
}

/** シーズン開始〜終了の全日付（ローカル、UTCずれなし） */
export function listDatesInSeason(seasonStart: string, seasonEnd: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${seasonStart}T00:00:00`);
  const end = new Date(`${seasonEnd}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return dates;
  }
  const curr = new Date(start);
  while (curr <= end) {
    dates.push(toDateKey(curr.getFullYear(), curr.getMonth(), curr.getDate()));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/** シーズンに含まれる年月かどうか（月送りの制限用） */
export function monthIntersectsSeason(
  year: number,
  monthIndex: number,
  seasonStart: string,
  seasonEnd: string
): boolean {
  return daysInMonthWithinSeason(year, monthIndex, seasonStart, seasonEnd).length > 0;
}

/**
 * カレンダー初期表示用の年月。
 * シーズン内 → 当月 / 期間前 → 開始月 / 期間後 → 終了月
 */
export function getSeasonDisplayPeriod(
  seasonStart: string,
  seasonEnd: string,
  today = new Date()
): { year: number; month: number } {
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  if (todayKey < seasonStart) {
    const start = new Date(`${seasonStart}T00:00:00`);
    return { year: start.getFullYear(), month: start.getMonth() };
  }
  if (todayKey > seasonEnd) {
    const end = new Date(`${seasonEnd}T00:00:00`);
    return { year: end.getFullYear(), month: end.getMonth() };
  }
  return { year: today.getFullYear(), month: today.getMonth() };
}
