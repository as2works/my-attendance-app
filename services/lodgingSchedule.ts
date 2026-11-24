import { AttendanceStatus } from '../types';

/** 出勤として保存・入力する記号（寮 in/out 複合は含まない） */
export const WORK_STATUSES = ['〇', '×', '△', 'AM', 'PM', '-'] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

const WORK_STATUS_SET = new Set<string>(WORK_STATUSES);

/** 旧複合記号 → 出勤 + 宿泊 */
const LEGACY_COMPOUND: Record<
  string,
  { status: AttendanceStatus; lodgingOvernight: boolean }
> = {
  '〇in': { status: '〇', lodgingOvernight: true },
  '×in': { status: '×', lodgingOvernight: true },
  '〇out': { status: '〇', lodgingOvernight: false },
  '×out': { status: '×', lodgingOvernight: false },
  in: { status: '-', lodgingOvernight: true },
  out: { status: '-', lodgingOvernight: false },
};

export type LodgingEdge = 'in' | 'out' | 'stay' | 'none';

/**
 * DB / API 生データから出勤 status と宿泊フラグへ正規化。
 * lodgingOvernight 未設定時:
 * - 複合記号ならそこから復元
 * - legacyOvernightWork かつ 〇/AM/PM なら宿泊あり（旧寮運用）
 */
export function normalizeScheduleFields(
  statusRaw: string | null | undefined,
  lodgingRaw: boolean | null | undefined,
  options?: { legacyOvernightWork?: boolean }
): { status: AttendanceStatus; lodgingOvernight: boolean } {
  const raw = (statusRaw || '-').trim() || '-';
  const compound = LEGACY_COMPOUND[raw];
  let status: AttendanceStatus = compound
    ? compound.status
    : WORK_STATUS_SET.has(raw)
      ? (raw as AttendanceStatus)
      : '-';

  if (typeof lodgingRaw === 'boolean') {
    return { status, lodgingOvernight: lodgingRaw };
  }
  if (compound) {
    return { status: compound.status, lodgingOvernight: compound.lodgingOvernight };
  }
  if (
    options?.legacyOvernightWork &&
    (status === '〇' || status === 'AM' || status === 'PM')
  ) {
    return { status, lodgingOvernight: true };
  }
  return { status, lodgingOvernight: false };
}

/** 保存用。複合記号が来ても分解する */
export function toStoredScheduleFields(
  statusRaw: string,
  lodgingOvernight?: boolean | null
): { status: string; lodgingOvernight: boolean } {
  const n = normalizeScheduleFields(statusRaw, lodgingOvernight, {
    legacyOvernightWork: false,
  });
  return {
    status: WORK_STATUS_SET.has(n.status) ? n.status : '-',
    lodgingOvernight: !!n.lodgingOvernight,
  };
}

export function isWorkStatus(status: string): status is WorkStatus {
  return WORK_STATUS_SET.has(status);
}

/** N-1 未宿泊→N 宿泊 = in、逆 = out。シーズン前は未宿泊扱い */
export function lodgingEdge(
  overnight: boolean,
  prevOvernight: boolean | undefined
): LodgingEdge {
  const prev = !!prevOvernight;
  if (overnight && !prev) return 'in';
  if (!overnight && prev) return 'out';
  if (overnight && prev) return 'stay';
  return 'none';
}

const GLYPH_IN_OUT_BASES = new Set(['〇', '×', '△', 'AM', 'PM']);

/** 寮グループ一覧用。出勤記号 + in/out を合成（〇in / AM out / △in など） */
export function displayScheduleGlyph(
  status: AttendanceStatus,
  edge: LodgingEdge
): string {
  if (status === '-') return '';
  if ((edge === 'in' || edge === 'out') && GLYPH_IN_OUT_BASES.has(status)) {
    // AM/PM は英字なので半角スペースを挟んで読みやすくする
    if (status === 'AM' || status === 'PM') return `${status} ${edge}`;
    return `${status}${edge}`;
  }
  return status;
}

/** 履歴メッセージ用の短いラベル */
export function formatScheduleChangeLabel(
  status: AttendanceStatus,
  lodgingOvernight: boolean
): string {
  const work = status === '-' ? '未入力' : status;
  if (!lodgingOvernight) return work;
  if (status === '〇' || status === '×') return `${status}・宿泊`;
  return `${work}・宿泊`;
}

export function prevDateKey(dateKey: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  dt.setDate(dt.getDate() - 1);
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
