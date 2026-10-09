
export type AttendanceStatus = '〇' | '×' | '△' | 'AM' | 'PM' | 'in' | 'out' | '-';

/** グループIDは動的（初期 seed は dorm / home） */
export type GroupId = string;

/** 初期シード用の固定ID（既存データ互換） */
export const DEFAULT_GROUP_IDS = {
  DORM: 'dorm',
  HOME: 'home',
} as const;

/** @deprecated DEFAULT_GROUP_IDS を使ってください */
export const GROUP_IDS = DEFAULT_GROUP_IDS;

export interface Group {
  id: GroupId;
  name: string;
  hasLodgingStatuses: boolean;
  order: number;
}

export interface User {
  id: string;
  name: string;
  groupId: GroupId;
  /** 個人備考（空文字または未設定可）。最大300字 */
  note?: string;
}

export const USER_NOTE_MAX_LENGTH = 300;

export interface Schedule {
  userId: string;
  date: string; // ISO format YYYY-MM-DD
  status: AttendanceStatus;
}

export interface History {
  id: string;
  userId: string;
  userName: string;
  message: string;
  isProcessed: boolean;
  createdAt: string;
  groupId: GroupId;
  recordedAt?: string;
}

export interface SystemConfig {
  id: 'system';
  seasonStartDate: string;
  seasonEndDate: string;
  /** YYYY-MM-DD。日曜と同様に赤くする事業休日 */
  holidays: string[];
}

export type AccessLinkRole = 'ADMIN' | 'GENERAL';

export interface AccessLink {
  id: string;
  role: AccessLinkRole;
  groupId?: GroupId;
}

export type ViewState = 'MAIN' | 'EDIT' | 'ADMIN' | 'NOT_FOUND' | 'LOGGED_OUT';

export interface AccessSession {
  linkId: string;
  role: AccessLinkRole;
  groupId?: GroupId;
}

export function groupLabel(groups: Group[], groupId: GroupId): string {
  return groups.find((g) => g.id === groupId)?.name || groupId;
}
