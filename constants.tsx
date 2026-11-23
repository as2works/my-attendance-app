
import { AttendanceStatus, Group } from './types';

/** 〇系は緑、×系は灰で揃える（in/out も同じ色） */
export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  '〇': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×': 'bg-slate-200 text-slate-700 border-slate-300',
  '△': 'bg-amber-100 text-amber-700 border-amber-200',
  'AM': 'bg-sky-100 text-sky-700 border-sky-200',
  'PM': 'bg-violet-100 text-violet-700 border-violet-200',
  '〇in': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×in': 'bg-slate-200 text-slate-700 border-slate-300',
  '〇out': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×out': 'bg-slate-200 text-slate-700 border-slate-300',
  '-': 'bg-white text-slate-300 border-slate-100'
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  '〇': '出勤可能',
  '×': '休み希望',
  '△': '未定',
  'AM': 'AMのみ',
  'PM': 'PMのみ',
  '〇in': '入寮・勤務あり',
  '×in': '入寮・休み',
  '〇out': '出勤して退寮',
  '×out': '休みで退寮',
  '-': '未設定',
};

const SHARED_STATUSES: AttendanceStatus[] = ['〇', '×', '△', 'AM', 'PM', '-'];

/** 寮グループの予定編集：列カテゴリ（お試しレイアウト） */
export const LODGING_STATUS_COLUMNS: ReadonlyArray<{
  title: string;
  statuses: readonly AttendanceStatus[];
}> = [
  { title: '入寮のみ', statuses: ['×in'] },
  { title: '勤務あり', statuses: ['〇in', '〇', '〇out', 'AM', 'PM'] },
  { title: '勤務無し、未定', statuses: ['×', '×out', '△', '-'] },
];

/** 寮: 編集UIの列順に合わせたフラット配列（凡例・許可リスト用） */
const LODGING_STATUSES: AttendanceStatus[] = LODGING_STATUS_COLUMNS.flatMap((c) => [
  ...c.statuses,
]);

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

/** 一覧セル用。スマホは行高を抑える。3文字記号は少し小さく・広めに */
export function statusGlyphClass(status: string): string {
  const long = status.length > 2;
  return long
    ? 'w-7 h-6 sm:w-9 sm:h-8 text-[8px] sm:text-[10px] tracking-tight'
    : 'w-6 h-6 sm:w-8 sm:h-8 text-[10px] sm:text-xs';
}

/** 表示用。試験データの旧 in/out も色だけ落とさない */
const LEGACY_STATUS_COLORS: Record<string, string> = {
  in: 'bg-slate-200 text-slate-700 border-slate-300',
  out: 'bg-slate-200 text-slate-700 border-slate-300',
};

export function statusColorClass(status: string): string {
  return (
    STATUS_COLORS[status as AttendanceStatus] ||
    LEGACY_STATUS_COLORS[status] ||
    STATUS_COLORS['-']
  );
}

export const ADMIN_PASSWORD = 'admin';
export const SHARED_USER_PASSWORD = '932';
