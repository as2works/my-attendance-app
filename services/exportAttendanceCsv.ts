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

/** Excel が数字のユーザIDを数値化しないよう数式形式にする */
function csvEmployeeIdCell(id: string): string {
  if (!id) return '';
  if (/^\d+$/.test(id)) {
    return `"=""${id.replace(/"/g, '""')}"""`;
  }
  return escapeCsvCell(id);
}

export function buildAttendanceCsv(params: {
  users: User[];
  schedules: Schedule[];
  dates: string[];
}): string {
  const { users, schedules, dates } = params;
  const statusByKey = new Map<string, AttendanceStatus>();
  for (const s of schedules) {
    statusByKey.set(`${s.userId}|${s.date}`, s.status);
  }

  const header = ['ユーザID', '名前', ...dates].map(escapeCsvCell).join(',');
  const rows = users.map((user) => {
    const id = normalizeEmployeeId(user.employeeId);
    const cells = [
      csvEmployeeIdCell(id),
      escapeCsvCell(user.name),
      ...dates.map((date) => escapeCsvCell(statusByKey.get(`${user.id}|${date}`) || '-')),
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
 * 全グループの利用者を表示順（グループ順 → グループ内 order）で集め、
 * シーズン開始日〜終了日の出勤予定を CSV にしてダウンロードする。
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

  for (const group of orderedGroups) {
    const groupUsers = await db.getUsers(group.id);
    if (groupUsers.length === 0) continue;
    allUsers.push(...groupUsers);
    const userIds = groupUsers.map((u) => u.id);
    for (const { year, month } of months) {
      const monthSchedules = await db.getSchedulesForMonth(userIds, year, month, group.id);
      allSchedules.push(...monthSchedules);
    }
  }

  const csv = buildAttendanceCsv({ users: allUsers, schedules: allSchedules, dates });
  const filename = `attendance_${seasonStartDate}_${seasonEndDate}.csv`;
  downloadTextFile(filename, csv);

  return { userCount: allUsers.length, dateCount: dates.length, filename };
}
