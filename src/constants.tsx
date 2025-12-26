
import React from 'react';
import { AttendanceStatus } from './types';

export const STATUS_OPTIONS: AttendanceStatus[] = ['〇', '×', '△', 'in', 'out', '-'];

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  '〇': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×': 'bg-rose-100 text-rose-700 border-rose-200',
  '△': 'bg-amber-100 text-amber-700 border-amber-200',
  'in': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'out': 'bg-slate-100 text-slate-700 border-slate-200',
  '-': 'bg-white text-slate-300 border-slate-100'
};

export const ADMIN_PASSWORD = 'admin';
export const SHARED_USER_PASSWORD = '932';
