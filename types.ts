
export type AttendanceStatus = '〇' | '×' | '△' | 'AM' | 'PM' | 'in' | 'out' | '-';

export const GROUP_IDS = {
  DORM: 'dorm',
  HOME: 'home',
} as const;

export type GroupId = typeof GROUP_IDS[keyof typeof GROUP_IDS];

export const GROUP_LABELS: Record<GroupId, string> = {
  dorm: '寮',
  home: '自宅',
};

export interface Group {
  id: GroupId;
  name: string;
}

export interface User {
  id: string;
  name: string;
  groupId: GroupId;
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
  id: 'system';
  seasonStartDate: string;
  seasonEndDate: string;
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
