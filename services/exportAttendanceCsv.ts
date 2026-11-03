import { AttendanceStatus, Group, Schedule, User, normalizeEmployeeId } from '../types';
import { listDatesInSeason } from './calendarTone';
import { db } from './database';

/** シーズンにまたがる年月（month は 0始まり、API と同じ） */
export function listYearMonthsInSeason(
  seasonStart: string,
  seasonEnd: string
): { year: number; month: number }[] {
  const dates = listDatesInSeason(seasonStart, seasonEnd);
  const seen = new Set<string>();
  const result: { year: number; month: number }[] = [];
  for (const d of dates) {
    const year = Number(d.slice(0, 4));
    const month = Number(d.slice(5, 7)) - 1;
    const key = `${year}-${month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ year, month });
  }
  return result;
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** 内部日付キー YYYY-MM-DD → Excel突合用 YYYY/MM/DD */
export function toExcelDateHeader(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

/** 出勤未入力は空欄。'-' は出さない */
function csvStatusCell(status: AttendanceStatus | undefined): string {
  if (!status || status === '-') return '';
  return escapeCsvCell(status);
}

export function buildAttendanceCsv(params: {
  users: User[];
  schedules: Schedule[];
  /** YYYY-MM-DD（シーズン内日付） */
  dates: string[];
}): string {
  const { users, schedules, dates } = params;
  const statusByKey = new Map<string, AttendanceStatus>();
  for (const s of schedules) {
    statusByKey.set(`${s.userId}|${s.date}`, s.status);
  }

  const header = ['ID', '氏名', ...dates.map(toExcelDateHeader)].map(escapeCsvCell).join(',');
  const rows = users.map((user) => {
    const id = normalizeEmployeeId(user.employeeId);
    const cells = [
      escapeCsvCell(id),
      escapeCsvCell(user.name),
      ...dates.map((date) => csvStatusCell(statusByKey.get(`${user.id}|${date}`))),
    ];
    return cells.join(',');
  });

  // Excel（日本語Windows）向けに UTF-8 BOM 付き
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 全グループの利用者を集め、シーズン開始日〜終了日の出勤予定を CSV にしてダウンロードする。
 * Excel / VBA 取込向け: UTF-8 BOM、ヘッダ ID/氏名/YYYY/MM/DD、未入力は空欄。
 */
export async function exportAllAttendanceCsv(params: {
  groups: Group[];
  seasonStartDate: string;
  seasonEndDate: string;
}): Promise<{ userCount: number; dateCount: number; filename: string }> {
  const { groups, seasonStartDate, seasonEndDate } = params;
  const dates = listDatesInSeason(seasonStartDate, seasonEndDate);
  if (dates.length === 0) {
    throw new Error('EMPTY_SEASON');
  }

  const orderedGroups = [...groups].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));
  const allUsers: User[] = [];
  const allSchedules: Schedule[] = [];
  const months = listYearMonthsInSeason(seasonStartDate, seasonEndDate);

  const mapPool = async <T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let next = 0;
    const run = async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i]);
      }
    };
    const n = Math.max(1, Math.min(concurrency, items.length || 1));
    await Promise.all(Array.from({ length: n }, () => run()));
    return results;
  };

  for (const group of orderedGroups) {
    const groupUsers = await db.getUsers(group.id);
    if (groupUsers.length === 0) continue;
    allUsers.push(...groupUsers);
    const userIds = groupUsers.map((u) => u.id);
    let monthChunks: Schedule[][];
    try {
      monthChunks = await mapPool(months, 4, ({ year, month }) =>
        db.getSchedulesForMonth(userIds, year, month, group.id)
      );
    } catch (err) {
      console.error('CSV export schedule fetch failed', { groupId: group.id, err });
      throw new Error(`EXPORT_SCHEDULES_FAILED:${group.name}`);
    }
    for (const monthSchedules of monthChunks) {
      if (!Array.isArray(monthSchedules)) {
        throw new Error(`EXPORT_SCHEDULES_INVALID:${group.name}`);
      }
      allSchedules.push(...monthSchedules);
    }
  }

  const csv = buildAttendanceCsv({ users: allUsers, schedules: allSchedules, dates });
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `出勤確認表_${stamp}.csv`;
  downloadTextFile(filename, csv);

  return { userCount: allUsers.length, dateCount: dates.length, filename };
}
