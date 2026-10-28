
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import GroupSelector from '../components/GroupSelector';
import UserNoteButton, { hasUserNote } from '../components/UserNoteButton';
import UserNoteModal from '../components/UserNoteModal';
import { db } from '../services/database';
import { User, Schedule, SystemConfig, AttendanceStatus, GroupId, Group, groupLabel, userMatchesQuery } from '../types';
import { STATUS_COLORS, STATUS_LABELS, getStatusOptions } from '../constants';
import {
  toDateKey,
  getDayTone,
  dayToneHeaderClass,
  dayToneCellClass,
  daysInMonthWithinSeason,
  monthIntersectsSeason,
  getSeasonDisplayPeriod,
} from '../services/calendarTone';

interface MainListProps {
  onLogout: () => void;
  onEditUser: (user: User, seedSchedules: Schedule[]) => void;
  config: SystemConfig;
  groups: Group[];
  onNavigateAdmin: () => void;
  isAdmin: boolean;
  groupId: GroupId;
  onGroupChange: (groupId: GroupId) => void;
  /** bootstrapGeneral からの初回データ。一致する group/年月なら初回 fetch をスキップ */
  initialData?: {
    users: User[];
    schedules: Schedule[];
    year: number;
    month: number;
  } | null;
  /** 編集画面から戻ったときの予定差分 */
  schedulePatch?: Schedule[] | null;
  onSchedulePatchApplied?: () => void;
  syncDocumentTitle?: boolean;
}

const MainList: React.FC<MainListProps> = ({
  onLogout,
  onEditUser,
  config,
  groups,
  onNavigateAdmin,
  isAdmin,
  groupId,
  onGroupChange,
  initialData = null,
  schedulePatch = null,
  onSchedulePatchApplied,
  syncDocumentTitle = true,
}) => {
  const currentGroup = groups.find((g) => g.id === groupId);
  const currentGroupName = groupLabel(groups, groupId);
  const fallbackPeriod = getSeasonDisplayPeriod(config.seasonStartDate, config.seasonEndDate);
  const hasBootData =
    !!initialData &&
    initialData.year != null &&
    initialData.month != null;

  const [users, setUsers] = useState<User[]>(() => (hasBootData ? initialData!.users : []));
  const [schedules, setSchedules] = useState<Schedule[]>(() =>
    hasBootData ? initialData!.schedules : []
  );
  const [isLoading, setIsLoading] = useState(!hasBootData);
  const [noteUser, setNoteUser] = useState<User | null>(null);
  const [nameQuery, setNameQuery] = useState('');

  const [currentMonth, setCurrentMonth] = useState(
    hasBootData ? initialData!.month : fallbackPeriod.month
  );
  const [currentYear, setCurrentYear] = useState(
    hasBootData ? initialData!.year : fallbackPeriod.year
  );
  const fetchSeqRef = useRef(0);
  /** 消費済みの initialData キー（groupId|year|month）。一度だけスキップ */
  const consumedInitialKeyRef = useRef<string | null>(
    hasBootData ? `${groupId}|${initialData!.year}|${initialData!.month}` : null
  );

  useEffect(() => {
    const key = `${groupId}|${currentYear}|${currentMonth}`;
    if (consumedInitialKeyRef.current === key) {
      consumedInitialKeyRef.current = null;
      setIsLoading(false);
      return;
    }

    const seq = ++fetchSeqRef.current;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const groupUsers = await db.getUsers(groupId);
        const groupSchedules = await db.getSchedulesForMonth(
          groupUsers.map((u) => u.id),
          currentYear,
          currentMonth,
          groupId
        );
        if (seq !== fetchSeqRef.current) return;
        setUsers(groupUsers);
        setSchedules(groupSchedules);
      } catch (err) {
        console.error(err);
        if (seq !== fetchSeqRef.current) return;
        setUsers([]);
        setSchedules([]);
      } finally {
        if (seq === fetchSeqRef.current) setIsLoading(false);
      }
    };
    void fetchData();
  }, [groupId, currentYear, currentMonth]);

  useEffect(() => {
    setNameQuery('');
    setNoteUser(null);
  }, [groupId]);

  useEffect(() => {
    if (!schedulePatch || schedulePatch.length === 0) return;
    setSchedules((prev) => {
      const map = new Map<string, Schedule>();
      for (const s of prev) {
        map.set(`${s.userId}|${s.date}`, s);
      }
      for (const row of schedulePatch) {
        const key = `${row.userId}|${row.date}`;
        if (row.status === '-') {
          map.delete(key);
        } else {
          map.set(key, row);
        }
      }
      return Array.from(map.values());
    });
    onSchedulePatchApplied?.();
    // onSchedulePatchApplied は親のインライン関数になりがちなので deps に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedulePatch]);

  const showEmployeeId = config.showEmployeeId !== false;
  const normalizedQuery = nameQuery.trim().toLocaleLowerCase('ja');
  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) return users;
    return users.filter((u) =>
      userMatchesQuery(u, nameQuery, { matchEmployeeId: showEmployeeId })
    );
  }, [users, normalizedQuery, nameQuery, showEmployeeId]);

  const days = daysInMonthWithinSeason(
    currentYear,
    currentMonth,
    config.seasonStartDate,
    config.seasonEndDate
  );
  const legendStatuses = getStatusOptions(currentGroup).filter(s => s !== '-');
  const canGoPrev = monthIntersectsSeason(
    currentMonth === 0 ? currentYear - 1 : currentYear,
    currentMonth === 0 ? 11 : currentMonth - 1,
    config.seasonStartDate,
    config.seasonEndDate
  );
  const canGoNext = monthIntersectsSeason(
    currentMonth === 11 ? currentYear + 1 : currentYear,
    currentMonth === 11 ? 0 : currentMonth + 1,
    config.seasonStartDate,
    config.seasonEndDate
  );

  const getStatus = (userId: string, day: number): AttendanceStatus => {
    const dateStr = toDateKey(currentYear, currentMonth, day);
    return schedules.find(s => s.userId === userId && s.date === dateStr)?.status || '-';
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth + offset, 1);
    const y = newDate.getFullYear();
    const m = newDate.getMonth();
    if (!monthIntersectsSeason(y, m, config.seasonStartDate, config.seasonEndDate)) return;
    setCurrentYear(y);
    setCurrentMonth(m);
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() === currentMonth && now.getDate() === day;
  };

  const getDayOfWeek = (day: number) => new Date(currentYear, currentMonth, day).getDay();
  const getDayName = (dayOfWeek: number) => ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];

  return (
    <Layout
      title={`${currentGroupName}・出勤予定一覧`}
      onLogout={onLogout}
      isAdmin={isAdmin}
      navTarget="ADMIN"
      onNavigate={onNavigateAdmin}
      syncDocumentTitle={syncDocumentTitle}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {isAdmin && (
              <GroupSelector groups={groups} value={groupId} onChange={onGroupChange} />
            )}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleMonthChange(-1)}
                disabled={!canGoPrev}
                className={`p-2 rounded-lg border shadow-sm transition ${canGoPrev ? 'bg-white hover:bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-40'}`}
                aria-label="前月"
              >
                <i className="fas fa-chevron-left text-slate-400"></i>
              </button>
              <h2 className="text-xl font-bold text-slate-800 min-w-[140px] text-center">
                {currentYear}年 {currentMonth + 1}月
              </h2>
              <button
                onClick={() => handleMonthChange(1)}
                disabled={!canGoNext}
                className={`p-2 rounded-lg border shadow-sm transition ${canGoNext ? 'bg-white hover:bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-40'}`}
                aria-label="翌月"
              >
                <i className="fas fa-chevron-right text-slate-400"></i>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
            <label className="relative flex-1 sm:w-56">
              <span className="sr-only">{showEmployeeId ? '氏名・ユーザIDで検索' : '氏名で検索'}</span>
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder={showEmployeeId ? '氏名・ユーザIDで検索' : '氏名で検索'}
                className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
              {nameQuery && (
                <button
                  type="button"
                  onClick={() => setNameQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  aria-label="検索をクリア"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </label>
          </div>
        </div>

        {normalizedQuery && !isLoading && (
          <div className="px-4 py-2 border-b border-slate-100 bg-white text-xs font-bold text-slate-500">
            「{nameQuery.trim()}」に一致: {filteredUsers.length}人
            {users.length > 0 ? ` / 全${users.length}人` : ''}
          </div>
        )}

        {/* ヘッダー＋おおむね4〜5人分が見える高さ。以降は縦スクロール */}
        <div className="relative min-h-[200px] max-h-[300px] sm:max-h-[340px] overflow-auto">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3">
                <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-600"></i>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading...</span>
              </div>
            </div>
          )}
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead className="text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-1.5 sm:px-3 py-2 sm:py-3 w-[108px] min-w-[108px] max-w-[108px] sm:w-[148px] sm:min-w-[148px] sm:max-w-[148px] sticky top-0 left-0 bg-slate-50 z-30 border-b border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-[11px] sm:text-sm">
                  {showEmployeeId ? 'ユーザID / 氏名' : '氏名'}
                </th>
                {days.map(day => {
                  const dow = getDayOfWeek(day);
                  const tone = getDayTone(toDateKey(currentYear, currentMonth, day), config.holidays || []);
                  return (
                    <th
                      key={day}
                      className={`px-0.5 sm:px-2 py-1.5 sm:py-3 text-center min-w-[34px] sm:min-w-[45px] sticky top-0 z-20 border-b border-r border-slate-100 last:border-r-0 bg-slate-50 ${dayToneHeaderClass(tone)} ${isToday(day) ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
                    >
                      <div className="text-[9px] sm:text-[10px] opacity-70 leading-none mb-0.5">{getDayName(dow)}</div>
                      <div className="text-xs sm:text-sm font-bold leading-none">{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition group">
                  <td className="px-1.5 sm:px-2.5 py-1.5 sm:py-2.5 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-b border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[108px] min-w-[108px] max-w-[108px] sm:w-[148px] sm:min-w-[148px] sm:max-w-[148px]">
                    <div className="flex flex-col gap-1">
                      {showEmployeeId && user.employeeId ? (
                        <span className="block truncate text-[10px] sm:text-[11px] font-bold text-slate-400 leading-tight" title={user.employeeId}>
                          {user.employeeId}
                        </span>
                      ) : null}
                      <span className="block truncate text-xs sm:text-sm font-bold leading-tight tracking-tight" title={user.name}>
                        {user.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            onEditUser(
                              user,
                              schedules.filter((s) => s.userId === user.id)
                            )
                          }
                          className="flex-1 px-1 py-1 text-[10px] sm:text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm shadow-indigo-100"
                        >
                          編集
                        </button>
                        <UserNoteButton
                          hasNote={hasUserNote(user.note)}
                          onClick={() => setNoteUser(user)}
                          className="!w-6 !h-6 text-[10px]"
                        />
                      </div>
                    </div>
                  </td>
                  {days.map(day => {
                    const status = getStatus(user.id, day);
                    const tone = getDayTone(toDateKey(currentYear, currentMonth, day), config.holidays || []);
                    return (
                      <td key={day} className={`px-0.5 sm:px-1 py-1.5 sm:py-3 text-center border-b border-r border-slate-100 last:border-r-0 ${dayToneCellClass(tone)} ${isToday(day) ? 'bg-indigo-50/50' : ''}`}>
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-md sm:rounded-lg flex items-center justify-center border-2 font-black text-[10px] sm:text-xs transition-all group-hover:scale-110 ${STATUS_COLORS[status] || STATUS_COLORS['-']}`}>
                          {status === '-' ? '' : status}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={Math.max(days.length, 1) + 1} className="px-4 py-12 text-center text-slate-400 font-medium">
                    {currentGroupName}の利用者が登録されていません。管理画面から追加してください。
                  </td>
                </tr>
              )}
              {!isLoading && users.length > 0 && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={Math.max(days.length, 1) + 1} className="px-4 py-12 text-center text-slate-400 font-medium">
                    「{nameQuery.trim()}」に一致する人がいません
                  </td>
                </tr>
              )}
              {!isLoading && users.length > 0 && filteredUsers.length > 0 && days.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-12 text-center text-slate-400 font-medium">
                    この月に入力対象の日はありません（シーズン期間外です）。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 flex flex-wrap gap-6 items-center text-sm text-slate-600 shadow-sm">
        <span className="font-bold text-slate-800 border-b-2 border-indigo-500 pb-1">凡例:</span>
        {legendStatuses.map(status => (
          <div key={status} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold text-xs ${STATUS_COLORS[status]}`}>
              {status}
            </span>
            {STATUS_LABELS[status]}
          </div>
        ))}
      </div>

      {noteUser && (
        <UserNoteModal
          userId={noteUser.id}
          userName={noteUser.name}
          groupId={noteUser.groupId}
          initialNote={noteUser.note || ''}
          onClose={() => setNoteUser(null)}
          onSaved={(note) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === noteUser.id ? { ...u, note } : u))
            );
          }}
        />
      )}
    </Layout>
  );
};

export default MainList;
