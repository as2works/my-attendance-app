
import { AttendanceStatus, Group } from './types';

/** 〇系は緑、×系は灰で揃える（一覧の導出 in/out 表示用も含む） */
export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  '〇': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×': 'bg-slate-200 text-slate-700 border-slate-300',
  '△': 'bg-orange-100 text-orange-800 border-orange-200',
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

/** 入力・保存用（全グループ共通）。寮宿泊は lodgingOvernight で別管理 */
const WORK_INPUT_STATUSES: AttendanceStatus[] = ['〇', '×', '△', 'AM', 'PM', '-'];

export function getStatusOptions(_groupOrFlag?: Group | boolean | undefined): AttendanceStatus[] {
  return WORK_INPUT_STATUSES;
}

export function isStatusAllowed(
  _groupOrFlag: Group | boolean | undefined,
  status: AttendanceStatus
): boolean {
  return WORK_INPUT_STATUSES.includes(status);
}

/** 一覧セル用。スマホは行高を抑える。3文字記号は少し小さく。AM out 等の折り返しは行間を詰める */
export function statusGlyphClass(status: string): string {
  const long = status.length > 2;
  const spaced = status.includes(' ');
  if (spaced) {
    return 'w-7 min-h-6 h-auto sm:w-9 sm:min-h-8 py-0.5 px-0.5 text-[8px] sm:text-[10px] tracking-tight leading-none text-center';
  }
  return long
    ? 'w-7 h-6 sm:w-9 sm:h-8 text-[8px] sm:text-[10px] tracking-tight leading-none'
    : 'w-6 h-6 sm:w-8 sm:h-8 text-[10px] sm:text-xs leading-none';
}

/** 表示用。試験データの旧 in/out も色だけ落とさない */
const LEGACY_STATUS_COLORS: Record<string, string> = {
  in: 'bg-slate-200 text-slate-700 border-slate-300',
  out: 'bg-slate-200 text-slate-700 border-slate-300',
};

/** AMin / AM out / △out など導出表示は、元の出勤記号の色を使う */
function colorKeyForStatus(status: string): string {
  if (STATUS_COLORS[status as AttendanceStatus]) return status;
  if (LEGACY_STATUS_COLORS[status]) return status;
  const m = /^(〇|×|△|AM|PM)\s?(in|out)$/.exec(status);
  if (m) return m[1];
  return status;
}

export function statusColorClass(status: string): string {
  const key = colorKeyForStatus(status);
  return (
    STATUS_COLORS[key as AttendanceStatus] ||
    LEGACY_STATUS_COLORS[key] ||
    STATUS_COLORS['-']
  );
}

/**
 * 寮グループ一覧: 宿泊日のセル背景（土日・祝の青赤より優先）。
 * △記号は orange、宿泊背景は lemon 寄りの yellow で分離する。
 */
export const LODGING_OVERNIGHT_CELL_CLASS = 'bg-yellow-100/75';
