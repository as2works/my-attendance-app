
import { AttendanceStatus, Group } from './types';

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  '〇': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×': 'bg-rose-100 text-rose-700 border-rose-200',
  '△': 'bg-amber-100 text-amber-700 border-amber-200',
  'AM': 'bg-sky-100 text-sky-700 border-sky-200',
  'PM': 'bg-violet-100 text-violet-700 border-violet-200',
  'in': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'out': 'bg-slate-100 text-slate-700 border-slate-200',
  '-': 'bg-white text-slate-300 border-slate-100'
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  '〇': '出勤可能',
  '×': '休み希望',
  '△': '未定',
  'AM': 'AMのみ',
  'PM': 'PMのみ',
  'in': '入寮日',
  'out': '退寮日',
  '-': '未設定',
};

const SHARED_STATUSES: AttendanceStatus[] = ['〇', '×', '△', 'AM', 'PM', '-'];
const LODGING_STATUSES: AttendanceStatus[] = ['〇', '×', '△', 'AM', 'PM', 'in', 'out', '-'];

export function getStatusOptions(groupOrFlag: Group | boolean | undefined): AttendanceStatus[] {
  const hasLodging =
    typeof groupOrFlag === 'boolean'
      ? groupOrFlag
      : !!groupOrFlag?.hasLodgingStatuses;
  return hasLodging ? LODGING_STATUSES : SHARED_STATUSES;
}

export function isStatusAllowed(
  groupOrFlag: Group | boolean | undefined,
  status: AttendanceStatus
): boolean {
  return getStatusOptions(groupOrFlag).includes(status);
}

export const ADMIN_PASSWORD = 'admin';
export const SHARED_USER_PASSWORD = '932';
