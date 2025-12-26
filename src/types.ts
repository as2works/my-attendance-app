
export type AttendanceStatus = '〇' | '×' | '△' | 'in' | 'out' | '-';

export interface User {
  id: string;
  name: string;
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
}

export interface SystemConfig {
  id: 'system';
  seasonStartDate: string;
  seasonEndDate: string;
}

export type ViewState = 'LOGIN' | 'MAIN' | 'EDIT' | 'ADMIN';
