
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import GroupSelector from '../components/GroupSelector';
import AccessLinksPanel from '../components/AccessLinksPanel';
import GroupsPanel from '../components/GroupsPanel';
import UserNoteButton, { hasUserNote } from '../components/UserNoteButton';
import UserNoteModal from '../components/UserNoteModal';
import UsersCsvImportModal from '../components/UsersCsvImportModal';
import { db } from '../services/database';
import {
  User,
  History,
  SystemConfig,
  Schedule,
  AttendanceStatus,
  Group,
  GroupId,
  AdminGroupSelection,
  groupLabel,
  adminGroupSelectionLabel,
  isAllGroupsSelection,
  userMatchesQuery,
  normalizeEmployeeId,
  sortUsersForAllGroupsView,
} from '../types';
import { statusColorClass, LODGING_OVERNIGHT_CELL_CLASS } from '../constants';
import {
  displayScheduleGlyph,
  lodgingEdge,
  prevDateKey,
} from '../services/lodgingSchedule';
import {
  toDateKey,
  getDayTone,
  dayToneHeaderClass,
  dayToneCellClass,
  mergeHolidays,
  getSeasonDisplayPeriod,
  listDatesInSeason,
  daysInMonthWithinSeason,
  monthIntersectsSeason,
} from '../services/calendarTone';
import { exportAllAttendanceCsv } from '../services/exportAttendanceCsv';

type OverviewDayCol = {
  date: string;
  day: number;
  month: number;
  year: number;
  isMonthStart: boolean;
};

/** 管理者の日別出勤人数に含める記号（一般画面には出さない） */
const WORK_ATTENDANCE_STATUSES = new Set<AttendanceStatus>(['〇', 'AM', 'PM']);

const WORK_ATTENDANCE_BREAKDOWN_KEYS = ['〇', 'AM', 'PM'] as const;

type CountTipKind = 'work' | 'lodge';

function buildOverviewDayCols(dateKeys: string[]): OverviewDayCol[] {
  return dateKeys.map((date, i) => {
    const [y, m, d] = date.split('-').map(Number);
    const prev = i > 0 ? dateKeys[i - 1] : null;
    const prevMonth = prev ? prev.slice(0, 7) : null;
    return {
      date,
      day: d,
      month: m - 1,
      year: y,
      isMonthStart: !prev || prevMonth !== date.slice(0, 7),
    };
  });
}

function buildMonthBands(cols: OverviewDayCol[]): { key: string; label: string; span: number }[] {
  if (!cols.length) return [];
  const multiYear = cols.some((c) => c.year !== cols[0].year);
  const bands: { key: string; label: string; span: number }[] = [];
  for (const c of cols) {
    const key = `${c.year}-${c.month}`;
    const last = bands[bands.length - 1];
    if (last?.key === key) {
      last.span += 1;
      continue;
    }
    bands.push({
      key,
      label: multiYear ? `${c.year}年${c.month + 1}月` : `${c.month + 1}月`,
      span: 1,
    });
  }
  return bands;
}

const OVERVIEW_SPLIT_KEY = 'kss-admin-overview-split';
/** lg 未満用（v2: 履歴最小高を下げて予定を約2.5倍見せる） */
const OVERVIEW_SPLIT_KEY_NARROW = 'kss-admin-overview-split-narrow-v2';
/** 予定・履歴パネルそれぞれの最小高さ（px） */
const OVERVIEW_PANEL_MIN_PX = 140;
/** スマホ: 履歴はヘッダー程度だけ残し、予定側を優先 */
const OVERVIEW_PANEL_MIN_NARROW_PX = 56;
const OVERVIEW_SPLIT_DEFAULT = 50;
/** スマホ: 予定一覧をほぼ全面に（履歴は最小） */
const OVERVIEW_SPLIT_DEFAULT_NARROW = 90;
const OVERVIEW_SPLIT_MAX = 80;
const OVERVIEW_SPLIT_MAX_NARROW = 95;
const OVERVIEW_HANDLE_PX = 12;
const OVERVIEW_NARROW_MQ = '(max-width: 1023px)';

function isNarrowOverviewViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(OVERVIEW_NARROW_MQ).matches;
}

function overviewPanelMinPx(): number {
  return isNarrowOverviewViewport() ? OVERVIEW_PANEL_MIN_NARROW_PX : OVERVIEW_PANEL_MIN_PX;
}

function overviewSplitMaxPercent(): number {
  return isNarrowOverviewViewport() ? OVERVIEW_SPLIT_MAX_NARROW : OVERVIEW_SPLIT_MAX;
}

function overviewSplitStorageKey(): string {
  return isNarrowOverviewViewport() ? OVERVIEW_SPLIT_KEY_NARROW : OVERVIEW_SPLIT_KEY;
}

function readStoredSplitPercent(): number {
  const narrow = isNarrowOverviewViewport();
  const max = narrow ? OVERVIEW_SPLIT_MAX_NARROW : OVERVIEW_SPLIT_MAX;
  try {
    const raw = localStorage.getItem(
      narrow ? OVERVIEW_SPLIT_KEY_NARROW : OVERVIEW_SPLIT_KEY
    );
    const v = raw == null ? NaN : Number(raw);
    if (Number.isFinite(v) && v >= 20 && v <= max) return v;
  } catch {
    /* ignore */
  }
  return narrow ? OVERVIEW_SPLIT_DEFAULT_NARROW : OVERVIEW_SPLIT_DEFAULT;
}

type RefreshScope = {
  users?: boolean;
  histories?: boolean;
  schedules?: boolean;
  config?: boolean;
  counts?: boolean;
};

interface AdminDashboardProps {
  onLogout: () => void;
  onConfigUpdate: (next?: SystemConfig) => void | Promise<void>;
  onNavigateGeneral: () => void;
  groups: Group[];
  onGroupsChange: (groups?: Group[]) => void | Promise<void>;
  groupId: AdminGroupSelection;
  onGroupChange: (groupId: AdminGroupSelection) => void;
  currentLinkId: string;
  workspaceName?: string;
  /** bootstrapAdmin からの初回 OVERVIEW データ */
  initialData?: {
    users: User[];
    histories: History[];
    schedules: Schedule[];
    config: SystemConfig;
    year: number;
    month: number;
    unprocessedCounts: Record<string, number>;
  } | null;
  /** 一般画面から戻ったときに OVERVIEW を軽量再取得 */
  softRefreshToken?: number;
  /** 編集保存直後の差分（MainList と同様に即時反映） */
  schedulePatch?: Schedule[] | null;
  /** 編集画面で備考を保存したときの差分 */
  notePatch?: { userId: string; note: string } | null;
  syncDocumentTitle?: boolean;
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
  workspaceName,
  initialData = null,
  softRefreshToken = 0,
  schedulePatch = null,
  notePatch = null,
  syncDocumentTitle = true,
}) => {
  const hasBootData = !!initialData && initialData.year != null && initialData.month != null;

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'GROUPS' | 'CONFIG' | 'LINKS'>('OVERVIEW');
  const [users, setUsers] = useState<User[]>(() => (hasBootData ? initialData!.users : []));
  const [histories, setHistories] = useState<History[]>(() =>
    hasBootData ? initialData!.histories : []
  );
  const [schedules, setSchedules] = useState<Schedule[]>(() =>
    hasBootData ? initialData!.schedules : []
  );
  const [config, setConfig] = useState<SystemConfig | null>(() =>
    hasBootData ? initialData!.config : null
  );
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmployeeId, setNewUserEmployeeId] = useState('');
  const [newUserGroupId, setNewUserGroupId] = useState<GroupId>(() =>
    isAllGroupsSelection(groupId) ? groups[0]?.id || '' : groupId
  );
  const [showProcessedHistory, setShowProcessedHistory] = useState(false);
  /** 出勤予定一覧をシーズン全日で表示（管理者のみ） */
  const [showFullSeason, setShowFullSeason] = useState(false);
  /** 日付ヘッダークリックで1日に絞る（再クリック／全日表示で解除） */
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  /** 出勤人数／宿泊人数の説明ヒント */
  const [countTip, setCountTip] = useState<CountTipKind | null>(null);
  const countTipRef = useRef<HTMLTableSectionElement>(null);
  const [isUpdating, setIsUpdating] = useState(!hasBootData);
  const [currentMonth, setCurrentMonth] = useState(() =>
    hasBootData ? initialData!.month : new Date().getMonth()
  );
  const [currentYear, setCurrentYear] = useState(() =>
    hasBootData ? initialData!.year : new Date().getFullYear()
  );
  const [holidayDraft, setHolidayDraft] = useState('');
  const [configSaveNotice, setConfigSaveNotice] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [noteUser, setNoteUser] = useState<User | null>(null);
  const [moveUserId, setMoveUserId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editNameDraft, setEditNameDraft] = useState('');
  const [editEmployeeIdDraft, setEditEmployeeIdDraft] = useState('');
  const [editUserBusy, setEditUserBusy] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [unprocessedCounts, setUnprocessedCounts] = useState<Record<string, number>>(() =>
    hasBootData ? initialData!.unprocessedCounts || {} : {}
  );
  const [overviewTopPercent, setOverviewTopPercent] = useState(readStoredSplitPercent);
  const [loadError, setLoadError] = useState<string | null>(null);
  const overviewSplitRef = useRef<HTMLDivElement>(null);
  const overviewDraggingRef = useRef(false);
  const overviewTopPercentRef = useRef(overviewTopPercent);
  overviewTopPercentRef.current = overviewTopPercent;
  const seasonPeriodInitializedRef = useRef(hasBootData);
  const refreshSeqRef = useRef(0);
  const usersRef = useRef(users);
  usersRef.current = users;
  const configRef = useRef(config);
  configRef.current = config;
  const showFullSeasonRef = useRef(showFullSeason);
  showFullSeasonRef.current = showFullSeason;
  /** groupId|year|month|showProcessed=0 を一度だけスキップ */
  const consumedInitialKeyRef = useRef<string | null>(
    hasBootData ? `${groupId}|${initialData!.year}|${initialData!.month}|0` : null
  );
  const skipCountsOnMountRef = useRef(hasBootData);
  const refreshDepsRef = useRef({
    groupId,
    year: hasBootData ? initialData!.year : currentYear,
    month: hasBootData ? initialData!.month : currentMonth,
    showProcessed: false,
    showFullSeason: false,
  });
  const softRefreshSeenRef = useRef(softRefreshToken);
  const overviewTabSoftRefreshSkipRef = useRef(true);
  const [linksEverOpened, setLinksEverOpened] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const isAllMode = isAllGroupsSelection(groupId);
  const currentGroupName = adminGroupSelectionLabel(groups, groupId);
  const otherGroups = isAllMode ? groups : groups.filter((g) => g.id !== groupId);
  const lodgingGroupIds = useMemo(
    () => new Set(groups.filter((g) => g.hasLodgingStatuses).map((g) => g.id)),
    [groups]
  );
  const showLodgingCountRow = isAllMode
    ? lodgingGroupIds.size > 0
    : lodgingGroupIds.has(groupId);
  /** 寮グループ単独表示のみ。全員表示では宿泊の背景色は付けない */
  const showLodgingOvernightHighlight = !isAllMode && lodgingGroupIds.has(groupId);
  const holidays = config?.holidays || [];
  const showEmployeeId = config?.showEmployeeId !== false;
  const normalizedQuery = nameQuery.trim().toLocaleLowerCase('ja');

  const updateOverviewSplitFromClientY = (clientY: number) => {
    const el = overviewSplitRef.current;
    if (!el) return;
    const panelMin = overviewPanelMinPx();
    const rect = el.getBoundingClientRect();
    const available = rect.height - OVERVIEW_HANDLE_PX;
    if (available <= panelMin * 2) return;
    let topPx = clientY - rect.top - OVERVIEW_HANDLE_PX / 2;
    topPx = Math.max(panelMin, Math.min(available - panelMin, topPx));
    setOverviewTopPercent((topPx / available) * 100);
  };

  const endOverviewSplitDrag = () => {
    if (!overviewDraggingRef.current) return;
    overviewDraggingRef.current = false;
    try {
      localStorage.setItem(
        overviewSplitStorageKey(),
        String(Math.round(overviewTopPercentRef.current * 10) / 10)
      );
    } catch {
      /* ignore */
    }
  };

  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) return users;
    return users.filter((u) =>
      userMatchesQuery(u, nameQuery, { matchEmployeeId: showEmployeeId })
    );
  }, [users, normalizedQuery, nameQuery, showEmployeeId]);

  const matchingUserIds = useMemo(() => {
    if (!normalizedQuery) return null;
    return new Set(filteredUsers.map((u) => u.id));
  }, [filteredUsers, normalizedQuery]);

  const visibleHistories = useMemo(() => {
    const base = showProcessedHistory
      ? histories
      : histories.filter((h) => !h.isProcessed);
    if (!normalizedQuery || !matchingUserIds) return base;
    return base.filter(
      (h) =>
        matchingUserIds.has(h.userId) ||
        h.userName.toLocaleLowerCase('ja').includes(normalizedQuery)
    );
  }, [histories, showProcessedHistory, normalizedQuery, matchingUserIds]);

  useEffect(() => {
    if (!isAllGroupsSelection(groupId)) {
      setNewUserGroupId(groupId);
    } else if (groups[0]) {
      setNewUserGroupId(groups[0].id);
    }
    setNameQuery('');
    setNoteUser(null);
    setEditUserId(null);
    setMoveUserId(null);
  }, [groupId]);

  useEffect(() => {
    if (isAllGroupsSelection(groupId) && groups[0] && !groups.some((g) => g.id === newUserGroupId)) {
      setNewUserGroupId(groups[0].id);
    }
  }, [groups, groupId, newUserGroupId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(OVERVIEW_NARROW_MQ);
    const apply = () => setOverviewTopPercent(readStoredSplitPercent());
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const refreshUnprocessedCounts = async () => {
    try {
      setUnprocessedCounts(await db.getUnprocessedHistoryCounts());
    } catch (err) {
      console.error(err);
    }
  };

  const refreshData = async (
    year = currentYear,
    month = currentMonth,
    scope: RefreshScope = {}
  ) => {
    const want = {
      users: scope.users !== false,
      histories: scope.histories !== false,
      schedules: scope.schedules !== false,
      config: scope.config !== false,
      counts: scope.counts !== false,
    };
    const seq = ++refreshSeqRef.current;
    setIsUpdating(true);
    setLoadError(null);
    try {
      const allGroups = isAllGroupsSelection(groupId);
      let groupUsers = usersRef.current;
      if (want.users) {
        groupUsers = await db.getUsers(allGroups ? undefined : groupId, {
          allGroups,
        });
        if (allGroups) groupUsers = sortUsersForAllGroupsView(groupUsers);
        if (seq !== refreshSeqRef.current) return;
        setUsers(groupUsers);
      }

      const parallel: Promise<void>[] = [];
      if (want.histories) {
        if (allGroups) {
          setHistories([]);
        } else {
          parallel.push(
            db.getHistories(groupId, { includeProcessed: showProcessedHistory }).then((h) => {
              if (seq !== refreshSeqRef.current) return;
              setHistories(h);
            })
          );
        }
      }
      if (want.schedules) {
        const ids = groupUsers.map((u) => u.id);
        const cfg = configRef.current;
        const seasonStart = cfg?.seasonStartDate;
        const seasonEnd = cfg?.seasonEndDate;
        const useSeasonRange =
          showFullSeasonRef.current &&
          !!seasonStart &&
          !!seasonEnd &&
          seasonStart <= seasonEnd;
        parallel.push(
          (ids.length
            ? useSeasonRange
              ? db.getSchedulesForRange(
                  ids,
                  seasonStart!,
                  seasonEnd!,
                  allGroups ? undefined : groupId,
                  { allGroups }
                )
              : db.getSchedulesForMonth(ids, year, month, allGroups ? undefined : groupId, {
                  allGroups,
                })
            : Promise.resolve([] as Schedule[])
          ).then((s) => {
            if (seq !== refreshSeqRef.current) return;
            setSchedules(s);
          })
        );
      }
      if (want.config) {
        parallel.push(
          db.getConfig().then((c) => {
            if (seq !== refreshSeqRef.current) return;
            setConfig(c);
            if (!seasonPeriodInitializedRef.current && c?.seasonStartDate && c?.seasonEndDate) {
              seasonPeriodInitializedRef.current = true;
              const period = getSeasonDisplayPeriod(c.seasonStartDate, c.seasonEndDate);
              if (period.month !== month || period.year !== year) {
                setCurrentMonth(period.month);
                setCurrentYear(period.year);
              }
            }
          })
        );
      }
      if (parallel.length) await Promise.all(parallel);
      if (seq !== refreshSeqRef.current) return;
      if (want.counts) void refreshUnprocessedCounts();
    } catch (err) {
      console.error(err);
      if (seq !== refreshSeqRef.current) return;
      setLoadError('データの読み込みに失敗しました。再読み込みしてください。');
    } finally {
      if (seq === refreshSeqRef.current) setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'LINKS') setLinksEverOpened(true);
  }, [activeTab]);

  useEffect(() => {
    const key = `${groupId}|${currentYear}|${currentMonth}|${showProcessedHistory ? 1 : 0}`;
    if (consumedInitialKeyRef.current === key) {
      consumedInitialKeyRef.current = null;
      refreshDepsRef.current = {
        groupId,
        year: currentYear,
        month: currentMonth,
        showProcessed: showProcessedHistory,
        showFullSeason,
      };
      setIsUpdating(false);
      return;
    }

    const prev = refreshDepsRef.current;
    const groupChanged = prev.groupId !== groupId;
    const monthChanged = prev.year !== currentYear || prev.month !== currentMonth;
    const histToggle = prev.showProcessed !== showProcessedHistory;
    const seasonToggle = prev.showFullSeason !== showFullSeason;
    refreshDepsRef.current = {
      groupId,
      year: currentYear,
      month: currentMonth,
      showProcessed: showProcessedHistory,
      showFullSeason,
    };

    if (groupChanged) {
      void refreshData(currentYear, currentMonth, { config: false });
    } else if (histToggle && !monthChanged && !seasonToggle) {
      void refreshData(currentYear, currentMonth, {
        users: false,
        schedules: false,
        config: false,
        counts: false,
        histories: true,
      });
    } else if ((seasonToggle || (monthChanged && !showFullSeason)) && !histToggle) {
      void refreshData(currentYear, currentMonth, {
        users: false,
        histories: false,
        config: false,
        counts: false,
        schedules: true,
      });
    } else {
      void refreshData(currentYear, currentMonth);
    }
  }, [groupId, showProcessedHistory, currentYear, currentMonth, showFullSeason]);

  useEffect(() => {
    if (skipCountsOnMountRef.current) {
      skipCountsOnMountRef.current = false;
      return;
    }
    void refreshUnprocessedCounts();
  }, [groups]);

  useEffect(() => {
    if (softRefreshToken === softRefreshSeenRef.current) return;
    softRefreshSeenRef.current = softRefreshToken;
    if (softRefreshToken === 0) return;
    void refreshData(currentYear, currentMonth, { config: false });
  }, [softRefreshToken]);

  useEffect(() => {
    if (!schedulePatch || schedulePatch.length === 0) return;
    setSchedules((prev) => {
      const map = new Map<string, Schedule>();
      for (const s of prev) {
        map.set(`${s.userId}|${s.date}`, s);
      }
      for (const row of schedulePatch) {
        const key = `${row.userId}|${row.date}`;
        if (row.status === '-' && !row.lodgingOvernight) {
          map.delete(key);
        } else {
          map.set(key, row);
        }
      }
      return Array.from(map.values());
    });
  }, [schedulePatch]);

  useEffect(() => {
    if (!notePatch) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === notePatch.userId ? { ...u, note: notePatch.note } : u))
    );
  }, [notePatch]);

  useEffect(() => {
    if (activeTab !== 'OVERVIEW') return;
    if (overviewTabSoftRefreshSkipRef.current) {
      overviewTabSoftRefreshSkipRef.current = false;
      return;
    }
    void refreshData(currentYear, currentMonth, { config: false });
  }, [activeTab]);

  useEffect(() => {
    if (!syncDocumentTitle) return;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshData(currentYear, currentMonth, { config: false });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [syncDocumentTitle, currentYear, currentMonth, groupId]);

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    const name = newUserName.trim();
    const employeeId = normalizeEmployeeId(newUserEmployeeId);
    const targetGroupId = newUserGroupId || groupId;
    try {
      await db.saveUser({ id: '', name, employeeId, groupId: targetGroupId });
      setNewUserName('');
      setNewUserEmployeeId('');
      if (targetGroupId !== groupId) {
        onGroupChange(targetGroupId);
      } else {
        void refreshData(currentYear, currentMonth, { config: false });
      }
      alert(`${groupLabel(groups, targetGroupId)}に「${name}」を追加しました。`);
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || '').includes('DUPLICATE_EMPLOYEE_ID')) {
        alert('同じユーザIDの利用者がすでにいます。');
      } else {
        alert('追加に失敗しました。');
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('この利用者を削除してもよろしいですか？（出勤予定も削除されます）')) {
      await db.deleteUser(id);
      void refreshData(currentYear, currentMonth, { config: false });
      alert('利用者を削除しました。');
    }
  };

  const openEditUser = (user: User) => {
    setEditUserId(user.id);
    setEditNameDraft(user.name);
    setEditEmployeeIdDraft(user.employeeId || '');
  };

  const confirmEditUser = async () => {
    const user = users.find((u) => u.id === editUserId);
    if (!user || editUserBusy) return;
    const name = editNameDraft.trim();
    const employeeId = normalizeEmployeeId(editEmployeeIdDraft);
    if (!name) {
      alert('氏名を入力してください。');
      return;
    }
    if (name === user.name && employeeId === normalizeEmployeeId(user.employeeId)) {
      setEditUserId(null);
      return;
    }
    setEditUserBusy(true);
    try {
      await db.saveUser({ id: user.id, name, employeeId, groupId: user.groupId });
      setEditUserId(null);
      await refreshData(currentYear, currentMonth, { config: false });
      alert('利用者情報を更新しました。');
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || '').includes('DUPLICATE_EMPLOYEE_ID')) {
        alert('同じユーザIDの利用者がすでにいます。');
      } else {
        alert('更新に失敗しました。sandbox のデプロイ完了後にもう一度お試しください。');
      }
    } finally {
      setEditUserBusy(false);
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
    void refreshData(currentYear, currentMonth, { config: false });
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
    if (config.seasonStartDate > config.seasonEndDate) {
      alert('シーズン開始日は終了日以前にしてください。');
      return;
    }
    await persistConfig(config, '期間・表示設定を保存しました');
  };

  const showConfigSaved = (message: string) => {
    setConfigSaveNotice(message);
    window.setTimeout(() => {
      setConfigSaveNotice((current) => (current === message ? null : current));
    }, 2500);
  };

  const persistConfig = async (next: SystemConfig, successMessage?: string) => {
    setConfig(next);
    configRef.current = next;
    try {
      const saved = await db.saveConfig({
        ...next,
        holidays: next.holidays || [],
      });
      setConfig(saved);
      await onConfigUpdate(saved);
      if (successMessage) showConfigSaved(successMessage);
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。通信状況を確認してもう一度お試しください。');
      await refreshData(currentYear, currentMonth, {
        users: false,
        histories: false,
        schedules: false,
        counts: false,
        config: true,
      });
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

  const handleExportCsv = async () => {
    if (!config || exportBusy) return;
    setExportBusy(true);
    setExportNotice(null);
    try {
      const result = await exportAllAttendanceCsv({
        groups,
        seasonStartDate: config.seasonStartDate,
        seasonEndDate: config.seasonEndDate,
      });
      const message = `${result.filename} をダウンロードしました（${result.userCount}人・${result.dateCount}日）`;
      setExportNotice(message);
      window.setTimeout(() => {
        setExportNotice((current) => (current === message ? null : current));
      }, 4000);
    } catch (err: any) {
      console.error(err);
      const msg = String(err?.message || '');
      if (msg.includes('EMPTY_SEASON')) {
        alert('シーズン開始日・終了日が正しく設定されていません。期間を確認してください。');
      } else if (msg.includes('EXPORT_SCHEDULES_FAILED') || msg.includes('EXPORT_SCHEDULES_INVALID')) {
        alert('出勤データの取得に失敗したため、CSVは出力しませんでした。もう一度お試しください。');
      } else {
        alert('CSVのエクスポートに失敗しました。通信状況を確認してもう一度お試しください。');
      }
    } finally {
      setExportBusy(false);
    }
  };

  const getDayName = (dow: number) => ['日', '月', '火', '水', '木', '金', '土'][dow];
  const seasonStart = config?.seasonStartDate || '';
  const seasonEnd = config?.seasonEndDate || '';
  const canShowFullSeason = !!seasonStart && !!seasonEnd && seasonStart <= seasonEnd;

  const canGoPrevMonth =
    !!seasonStart &&
    !!seasonEnd &&
    monthIntersectsSeason(
      currentMonth === 0 ? currentYear - 1 : currentYear,
      currentMonth === 0 ? 11 : currentMonth - 1,
      seasonStart,
      seasonEnd
    );
  const canGoNextMonth =
    !!seasonStart &&
    !!seasonEnd &&
    monthIntersectsSeason(
      currentMonth === 11 ? currentYear + 1 : currentYear,
      currentMonth === 11 ? 0 : currentMonth + 1,
      seasonStart,
      seasonEnd
    );

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth + offset, 1);
    const y = newDate.getFullYear();
    const m = newDate.getMonth();
    if (
      seasonStart &&
      seasonEnd &&
      !monthIntersectsSeason(y, m, seasonStart, seasonEnd)
    ) {
      return;
    }
    setCurrentYear(y);
    setCurrentMonth(m);
  };

  const overviewDayCols = useMemo((): OverviewDayCol[] => {
    if (showFullSeason && canShowFullSeason) {
      return buildOverviewDayCols(listDatesInSeason(seasonStart, seasonEnd));
    }
    // 一般画面と同様、シーズン期間外の日付は列に出さない
    const days = daysInMonthWithinSeason(
      currentYear,
      currentMonth,
      seasonStart || '0000-01-01',
      seasonEnd || '9999-12-31'
    );
    const keys = days.map((day) => toDateKey(currentYear, currentMonth, day));
    return buildOverviewDayCols(keys);
  }, [
    showFullSeason,
    canShowFullSeason,
    seasonStart,
    seasonEnd,
    currentYear,
    currentMonth,
  ]);

  // 月送り・全期間切替・グループ変更・期間変更では日付絞り込みを解除
  useEffect(() => {
    setFocusedDate(null);
    setCountTip(null);
  }, [currentYear, currentMonth, showFullSeason, groupId, seasonStart, seasonEnd]);

  // 期間トリムでフォーカス日が列から消えたら解除（全日表示ボタンの取り残し防止）
  useEffect(() => {
    if (!focusedDate) return;
    if (!overviewDayCols.some((c) => c.date === focusedDate)) {
      setFocusedDate(null);
    }
  }, [overviewDayCols, focusedDate]);

  useEffect(() => {
    if (!countTip) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = countTipRef.current;
      if (root && !root.contains(e.target as Node)) setCountTip(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [countTip]);

  const visibleDayCols = useMemo((): OverviewDayCol[] => {
    if (!focusedDate) return overviewDayCols;
    return overviewDayCols.filter((c) => c.date === focusedDate);
  }, [overviewDayCols, focusedDate]);

  const monthBands = useMemo(
    () => (showFullSeason && !focusedDate ? buildMonthBands(visibleDayCols) : []),
    [showFullSeason, focusedDate, visibleDayCols]
  );

  const toggleFocusDate = (date: string) => {
    setFocusedDate((prev) => (prev === date ? null : date));
  };

  const statusByUserDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const s of schedules) {
      map.set(`${s.userId}|${s.date}`, (s.status as AttendanceStatus) || '-');
    }
    return map;
  }, [schedules]);

  const lodgingByUserDate = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const s of schedules) {
      map.set(`${s.userId}|${s.date}`, !!s.lodgingOvernight);
    }
    return map;
  }, [schedules]);

  /** 画面に出ている人・日付だけ数える（検索／日付絞り込み後）。全員表示も合算 */
  const dayAttendanceCounts = useMemo(() => {
    const totals = new Map<string, number>();
    const parts = new Map<string, Record<(typeof WORK_ATTENDANCE_BREAKDOWN_KEYS)[number], number>>();
    for (const col of visibleDayCols) {
      totals.set(col.date, 0);
      parts.set(col.date, { '〇': 0, AM: 0, PM: 0 });
    }
    for (const user of filteredUsers) {
      for (const col of visibleDayCols) {
        const st = statusByUserDate.get(`${user.id}|${col.date}`) || '-';
        if (!WORK_ATTENDANCE_STATUSES.has(st)) continue;
        totals.set(col.date, (totals.get(col.date) || 0) + 1);
        const bucket = parts.get(col.date);
        if (bucket && st in bucket) {
          bucket[st as (typeof WORK_ATTENDANCE_BREAKDOWN_KEYS)[number]] += 1;
        }
      }
    }
    return { totals, parts };
  }, [filteredUsers, visibleDayCols, statusByUserDate]);

  /** 寮グループの人だけ。その日の宿泊チェックONを数える（入寮日含む／退寮日はOFF） */
  const dayLodgingCounts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const col of visibleDayCols) {
      totals.set(col.date, 0);
    }
    if (!showLodgingCountRow) return { totals };
    for (const user of filteredUsers) {
      if (!lodgingGroupIds.has(user.groupId)) continue;
      for (const col of visibleDayCols) {
        if (!lodgingByUserDate.get(`${user.id}|${col.date}`)) continue;
        totals.set(col.date, (totals.get(col.date) || 0) + 1);
      }
    }
    return { totals };
  }, [
    filteredUsers,
    visibleDayCols,
    lodgingByUserDate,
    showLodgingCountRow,
    lodgingGroupIds,
  ]);

  const todayKey = useMemo(() => {
    const now = new Date();
    return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const getStatus = (userId: string, date: string): AttendanceStatus =>
    statusByUserDate.get(`${userId}|${date}`) || '-';

  const allUnprocessedTotal = groups.reduce(
    (sum, g) => sum + (unprocessedCounts[g.id] ?? 0),
    0
  );
  const currentUnprocessed = isAllMode ? 0 : unprocessedCounts[groupId] ?? 0;
  const otherUnprocessedTotal = isAllMode
    ? allUnprocessedTotal
    : groups
        .filter((g) => g.id !== groupId)
        .reduce((sum, g) => sum + (unprocessedCounts[g.id] ?? 0), 0);

  if (loadError && !config) {
    return (
      <Layout
        title="管理者パネル"
        onLogout={onLogout}
        syncDocumentTitle={syncDocumentTitle}
        showAdminManualLink
      >
        <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-3xl border border-rose-100 text-center shadow-sm">
          <i className="fas fa-exclamation-triangle text-4xl text-rose-500 mb-4"></i>
          <p className="text-slate-700 font-bold mb-6">{loadError}</p>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-slate-900"
          >
            再試行
          </button>
        </div>
      </Layout>
    );
  }

  if (!config) return null;

  return (
    <Layout
      title={`管理者パネル${workspaceName ? `・${workspaceName}` : ''}（${currentGroupName}）`}
      onLogout={onLogout}
      isAdmin
      navTarget="MAIN"
      onNavigate={onNavigateGeneral}
      syncDocumentTitle={syncDocumentTitle}
      showAdminManualLink
    >
      {loadError && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-black"
          >
            再試行
          </button>
        </div>
      )}
      <div className="mb-2 sm:mb-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <GroupSelector
            groups={groups}
            value={groupId}
            onChange={onGroupChange}
            allowAll
            unprocessedCounts={unprocessedCounts}
            className="[&_select]:py-1.5 [&_select]:text-xs sm:[&_select]:text-sm"
          />
          {!isAllMode && currentUnprocessed > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-black whitespace-nowrap">
              未消込 {currentUnprocessed}
            </span>
          )}
          {otherUnprocessedTotal > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-black whitespace-nowrap">
              {isAllMode
                ? `未消込 合計 ${otherUnprocessedTotal}`
                : `他グループにも未消込 ${otherUnprocessedTotal}`}
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug">
          {isAllMode
            ? '全員表示です。グループ名を押すとそのグループに切り替わり、履歴・消込が使えます。'
            : `表示・追加・履歴は、いま選んでいる「${currentGroupName}」だけが対象です。`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 h-[calc(100vh-148px)]">
        <div className="lg:w-44 flex flex-row lg:flex-col gap-1.5 sm:gap-2 overflow-x-auto pb-2 lg:pb-0 shrink-0 lg:h-full">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition text-sm ${activeTab === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-th-list"></i>
            <span>確認・消込</span>
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition text-sm ${activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-users-cog"></i>
            <span>利用者管理</span>
          </button>
          <button
            onClick={() => setActiveTab('GROUPS')}
            className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition text-sm ${activeTab === 'GROUPS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-layer-group"></i>
            <span>グループ</span>
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition text-sm ${activeTab === 'CONFIG' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-cog"></i>
            <span>期間・休日</span>
          </button>
          <button
            onClick={() => setActiveTab('LINKS')}
            className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition text-sm ${activeTab === 'LINKS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-link"></i>
            <span>入場URL</span>
          </button>
          <div className="flex-1 lg:flex-none lg:mt-auto flex flex-col gap-1.5 min-w-[8.5rem]">
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exportBusy || !config}
              title="全グループの出勤予定をCSVでダウンロード"
              className="w-full px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-400 shadow-md"
            >
              {exportBusy ? (
                <i className="fas fa-sync fa-spin"></i>
              ) : (
                <i className="fas fa-file-csv"></i>
              )}
              <span className="text-left leading-tight">
                {exportBusy ? '作成中…' : 'CSV出力'}
              </span>
            </button>
            {exportNotice && (
              <p className="hidden lg:block text-[10px] font-bold text-emerald-600 leading-snug px-1">
                {exportNotice}
              </p>
            )}
          </div>
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
                  minHeight: overviewPanelMinPx(),
                  maxHeight: `calc(100% - ${OVERVIEW_HANDLE_PX + overviewPanelMinPx()}px)`,
                }}
              >
                <div className="px-3 sm:px-4 py-2 sm:py-2 flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-slate-100 shrink-0 bg-slate-50/50">
                  <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2 shrink-0 max-w-full sm:max-w-[40%]">
                    <i className="fas fa-calendar-alt text-indigo-500 shrink-0"></i>
                    <span className="truncate">{currentGroupName}・出勤予定一覧</span>
                  </h3>
                  <label className="relative flex-1 min-w-[200px] order-3 sm:order-none w-full sm:w-auto">
                    <span className="sr-only">{showEmployeeId ? '氏名・ユーザIDで検索' : '氏名で検索'}</span>
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                    <input
                      type="text"
                      inputMode="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      value={nameQuery}
                      onChange={(e) => setNameQuery(e.target.value)}
                      placeholder={showEmployeeId ? '氏名・ユーザIDで検索（履歴タップ可）' : '氏名で検索（履歴タップ可）'}
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
                  <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap justify-end">
                    {focusedDate && (
                      <button
                        type="button"
                        onClick={() => setFocusedDate(null)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-800 shadow-sm hover:bg-indigo-100 transition"
                        title="日付の絞り込みを解除して全日を表示"
                      >
                        全日表示
                      </button>
                    )}
                    <label
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold shadow-sm ${
                        canShowFullSeason
                          ? 'cursor-pointer border-slate-200 bg-white text-slate-700'
                          : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                      }`}
                      title={
                        canShowFullSeason
                          ? 'シーズン開始〜終了の全日を横に並べて表示します'
                          : '期間が設定されていません'
                      }
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                        checked={showFullSeason && canShowFullSeason}
                        disabled={!canShowFullSeason}
                        onChange={(e) => setShowFullSeason(e.target.checked)}
                      />
                      全期間を表示
                    </label>
                    {showFullSeason && canShowFullSeason ? (
                      <div className="bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shadow-sm">
                        <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                          {seasonStart.replace(/-/g, '/')}〜{seasonEnd.replace(/-/g, '/')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleMonthChange(-1)}
                          disabled={!canGoPrevMonth}
                          className={`p-1 transition ${
                            canGoPrevMonth
                              ? 'hover:text-indigo-600'
                              : 'cursor-not-allowed opacity-40'
                          }`}
                          aria-label="前月"
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        <span className="font-bold text-xs min-w-[80px] text-center">
                          {currentYear}年 {currentMonth + 1}月
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMonthChange(1)}
                          disabled={!canGoNextMonth}
                          className={`p-1 transition ${
                            canGoNextMonth
                              ? 'hover:text-indigo-600'
                              : 'cursor-not-allowed opacity-40'
                          }`}
                          aria-label="翌月"
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-grow overflow-auto relative min-h-0">
                  <table
                    className={`text-xs text-left border-separate border-spacing-0 ${
                      focusedDate ? 'w-max max-w-none' : 'w-full'
                    }`}
                  >
                    <thead
                      ref={countTipRef}
                      className="sticky top-0 z-30 bg-slate-50 text-slate-500 font-bold shadow-sm"
                    >
                      {showFullSeason && monthBands.length > 0 && (
                        <tr>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 min-w-[140px] sticky left-0 top-0 bg-slate-50 z-40 border-r border-b border-slate-200 align-middle"
                          >
                            {showEmployeeId ? 'ユーザID / 氏名' : '氏名'}
                          </th>
                          {isAllMode && (
                            <th
                              rowSpan={2}
                              className="px-2 py-2 min-w-[72px] sticky top-0 bg-slate-50 z-30 border-r border-b border-slate-200 align-middle"
                            >
                              グループ
                            </th>
                          )}
                          {monthBands.map((band) => (
                            <th
                              key={band.key}
                              colSpan={band.span}
                              className="px-1 py-1.5 text-center border-r border-b border-slate-200 bg-slate-100 text-[10px] font-black tracking-wide text-slate-600 last:border-r-0"
                            >
                              {band.label}
                            </th>
                          ))}
                        </tr>
                      )}
                      <tr>
                        {!(showFullSeason && monthBands.length > 0) && (
                          <>
                            <th className="px-2 max-lg:py-1.5 lg:px-3 lg:py-3 min-w-[140px] sticky left-0 top-0 bg-slate-50 z-40 border-r border-b border-slate-200">
                              {showEmployeeId ? 'ユーザID / 氏名' : '氏名'}
                            </th>
                            {isAllMode && (
                              <th className="px-2 max-lg:py-1.5 lg:py-3 min-w-[72px] sticky top-0 bg-slate-50 z-30 border-r border-b border-slate-200">
                                グループ
                              </th>
                            )}
                          </>
                        )}
                        {visibleDayCols.map((col) => {
                          const dow = new Date(`${col.date}T00:00:00`).getDay();
                          const tone = getDayTone(col.date, holidays);
                          const isTodayCol = col.date === todayKey;
                          const isFocused = focusedDate === col.date;
                          return (
                            <th
                              key={col.date}
                              scope="col"
                              className={`px-0.5 py-1 text-center min-w-[35px] border-r border-b border-slate-200 last:border-r-0 ${dayToneHeaderClass(tone)} ${
                                isFocused || isTodayCol ? 'ring-2 ring-inset ring-indigo-400' : ''
                              } ${col.isMonthStart && showFullSeason && !focusedDate ? 'border-l-2 border-l-slate-300' : ''}`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleFocusDate(col.date)}
                                className="w-full rounded-md px-0.5 py-1 hover:bg-white/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                title={
                                  isFocused
                                    ? 'もう一度押すと全日表示に戻ります'
                                    : 'この日だけ表示（氏名の横で確認しやすくなります）'
                                }
                                aria-pressed={isFocused}
                              >
                                <div className="text-[9px] opacity-70 font-bold normal-case">
                                  {getDayName(dow)}
                                </div>
                                <div className="font-black">{col.day}</div>
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        <th className="px-3 py-1.5 sticky left-0 top-0 bg-slate-50 z-40 border-r border-b border-slate-200 text-left align-middle relative">
                          <button
                            type="button"
                            onClick={() =>
                              setCountTip((t) => (t === 'work' ? null : 'work'))
                            }
                            className="inline-flex items-center gap-1 rounded-md px-0.5 py-0.5 text-left hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            aria-expanded={countTip === 'work'}
                            title="カウント対象の説明"
                          >
                            <span className="block text-[10px] font-black text-slate-700 leading-tight">
                              出勤人数
                            </span>
                            <i className="fas fa-info-circle text-[9px] text-slate-400" aria-hidden />
                          </button>
                          {countTip === 'work' && (
                            <div
                              role="tooltip"
                              className="absolute left-0 top-full z-[60] mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg"
                            >
                              <p className="text-[11px] font-black text-slate-800">出勤人数のカウント</p>
                              <p className="mt-1.5 text-[10px] font-bold leading-relaxed text-slate-600">
                                含める: 〇 / AM / PM
                              </p>
                              <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500">
                                含めない: × / △ / 未入力。宿泊チェックは見ません。
                              </p>
                            </div>
                          )}
                        </th>
                        {isAllMode && (
                          <th className="px-2 py-1.5 sticky top-0 bg-slate-50 z-30 border-r border-b border-slate-200" />
                        )}
                        {visibleDayCols.map((col) => {
                          const n = dayAttendanceCounts.totals.get(col.date) || 0;
                          const part = dayAttendanceCounts.parts.get(col.date);
                          const tip = part
                            ? WORK_ATTENDANCE_BREAKDOWN_KEYS.map((k) => `${k}:${part[k]}`).join(' ')
                            : '';
                          const tone = getDayTone(col.date, holidays);
                          return (
                            <th
                              key={`count-${col.date}`}
                              title={tip}
                              className={`px-0.5 py-1.5 text-center border-r border-b border-slate-200 last:border-r-0 ${dayToneHeaderClass(tone)} ${
                                col.isMonthStart && showFullSeason && !focusedDate ? 'border-l-2 border-l-slate-300' : ''
                              }`}
                            >
                              <span
                                className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-0.5 text-[11px] font-black tabular-nums ${
                                  n > 0 ? 'text-slate-800' : 'text-slate-400/50'
                                }`}
                              >
                                {n}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                      {showLodgingCountRow && (
                        <tr>
                          <th className="px-3 py-1.5 sticky left-0 top-0 bg-slate-50 z-40 border-r border-b border-slate-200 text-left align-middle relative">
                            <button
                              type="button"
                              onClick={() =>
                                setCountTip((t) => (t === 'lodge' ? null : 'lodge'))
                              }
                              className="inline-flex items-center gap-1 rounded-md px-0.5 py-0.5 text-left hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                              aria-expanded={countTip === 'lodge'}
                              title="カウント対象の説明"
                            >
                              <span className="block text-[10px] font-black text-slate-700 leading-tight">
                                宿泊人数
                              </span>
                              <i className="fas fa-info-circle text-[9px] text-slate-400" aria-hidden />
                            </button>
                            {countTip === 'lodge' && (
                              <div
                                role="tooltip"
                                className="absolute left-0 top-full z-[60] mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg"
                              >
                                <p className="text-[11px] font-black text-slate-800">宿泊人数のカウント</p>
                                <p className="mt-1.5 text-[10px] font-bold leading-relaxed text-slate-600">
                                  含める: その日の「宿泊」チェックがONの人（入寮日含む）
                                </p>
                                <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500">
                                  退寮日はチェックOFFのため含めません。出勤記号は見ません。
                                </p>
                                <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500">
                                  寮用記号ありのグループの人だけ数えます（「全員」でも同様）。
                                </p>
                              </div>
                            )}
                          </th>
                          {isAllMode && (
                            <th className="px-2 py-1.5 sticky top-0 bg-slate-50 z-30 border-r border-b border-slate-200" />
                          )}
                          {visibleDayCols.map((col) => {
                            const n = dayLodgingCounts.totals.get(col.date) || 0;
                            const tone = getDayTone(col.date, holidays);
                            return (
                              <th
                                key={`lodge-${col.date}`}
                                title={n > 0 ? `宿泊 ${n}人` : '宿泊 0人'}
                                className={`px-0.5 py-1.5 text-center border-r border-b border-slate-200 last:border-r-0 ${dayToneHeaderClass(tone)} ${
                                  col.isMonthStart && showFullSeason && !focusedDate
                                    ? 'border-l-2 border-l-slate-300'
                                    : ''
                                }`}
                              >
                                <span
                                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-0.5 text-[11px] font-black tabular-nums ${
                                    n > 0 ? 'text-slate-800' : 'text-slate-400/50'
                                  }`}
                                >
                                  {n}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition group">
                          <td className="px-2 max-lg:py-1 lg:px-3 lg:py-3 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="min-w-0">
                                {showEmployeeId && user.employeeId ? (
                                  <div className="text-[10px] font-bold text-slate-400 truncate leading-tight">
                                    {user.employeeId}
                                  </div>
                                ) : null}
                                <div className="truncate text-sm lg:text-base leading-tight">{user.name}</div>
                              </div>
                              <UserNoteButton
                                hasNote={hasUserNote(user.note)}
                                onClick={() => setNoteUser(user)}
                              />
                            </div>
                          </td>
                          {isAllMode && (
                            <td className="px-2 max-lg:py-1 lg:py-3 border-r border-slate-100 align-middle">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onGroupChange(user.groupId);
                                }}
                                className="max-w-[7rem] truncate text-left text-[11px] font-black text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-900"
                                title={`${groupLabel(groups, user.groupId)}に切り替える`}
                              >
                                {groupLabel(groups, user.groupId)}
                              </button>
                            </td>
                          )}
                          {visibleDayCols.map((col) => {
                            const status = getStatus(user.id, col.date);
                            const overnight = !!lodgingByUserDate.get(`${user.id}|${col.date}`);
                            /** 寮グループ単独のみ in/out 導出。全員表示は出勤記号のみ */
                            const showLodgingGlyphs = showLodgingOvernightHighlight;
                            const prevKey = prevDateKey(col.date);
                            const prevOvernight = prevKey
                              ? !!lodgingByUserDate.get(`${user.id}|${prevKey}`)
                              : false;
                            const edge = showLodgingGlyphs
                              ? lodgingEdge(overnight, prevOvernight)
                              : 'none';
                            const glyph = showLodgingGlyphs
                              ? displayScheduleGlyph(status, edge)
                              : status === '-'
                                ? ''
                                : status;
                            const tone = getDayTone(col.date, holidays);
                            const showOvernightBg = showLodgingGlyphs && overnight;
                            const colorKey = glyph || status;
                            return (
                              <td
                                key={col.date}
                                className={`px-0 max-lg:py-0.5 lg:py-2 text-center border-r border-slate-100 last:border-r-0 ${
                                  showOvernightBg
                                    ? LODGING_OVERNIGHT_CELL_CLASS
                                    : dayToneCellClass(tone)
                                } ${
                                  col.isMonthStart && showFullSeason && !focusedDate ? 'border-l-2 border-l-slate-200' : ''
                                }`}
                              >
                                <div
                                  className={`mx-auto flex min-w-[1.5rem] items-center justify-center rounded-md border px-0.5 font-black leading-none text-center ${
                                    glyph.includes(' ')
                                      ? 'min-h-5 lg:min-h-6 h-auto py-0.5 text-[8px] tracking-tight'
                                      : colorKey.length > 2
                                        ? 'h-5 lg:h-6 text-[8px] tracking-tight'
                                        : 'h-5 lg:h-6 text-[10px]'
                                  } ${statusColorClass(colorKey)}`}
                                >
                                  {glyph}
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
                aria-valuemax={overviewSplitMaxPercent()}
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
                style={{ flex: '1 1 0%', minHeight: overviewPanelMinPx() }}
              >
                <div className="px-4 py-2 flex justify-between items-center border-b border-slate-100 shrink-0 bg-slate-50/50 gap-2">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2 min-w-0">
                    <i className="fas fa-history text-indigo-500 shrink-0"></i>
                    <span className="truncate">{currentGroupName}・変更履歴・消込</span>
                  </h3>
                  {!isAllMode && (
                    <label className="flex items-center space-x-2 text-[10px] text-slate-500 cursor-pointer hover:text-slate-700 transition shrink-0">
                      <input
                        type="checkbox"
                        checked={showProcessedHistory}
                        onChange={(e) => setShowProcessedHistory(e.target.checked)}
                        className="w-3 h-3 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="font-bold">完了分も表示</span>
                    </label>
                  )}
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/10">
                  {isAllMode ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium leading-relaxed text-amber-900">
                      全員表示では履歴・消込は使えません。
                      <br />
                      一覧の<strong className="font-black">グループ名</strong>
                      を押すか、上の切替でグループを選んでください。
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </section>
              </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="h-full min-h-0 space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-y-auto pr-2 pb-8">
              {isAllMode ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium leading-relaxed text-amber-900">
                  利用者の追加・並べ替え・移動・削除は、グループを選んでから行ってください。
                  <br />
                  「確認・消込」でグループ名を押すか、上の切替でグループを選んでください。
                </div>
              ) : (
                <>
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <h3 className="text-xl font-black text-slate-800">{currentGroupName}の利用者名簿</h3>
                <p className="text-xs text-slate-400 font-bold">
                  {showEmployeeId ? 'ユーザID・氏名' : '氏名'}の編集・並べ替え・グループ移動・削除ができます
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 shrink-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  {showEmployeeId && (
                    <input
                      type="text"
                      value={newUserEmployeeId}
                      onChange={(e) => setNewUserEmployeeId(e.target.value)}
                      placeholder="ユーザID（任意）"
                      className="sm:w-36 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm font-bold"
                    />
                  )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {showEmployeeId ? (
                    <p className="text-[11px] text-slate-400 font-medium">
                      ユーザIDは出勤・給与システム連携用です。未設定でも追加できます。
                    </p>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setCsvImportOpen(true)}
                    className="self-start sm:self-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold flex items-center gap-2"
                  >
                    <i className="fas fa-file-csv"></i>
                    CSV取込
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {users.map((u, index) => (
                  <div key={u.id} className="p-5 flex justify-between items-center hover:bg-slate-50/80 transition group gap-3 flex-wrap">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black border border-slate-200 shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        {showEmployeeId && (
                          u.employeeId ? (
                            <div className="text-xs font-bold text-slate-400 truncate">{u.employeeId}</div>
                          ) : (
                            <div className="text-xs font-bold text-slate-300">ユーザID未設定</div>
                          )
                        )}
                        <div className="font-black text-slate-700 text-lg truncate">{u.name}</div>
                      </div>
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
                        onClick={() => openEditUser(u)}
                        className="px-3 h-10 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                        title={showEmployeeId ? 'ユーザID・氏名を編集' : '氏名を編集'}
                      >
                        編集
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
                </>
              )}
            </div>
          )}

          {activeTab === 'GROUPS' && (
            <div className="h-full min-h-0 overflow-y-auto pr-2 pb-8">
              <GroupsPanel groups={groups} onGroupsChange={(next) => onGroupsChange(next)} />
            </div>
          )}

          {activeTab === 'CONFIG' && (
            <div className="h-full min-h-0 max-w-xl space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-y-auto pr-2 pb-8">
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
                <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showEmployeeId !== false}
                    onChange={(e) => setConfig({ ...config, showEmployeeId: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-black text-slate-800">ユーザIDを表示する</span>
                    <span className="block text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                      OFFにすると一覧・利用者管理からユーザID列を隠します（初期はON）。出勤CSVのID列は残ります。
                    </span>
                  </span>
                </label>
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <i className="fas fa-save"></i>
                  <span>期間・表示設定を保存する</span>
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
                  期間・休日は全グループ共通です。出勤CSVは左メニューの「CSV出力」からダウンロードできます。
                </p>
              </div>
            </div>
          )}

          {(activeTab === 'LINKS' || linksEverOpened) && (
            <div
              className={
                activeTab === 'LINKS'
                  ? 'h-full min-h-0 overflow-y-auto pr-2 pb-8'
                  : 'hidden'
              }
              aria-hidden={activeTab !== 'LINKS'}
            >
              <AccessLinksPanel currentLinkId={currentLinkId} groups={groups} />
            </div>
          )}
        </div>
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
            // 備考本文付きの履歴カードをすぐ見せる
            void refreshData(currentYear, currentMonth, {
              users: false,
              schedules: false,
              config: false,
              counts: true,
              histories: true,
            });
          }}
        />
      )}

      {editUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100">
            <h4 className="text-lg font-black text-slate-800">利用者を編集</h4>
            <p className="text-sm text-slate-600 font-medium">
              {showEmployeeId ? 'ユーザID・氏名' : '氏名'}の変更は変更履歴には載せません。
            </p>
            {showEmployeeId && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ユーザID</label>
                <input
                  type="text"
                  value={editEmployeeIdDraft}
                  onChange={(e) => setEditEmployeeIdDraft(e.target.value)}
                  placeholder="出勤・給与システム連携用（任意）"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">氏名</label>
              <input
                type="text"
                value={editNameDraft}
                onChange={(e) => setEditNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void confirmEditUser();
                }}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditUserId(null)}
                disabled={editUserBusy}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={() => void confirmEditUser()}
                disabled={editUserBusy || !editNameDraft.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-40"
              >
                {editUserBusy ? '保存中…' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {csvImportOpen && (
        <UsersCsvImportModal
          groups={groups}
          onClose={() => setCsvImportOpen(false)}
          onCompleted={async () => {
            await onGroupsChange();
            await refreshData(currentYear, currentMonth, { config: false });
          }}
        />
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
