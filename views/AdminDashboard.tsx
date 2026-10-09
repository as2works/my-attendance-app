
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import GroupSelector from '../components/GroupSelector';
import AccessLinksPanel from '../components/AccessLinksPanel';
import GroupsPanel from '../components/GroupsPanel';
import UserNoteButton, { hasUserNote } from '../components/UserNoteButton';
import UserNoteModal from '../components/UserNoteModal';
import { db } from '../services/database';
import { User, History, SystemConfig, Schedule, AttendanceStatus, Group, GroupId, groupLabel } from '../types';
import { STATUS_COLORS } from '../constants';
import {
  toDateKey,
  getDayTone,
  dayToneHeaderClass,
  dayToneCellClass,
  mergeHolidays,
  getSeasonDisplayPeriod,
} from '../services/calendarTone';

const OVERVIEW_SPLIT_KEY = 'kss-admin-overview-split';
/** 予定・履歴パネルそれぞれの最小高さ（px） */
const OVERVIEW_PANEL_MIN_PX = 140;
const OVERVIEW_SPLIT_DEFAULT = 50;
const OVERVIEW_HANDLE_PX = 12;

function readStoredSplitPercent(): number {
  try {
    const raw = localStorage.getItem(OVERVIEW_SPLIT_KEY);
    const v = raw == null ? NaN : Number(raw);
    if (Number.isFinite(v) && v >= 20 && v <= 80) return v;
  } catch {
    /* ignore */
  }
  return OVERVIEW_SPLIT_DEFAULT;
}

interface AdminDashboardProps {
  onLogout: () => void;
  onConfigUpdate: () => void;
  onNavigateGeneral: () => void;
  groups: Group[];
  onGroupsChange: (groups?: Group[]) => void | Promise<void>;
  groupId: GroupId;
  onGroupChange: (groupId: GroupId) => void;
  currentLinkId: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onConfigUpdate,
  onNavigateGeneral,
  groups,
  onGroupsChange,
  groupId,
  onGroupChange,
  currentLinkId,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'GROUPS' | 'CONFIG' | 'LINKS'>('OVERVIEW');
  const [users, setUsers] = useState<User[]>([]);
  const [histories, setHistories] = useState<History[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserGroupId, setNewUserGroupId] = useState(groupId);
  const [showProcessedHistory, setShowProcessedHistory] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [holidayDraft, setHolidayDraft] = useState('');
  const [configSaveNotice, setConfigSaveNotice] = useState<string | null>(null);
  const [noteUser, setNoteUser] = useState<User | null>(null);
  const [moveUserId, setMoveUserId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [renameUserId, setRenameUserId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [unprocessedCounts, setUnprocessedCounts] = useState<Record<string, number>>({});
  const [overviewTopPercent, setOverviewTopPercent] = useState(readStoredSplitPercent);
  const overviewSplitRef = useRef<HTMLDivElement>(null);
  const overviewDraggingRef = useRef(false);
  const overviewTopPercentRef = useRef(overviewTopPercent);
  overviewTopPercentRef.current = overviewTopPercent;
  const seasonPeriodInitializedRef = useRef(false);

  const currentGroupName = groupLabel(groups, groupId);
  const otherGroups = groups.filter((g) => g.id !== groupId);
  const holidays = config?.holidays || [];
  const normalizedQuery = nameQuery.trim().toLocaleLowerCase('ja');

  const updateOverviewSplitFromClientY = (clientY: number) => {
    const el = overviewSplitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const available = rect.height - OVERVIEW_HANDLE_PX;
    if (available <= OVERVIEW_PANEL_MIN_PX * 2) return;
    let topPx = clientY - rect.top - OVERVIEW_HANDLE_PX / 2;
    topPx = Math.max(
      OVERVIEW_PANEL_MIN_PX,
      Math.min(available - OVERVIEW_PANEL_MIN_PX, topPx)
    );
    setOverviewTopPercent((topPx / available) * 100);
  };

  const endOverviewSplitDrag = () => {
    if (!overviewDraggingRef.current) return;
    overviewDraggingRef.current = false;
    try {
      localStorage.setItem(
        OVERVIEW_SPLIT_KEY,
        String(Math.round(overviewTopPercentRef.current * 10) / 10)
      );
    } catch {
      /* ignore */
    }
  };

  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) return users;
    return users.filter((u) =>
      u.name.toLocaleLowerCase('ja').includes(normalizedQuery)
    );
  }, [users, normalizedQuery]);

  const visibleHistories = useMemo(() => {
    const base = showProcessedHistory
      ? histories
      : histories.filter((h) => !h.isProcessed);
    if (!normalizedQuery) return base;
    return base.filter((h) =>
      h.userName.toLocaleLowerCase('ja').includes(normalizedQuery)
    );
  }, [histories, showProcessedHistory, normalizedQuery]);

  useEffect(() => {
    setNewUserGroupId(groupId);
    setNameQuery('');
  }, [groupId]);

  const refreshUnprocessedCounts = async () => {
    try {
      setUnprocessedCounts(await db.getUnprocessedHistoryCounts());
    } catch (err) {
      console.error(err);
    }
  };

  const refreshData = async (year = currentYear, month = currentMonth) => {
    setIsUpdating(true);
    const groupUsers = await db.getUsers(groupId);
    const [h, s, c] = await Promise.all([
      db.getHistories(groupId, { includeProcessed: showProcessedHistory }),
      db.getSchedulesForMonth(groupUsers.map(u => u.id), year, month, groupId),
      db.getConfig(),
    ]);
    setUsers(groupUsers);
    setHistories(h);
    setSchedules(s);
    setConfig(c);
    setIsUpdating(false);
    void refreshUnprocessedCounts();

    if (!seasonPeriodInitializedRef.current && c?.seasonStartDate && c?.seasonEndDate) {
      seasonPeriodInitializedRef.current = true;
      const period = getSeasonDisplayPeriod(c.seasonStartDate, c.seasonEndDate);
      if (period.month !== month || period.year !== year) {
        setCurrentMonth(period.month);
        setCurrentYear(period.year);
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [groupId, showProcessedHistory, currentYear, currentMonth]);

  useEffect(() => {
    void refreshUnprocessedCounts();
  }, [groups]);

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    const name = newUserName.trim();
    const targetGroupId = newUserGroupId || groupId;
    await db.saveUser({ id: '', name, groupId: targetGroupId });
    setNewUserName('');
    if (targetGroupId !== groupId) {
      onGroupChange(targetGroupId);
    } else {
      refreshData();
    }
    alert(`${groupLabel(groups, targetGroupId)}に「${name}」を追加しました。`);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('この利用者を削除してもよろしいですか？（出勤予定も削除されます）')) {
      await db.deleteUser(id);
      refreshData();
      alert('利用者を削除しました。');
    }
  };

  const openRenameUser = (user: User) => {
    setRenameUserId(user.id);
    setRenameDraft(user.name);
  };

  const confirmRenameUser = async () => {
    const user = users.find((u) => u.id === renameUserId);
    if (!user || renameBusy) return;
    const name = renameDraft.trim();
    if (!name) {
      alert('氏名を入力してください。');
      return;
    }
    if (name === user.name) {
      setRenameUserId(null);
      return;
    }
    setRenameBusy(true);
    try {
      await db.saveUser({ id: user.id, name, groupId: user.groupId });
      setRenameUserId(null);
      await refreshData();
      alert(`「${user.name}」を「${name}」に変更しました。`);
    } catch (err) {
      console.error(err);
      alert('氏名の変更に失敗しました。sandbox のデプロイ完了後にもう一度お試しください。');
    } finally {
      setRenameBusy(false);
    }
  };

  const handleMoveUser = async (index: number, direction: 'up' | 'down') => {
    const newUsers = [...users];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newUsers.length) return;
    [newUsers[index], newUsers[targetIndex]] = [newUsers[targetIndex], newUsers[index]];
    setUsers(newUsers);
    await db.saveUsers(newUsers);
  };

  const openMoveUser = (user: User) => {
    if (!otherGroups.length) {
      alert('移動先のグループがありません');
      return;
    }
    setMoveUserId(user.id);
    setMoveTargetId(otherGroups[0].id);
  };

  const confirmMoveUser = async () => {
    const user = users.find((u) => u.id === moveUserId);
    if (!user || !moveTargetId) return;
    await db.moveUserToGroup(user.id, moveTargetId);
    setMoveUserId(null);
    refreshData();
    alert(`「${user.name}」を${groupLabel(groups, moveTargetId)}へ移しました（履歴も一緒に移動します）。`);
  };

  const handleProcessHistory = async (id: string, isProcessed: boolean) => {
    await db.updateHistoryStatus(id, isProcessed);
    setHistories(prev => {
      const next = prev.map(h => h.id === id ? { ...h, isProcessed } : h);
      return showProcessedHistory ? next : next.filter(h => !h.isProcessed);
    });
    setUnprocessedCounts((prev) => {
      const current = prev[groupId] ?? 0;
      const nextCount = Math.max(0, current + (isProcessed ? -1 : 1));
      return { ...prev, [groupId]: nextCount };
    });
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    await persistConfig(config, '期間設定を保存しました');
  };

  const showConfigSaved = (message: string) => {
    setConfigSaveNotice(message);
    window.setTimeout(() => {
      setConfigSaveNotice((current) => (current === message ? null : current));
    }, 2500);
  };

  const persistConfig = async (next: SystemConfig, successMessage?: string) => {
    setConfig(next);
    try {
      await db.saveConfig({
        ...next,
        holidays: next.holidays || [],
      });
      onConfigUpdate();
      if (successMessage) showConfigSaved(successMessage);
      await refreshData();
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。通信状況を確認してもう一度お試しください。');
      await refreshData();
    }
  };

  const addHoliday = async () => {
    if (!config || !holidayDraft) return;
    const nextHolidays = mergeHolidays(config.holidays || [], [holidayDraft]);
    setHolidayDraft('');
    await persistConfig(
      { ...config, holidays: nextHolidays },
      '休日を追加して保存しました'
    );
  };

  const removeHoliday = async (dateStr: string) => {
    if (!config) return;
    await persistConfig(
      {
        ...config,
        holidays: (config.holidays || []).filter((d) => d !== dateStr),
      },
      '休日を削除して保存しました'
    );
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const numDays = daysInMonth(currentYear, currentMonth);
  const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);
  const getDayOfWeek = (day: number) => new Date(currentYear, currentMonth, day).getDay();
  const getDayName = (dow: number) => ['日', '月', '火', '水', '木', '金', '土'][dow];
  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() === currentMonth && now.getDate() === day;
  };
  const getStatus = (userId: string, day: number): AttendanceStatus => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.find(s => s.userId === userId && s.date === dateStr)?.status || '-';
  };

  const currentUnprocessed = unprocessedCounts[groupId] ?? 0;
  const otherUnprocessedTotal = groups
    .filter((g) => g.id !== groupId)
    .reduce((sum, g) => sum + (unprocessedCounts[g.id] ?? 0), 0);

  if (!config) return null;

  return (
    <Layout title={`管理者パネル（${currentGroupName}）`} onLogout={onLogout} isAdmin onNavigate={onNavigateGeneral}>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <GroupSelector
            groups={groups}
            value={groupId}
            onChange={onGroupChange}
            unprocessedCounts={unprocessedCounts}
          />
          {currentUnprocessed > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-black whitespace-nowrap">
              未消込 {currentUnprocessed}
            </span>
          )}
          {otherUnprocessedTotal > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black whitespace-nowrap">
              他グループにも未消込 {otherUnprocessedTotal}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 font-medium">
          表示・追加・履歴は、いま選んでいる「{currentGroupName}」だけが対象です。
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
        <div className="lg:w-44 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 shrink-0">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-th-list"></i>
            <span>確認・消込</span>
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-users-cog"></i>
            <span>利用者管理</span>
          </button>
          <button
            onClick={() => setActiveTab('GROUPS')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'GROUPS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-layer-group"></i>
            <span>グループ</span>
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'CONFIG' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-cog"></i>
            <span>期間・休日</span>
          </button>
          <button
            onClick={() => setActiveTab('LINKS')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'LINKS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-link"></i>
            <span>入場URL</span>
          </button>
        </div>

        <div className="flex-grow min-w-0 flex flex-col h-full overflow-hidden relative">
          {isUpdating && (
            <div className="absolute top-0 right-0 p-2 z-50">
              <i className="fas fa-sync fa-spin text-indigo-500"></i>
            </div>
          )}

          {activeTab === 'OVERVIEW' && (
            <div className="flex flex-col h-full animate-in fade-in duration-500">
              <div ref={overviewSplitRef} className="flex-1 min-h-0 flex flex-col">
              <section
                className="flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0"
                style={{
                  height: `calc((100% - ${OVERVIEW_HANDLE_PX}px) * ${overviewTopPercent / 100})`,
                  minHeight: OVERVIEW_PANEL_MIN_PX,
                  maxHeight: `calc(100% - ${OVERVIEW_HANDLE_PX + OVERVIEW_PANEL_MIN_PX}px)`,
                }}
              >
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-slate-100 shrink-0 bg-slate-50/50">
                  <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2 shrink-0 max-w-full sm:max-w-[40%]">
                    <i className="fas fa-calendar-alt text-indigo-500 shrink-0"></i>
                    <span className="truncate">{currentGroupName}・出勤予定一覧</span>
                  </h3>
                  <label className="relative flex-1 min-w-[200px] order-3 sm:order-none w-full sm:w-auto">
                    <span className="sr-only">氏名で検索</span>
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                    <input
                      type="text"
                      inputMode="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      value={nameQuery}
                      onChange={(e) => setNameQuery(e.target.value)}
                      placeholder="氏名で検索（履歴の氏名タップでも可）"
                      className="w-full pl-9 pr-9 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:font-medium placeholder:text-slate-400"
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
                  {normalizedQuery && (
                    <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap order-4 sm:order-none">
                      予定{filteredUsers.length} / 履歴{visibleHistories.length}
                    </span>
                  )}
                  <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm ml-auto shrink-0">
                    <button onClick={() => handleMonthChange(-1)} className="p-1 hover:text-indigo-600 transition"><i className="fas fa-chevron-left"></i></button>
                    <span className="font-bold text-xs min-w-[80px] text-center">{currentYear}年 {currentMonth + 1}月</span>
                    <button onClick={() => handleMonthChange(1)} className="p-1 hover:text-indigo-600 transition"><i className="fas fa-chevron-right"></i></button>
                  </div>
                </div>

                <div className="flex-grow overflow-auto relative min-h-0">
                  <table className="w-full text-xs text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-30 bg-slate-50 text-slate-500 uppercase font-bold shadow-sm">
                      <tr>
                        <th className="px-3 py-3 min-w-[120px] sticky left-0 top-0 bg-slate-50 z-40 border-r border-b border-slate-200">氏名</th>
                        {daysArray.map(day => {
                          const dow = getDayOfWeek(day);
                          const tone = getDayTone(toDateKey(currentYear, currentMonth, day), holidays);
                          return (
                            <th key={day} className={`px-1 py-2 text-center min-w-[35px] border-r border-b border-slate-200 last:border-r-0 ${dayToneHeaderClass(tone)} ${isToday(day) ? 'ring-2 ring-inset ring-indigo-400' : ''}`}>
                              <div className="text-[9px] opacity-70">{getDayName(dow)}</div>
                              <div className="font-black">{day}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition group">
                          <td className="px-3 py-3 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{user.name}</span>
                              <UserNoteButton
                                hasNote={hasUserNote(user.note)}
                                onClick={() => setNoteUser(user)}
                              />
                            </div>
                          </td>
                          {daysArray.map(day => {
                            const status = getStatus(user.id, day);
                            const tone = getDayTone(toDateKey(currentYear, currentMonth, day), holidays);
                            return (
                              <td key={day} className={`px-0 py-2 text-center border-r border-slate-100 last:border-r-0 ${dayToneCellClass(tone)}`}>
                                <div className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center border font-black text-[10px] ${STATUS_COLORS[status] || STATUS_COLORS['-']}`}>
                                  {status === '-' ? '' : status}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!isUpdating && users.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold">
                      {currentGroupName}の利用者が登録されていません
                    </div>
                  )}
                  {!isUpdating && users.length > 0 && filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold">
                      「{nameQuery.trim()}」に一致する利用者がいません
                    </div>
                  )}
                </div>
              </section>

              <div
                role="separator"
                aria-orientation="horizontal"
                aria-label="予定一覧と履歴の高さを変更"
                aria-valuemin={20}
                aria-valuemax={80}
                aria-valuenow={Math.round(overviewTopPercent)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  overviewDraggingRef.current = true;
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  updateOverviewSplitFromClientY(e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!overviewDraggingRef.current) return;
                  updateOverviewSplitFromClientY(e.clientY);
                }}
                onPointerUp={endOverviewSplitDrag}
                onPointerCancel={endOverviewSplitDrag}
                className="shrink-0 flex items-center justify-center cursor-row-resize touch-none select-none group"
                style={{ height: OVERVIEW_HANDLE_PX }}
                title="ドラッグして高さを変更"
              >
                <div className="w-14 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 group-active:bg-indigo-500 transition-colors" />
              </div>

              <section
                className="flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                style={{ flex: '1 1 0%', minHeight: OVERVIEW_PANEL_MIN_PX }}
              >
                <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100 shrink-0 bg-slate-50/50 gap-2">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2 min-w-0">
                    <i className="fas fa-history text-indigo-500 shrink-0"></i>
                    <span className="truncate">{currentGroupName}・変更履歴・消込</span>
                  </h3>
                  <label className="flex items-center space-x-2 text-[10px] text-slate-500 cursor-pointer hover:text-slate-700 transition shrink-0">
                    <input
                      type="checkbox"
                      checked={showProcessedHistory}
                      onChange={(e) => setShowProcessedHistory(e.target.checked)}
                      className="w-3 h-3 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-bold">完了分も表示</span>
                  </label>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/10">
                  {visibleHistories.map(h => (
                      <div key={h.id} className={`bg-white p-4 rounded-xl border transition shadow-sm hover:shadow-md ${h.isProcessed ? 'opacity-50 grayscale-[0.5] border-slate-100' : 'border-indigo-100 ring-1 ring-indigo-50'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest">Update</span>
                              <button
                                type="button"
                                onClick={() => setNameQuery(h.userName)}
                                className="font-black text-slate-800 text-sm hover:text-indigo-600 underline decoration-slate-200 hover:decoration-indigo-300 underline-offset-2 transition"
                                title="この氏名で予定・履歴を絞り込み"
                              >
                                {h.userName}
                              </button>
                              <span className="text-[10px] text-slate-400 font-medium">
                                <i className="far fa-clock mr-1"></i>
                                {new Date(h.createdAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-600 text-xs whitespace-pre-wrap leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                              {h.message}
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                            <input
                              type="checkbox"
                              checked={h.isProcessed}
                              onChange={(e) => handleProcessHistory(h.id, e.target.checked)}
                              className="w-8 h-8 rounded-lg text-indigo-600 border-slate-200 focus:ring-indigo-500 cursor-pointer transition-all active:scale-90 shadow-sm"
                            />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${h.isProcessed ? 'text-emerald-500' : 'text-rose-400'}`}>
                              {h.isProcessed ? '完了' : '未消込'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  {!isUpdating && histories.length === 0 && (
                    <div className="text-center py-12 text-slate-400 font-bold">
                      <i className="fas fa-clipboard-check text-3xl mb-2 opacity-20"></i>
                      <p className="text-sm">履歴はありません</p>
                    </div>
                  )}
                  {!isUpdating && histories.length > 0 && visibleHistories.length === 0 && (
                    <div className="text-center py-12 text-slate-400 font-bold">
                      <p className="text-sm">
                        {normalizedQuery
                          ? `「${nameQuery.trim()}」に一致する履歴がありません`
                          : '表示する履歴がありません'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
              </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-y-auto pr-2">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <h3 className="text-xl font-black text-slate-800">{currentGroupName}の利用者名簿</h3>
                <p className="text-xs text-slate-400 font-bold">氏名変更・並べ替え・グループ移動・削除ができます</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 shrink-0">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="追加する名前"
                  className="flex-grow px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm font-bold"
                />
                <select
                  value={newUserGroupId}
                  onChange={(e) => setNewUserGroupId(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddUser}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl transition shadow-lg shadow-indigo-200 whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <i className="fas fa-plus"></i>
                  <span>追加</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {users.map((u, index) => (
                  <div key={u.id} className="p-5 flex justify-between items-center hover:bg-slate-50/80 transition group gap-3 flex-wrap">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black border border-slate-200 shrink-0">
                        {index + 1}
                      </div>
                      <span className="font-black text-slate-700 text-lg truncate">{u.name}</span>
                      <UserNoteButton
                        hasNote={hasUserNote(u.note)}
                        alwaysShow
                        onClick={() => setNoteUser(u)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1 mr-2 border-r pr-3 border-slate-100">
                        <button
                          onClick={() => handleMoveUser(index, 'up')}
                          disabled={index === 0}
                          className={`w-10 h-10 rounded-xl transition flex items-center justify-center ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 bg-slate-50 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                          title="上に移動"
                        >
                          <i className="fas fa-arrow-up"></i>
                        </button>
                        <button
                          onClick={() => handleMoveUser(index, 'down')}
                          disabled={index === users.length - 1}
                          className={`w-10 h-10 rounded-xl transition flex items-center justify-center ${index === users.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 bg-slate-50 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                          title="下に移動"
                        >
                          <i className="fas fa-arrow-down"></i>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => openRenameUser(u)}
                        className="px-3 h-10 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                        title="氏名を変更"
                      >
                        氏名変更
                      </button>

                      <button
                        onClick={() => openMoveUser(u)}
                        disabled={!otherGroups.length}
                        className="px-3 h-10 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-100 disabled:opacity-40"
                        title="別グループへ移動"
                      >
                        グループ移動
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100"
                        title="削除"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {!isUpdating && users.length === 0 && (
                  <div className="text-center py-12 text-slate-400 font-bold">
                    登録されている利用者がいません
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'GROUPS' && (
            <GroupsPanel groups={groups} onGroupsChange={(next) => onGroupsChange(next)} />
          )}

          {activeTab === 'CONFIG' && (
            <div className="space-y-6 max-w-xl animate-in slide-in-from-right-4 duration-300 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-black text-slate-800">システム設定（全体共通）</h3>
                {configSaveNotice && (
                  <p className="text-sm font-bold text-emerald-600 animate-in fade-in duration-200">
                    <i className="fas fa-check-circle mr-1.5"></i>
                    {configSaveNotice}
                  </p>
                )}
              </div>

              <form onSubmit={handleConfigSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h4 className="text-base font-black text-slate-800">シーズン期間</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">この期間内だけ、一般ユーザーが予定を編集できます。</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-3 ml-1">シーズン開始日</label>
                    <input
                      type="date"
                      value={config.seasonStartDate}
                      onChange={(e) => setConfig({ ...config, seasonStartDate: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 font-black focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-3 ml-1">シーズン終了日</label>
                    <input
                      type="date"
                      value={config.seasonEndDate}
                      onChange={(e) => setConfig({ ...config, seasonEndDate: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 font-black focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <i className="fas fa-save"></i>
                  <span>期間設定を保存する</span>
                </button>
              </form>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h4 className="text-base font-black text-slate-800">休日設定（赤表示）</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    祝日や年末年始など、事業で休日料金になる日を登録します。日曜と同じくカレンダーで赤くなります。
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="date"
                    value={holidayDraft}
                    onChange={(e) => setHolidayDraft(e.target.value)}
                    className="flex-grow px-4 py-3 rounded-xl border-2 border-slate-100 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addHoliday}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition whitespace-nowrap"
                  >
                    追加して保存
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-100 divide-y divide-slate-50 max-h-56 overflow-y-auto">
                  {(config.holidays || []).length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 font-bold text-center">まだ休日は登録されていません</p>
                  ) : (
                    (config.holidays || []).map((dateStr) => (
                      <div key={dateStr} className="px-4 py-3 flex items-center justify-between gap-3">
                        <span className="font-black text-rose-600">{dateStr}</span>
                        <button
                          type="button"
                          onClick={() => removeHoliday(dateStr)}
                          className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                        >
                          削除
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-4">
                <i className="fas fa-info-circle text-indigo-500 text-xl pt-1"></i>
                <p className="text-sm text-indigo-900 leading-relaxed font-bold">
                  期間・休日は全グループ共通です。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'LINKS' && (
            <AccessLinksPanel currentLinkId={currentLinkId} groups={groups} />
          )}
        </div>
      </div>

      {noteUser && (
        <UserNoteModal
          userId={noteUser.id}
          userName={noteUser.name}
          groupId={groupId}
          initialNote={noteUser.note || ''}
          onClose={() => setNoteUser(null)}
          onSaved={(note) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === noteUser.id ? { ...u, note } : u))
            );
            refreshData();
          }}
        />
      )}

      {renameUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100">
            <h4 className="text-lg font-black text-slate-800">氏名を変更</h4>
            <p className="text-sm text-slate-600 font-medium">
              名簿の表示名を変更します（変更履歴には載せません）。
            </p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">新しい氏名</label>
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void confirmRenameUser();
                }}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRenameUserId(null)}
                disabled={renameBusy}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={() => void confirmRenameUser()}
                disabled={renameBusy || !renameDraft.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-40"
              >
                {renameBusy ? '変更中…' : '変更する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {moveUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100">
            <h4 className="text-lg font-black text-slate-800">グループを変更</h4>
            <p className="text-sm text-slate-600 font-medium">
              「{users.find((u) => u.id === moveUserId)?.name}」の所属グループを変更します。履歴も一緒に移動します。
            </p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">移動先</label>
              <select
                value={moveTargetId}
                onChange={(e) => setMoveTargetId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
              >
                {otherGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMoveUserId(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={confirmMoveUser}
                disabled={!moveTargetId}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-40"
              >
                移動する
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
