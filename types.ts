
export type AttendanceStatus = '〇' | '×' | '△' | 'AM' | 'PM' | 'in' | 'out' | '-';

/** グループIDは動的（初期 seed は dorm / home） */
export type GroupId = string;

export type WorkspaceId = string;

/** 初期シード用の固定ID（既存データ互換） */
export const DEFAULT_GROUP_IDS = {
  DORM: 'dorm',
  HOME: 'home',
} as const;

export const DEFAULT_WORKSPACE_ID = 'default';

/** @deprecated DEFAULT_GROUP_IDS を使ってください */
export const GROUP_IDS = DEFAULT_GROUP_IDS;

export interface Workspace {
  id: WorkspaceId;
  name: string;
  note: string;
  order: number;
  seasonStartDate?: string;
  seasonEndDate?: string;
  groupCount?: number;
  userCount?: number;
  adminLinkId?: string | null;
}

export interface Group {
  id: GroupId;
  name: string;
  hasLodgingStatuses: boolean;
  order: number;
  workspaceId?: WorkspaceId;
}

export interface User {
  id: string;
  name: string;
  groupId: GroupId;
  workspaceId?: WorkspaceId;
  /** 出勤・給与など外部システム連携用のユーザID（内部UUIDとは別） */
  employeeId?: string;
  /** 個人備考（空文字または未設定可）。最大300字 */
  note?: string;
}

export const USER_NOTE_MAX_LENGTH = 300;
export const WORKSPACE_NOTE_MAX_LENGTH = 300;

export function normalizeEmployeeId(value?: string | null): string {
  return (value || '').trim();
}

/** 氏名またはユーザIDの部分一致 */
export function userMatchesQuery(
  user: Pick<User, 'name' | 'employeeId'>,
  query: string,
  options?: { matchEmployeeId?: boolean }
): boolean {
  const q = query.trim().toLocaleLowerCase('ja');
  if (!q) return true;
  if (user.name.toLocaleLowerCase('ja').includes(q)) return true;
  if (options?.matchEmployeeId === false) return false;
  return normalizeEmployeeId(user.employeeId).toLocaleLowerCase('ja').includes(q);
}

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
  id: string;
  seasonStartDate: string;
  seasonEndDate: string;
  /** YYYY-MM-DD。日曜と同様に赤くする事業休日 */
  holidays: string[];
  /** ユーザIDを画面に表示するか（未設定・true で表示） */
  showEmployeeId: boolean;
}

export type AccessLinkRole = 'OWNER' | 'ADMIN' | 'GENERAL';

export interface AccessLink {
  id: string;
  role: AccessLinkRole;
  workspaceId?: WorkspaceId;
  groupId?: GroupId;
}

export type ViewState = 'MAIN' | 'EDIT' | 'ADMIN' | 'PORTAL' | 'NOT_FOUND' | 'LOGGED_OUT';

export interface AccessSession {
  linkId: string;
  role: AccessLinkRole;
  workspaceId?: WorkspaceId;
  groupId?: GroupId;
}

export function groupLabel(groups: Group[], groupId: GroupId): string {
  return groups.find((g) => g.id === groupId)?.name || groupId;
}
