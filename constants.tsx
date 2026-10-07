
import { AttendanceStatus, GroupId, GROUP_IDS } from './types';

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
const DORM_ONLY_STATUSES: AttendanceStatus[] = ['in', 'out'];

export function getStatusOptions(groupId: GroupId): AttendanceStatus[] {
  if (groupId === GROUP_IDS.DORM) {
    return [...SHARED_STATUSES.slice(0, 5), ...DORM_ONLY_STATUSES, '-'];
  }
  return SHARED_STATUSES;
}

export function isStatusAllowed(groupId: GroupId, status: AttendanceStatus): boolean {
  return getStatusOptions(groupId).includes(status);
}

/** 後方互換: 旧コード向け。新規は getStatusOptions を使う */
export const STATUS_OPTIONS: AttendanceStatus[] = getStatusOptions(GROUP_IDS.DORM);

export const ADMIN_PASSWORD = 'admin';
export const SHARED_USER_PASSWORD = '932';
