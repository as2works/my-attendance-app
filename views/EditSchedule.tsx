
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { hasUserNote } from '../components/UserNoteButton';
import UserNoteModal from '../components/UserNoteModal';
import { User, SystemConfig, AttendanceStatus, Group, groupLabel, Schedule } from '../types';
import { getDayTone, dayToneTextClass, listDatesInSeason } from '../services/calendarTone';
import { db } from '../services/database';
import { getStatusOptions, STATUS_COLORS } from '../constants';
import { buildHistoryMessage } from '../services/historyMessage';

interface EditScheduleProps {
  user: User;
  config: SystemConfig;
  groups: Group[];
  /** 一覧から渡す当月などのシード。あれば即表示し、裏でシーズン全体を取得 */
  seedSchedules?: Schedule[];
  onBack: () => void;
  onLogout: () => void;
  /** 保存成功時。一覧の差分更新用 */
  onSaved?: (updates: Schedule[]) => void;
}

function schedulesToMap(rows: Schedule[]): Record<string, AttendanceStatus> {
  const map: Record<string, AttendanceStatus> = {};
  for (const s of rows) {
    map[s.date] = s.status as AttendanceStatus;
  }
  return map;
}

const EditSchedule: React.FC<EditScheduleProps> = ({
  user,
  config,
  groups,
  seedSchedules = [],
  onBack,
  onLogout,
  onSaved,
}) => {
  const currentGroup = groups.find((g) => g.id === user.groupId);
  const currentGroupName = groupLabel(groups, user.groupId);
  const initialSeedMap = useMemo(
    () => schedulesToMap(seedSchedules.filter((s) => s.userId === user.id)),
    // マウント時シードのみ。親の配列参照変更でリセットしない
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id]
  );
  const hasSeed = Object.keys(initialSeedMap).length > 0;

  const [localSchedules, setLocalSchedules] = useState<Record<string, AttendanceStatus>>(() => ({
    ...initialSeedMap,
  }));
  const [initialSchedules, setInitialSchedules] = useState<Record<string, AttendanceStatus>>(() => ({
    ...initialSeedMap,
  }));
  const [isSaving, setIsSaving] = useState(false);
  /** シーズン全体の読み込み中（シードがあれば編集は可能、保存は完了待ち） */
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [note, setNote] = useState(user.note || '');
  const [noteOpen, setNoteOpen] = useState(false);
  /** 未入力（-）・△、および未登録の変更日だけ表示。デフォルトON */
  const [showNeedsInputOnly, setShowNeedsInputOnly] = useState(true);
  const statusOptions = useMemo(() => getStatusOptions(currentGroup), [currentGroup]);
  const dirtyDatesRef = useRef<Set<string>>(new Set());
  const seedRef = useRef(initialSeedMap);
  seedRef.current = initialSeedMap;

  useEffect(() => {
    setNote(user.note || '');
  }, [user.id, user.note]);

  useEffect(() => {
    dirtyDatesRef.current = new Set();
    const seed = seedRef.current;
    setLocalSchedules({ ...seed });
    setInitialSchedules({ ...seed });
    setLoadError(false);
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const savedSchedules = await db.getSchedulesForUser(user.id, user.groupId, {
          dateFrom: config.seasonStartDate,
          dateTo: config.seasonEndDate,
        });
        const fullMap = schedulesToMap(savedSchedules);
        setInitialSchedules(fullMap);
        setLocalSchedules((prev) => {
          const next = { ...fullMap };
          for (const date of dirtyDatesRef.current) {
            if (prev[date] !== undefined) next[date] = prev[date];
          }
          return next;
        });
      } catch (err) {
        console.error(err);
        setLoadError(true);
        if (Object.keys(seedRef.current).length === 0) {
          setLocalSchedules({});
          setInitialSchedules({});
        }
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, [user.id, user.groupId, config.seasonStartDate, config.seasonEndDate]);

  const datesInRange = useMemo(
    () => listDatesInSeason(config.seasonStartDate, config.seasonEndDate),
    [config.seasonStartDate, config.seasonEndDate]
  );

  const visibleDates = useMemo(() => {
    if (!showNeedsInputOnly) return datesInRange;
    return datesInRange.filter((date) => {
      const current = localSchedules[date] || '-';
      const initial = initialSchedules[date] || '-';
      const needsInput = current === '-' || current === '△';
      const isDirty = current !== initial;
      return needsInput || isDirty;
    });
  }, [datesInRange, showNeedsInputOnly, localSchedules, initialSchedules]);

  const handleStatusChange = (date: string, newStatus: AttendanceStatus) => {
    dirtyDatesRef.current.add(date);
    setLocalSchedules((prev) => ({ ...prev, [date]: newStatus }));
  };

  const handleSave = async () => {
    if (isSaving || isLoading) return;
    setIsSaving(true);
    setSaveNotice(null);
    try {
      const changes: { date: string; oldStatus: string; newStatus: string }[] = [];
      datesInRange.forEach((date) => {
        const oldVal = initialSchedules[date] || '-';
        const newVal = localSchedules[date] || '-';
        if (oldVal !== newVal) {
          changes.push({ date, oldStatus: oldVal, newStatus: newVal });
        }
      });

      if (changes.length > 0) {
        const changedUpdates = changes.map((c) => ({
          userId: user.id,
          date: c.date,
          status: c.newStatus as AttendanceStatus,
        }));
        const message = buildHistoryMessage(user.name, changes);
        await db.saveUserSchedules({
          userId: user.id,
          userName: user.name,
          groupId: user.groupId,
          updates: changes.map((c) => ({ date: c.date, status: c.newStatus })),
          message,
        });
        onSaved?.(changedUpdates);
        setSaveNotice('予定を保存しました');
      }
      onBack();
    } catch (e) {
      console.error(e);
      setSaveNotice('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const keys = new Set([...Object.keys(localSchedules), ...Object.keys(initialSchedules)]);
    for (const date of keys) {
      const a = localSchedules[date] || '-';
      const b = initialSchedules[date] || '-';
      if (a !== b) return true;
    }
    return false;
  }, [localSchedules, initialSchedules]);

  const handleBack = () => {
    if (hasChanges) {
      const ok = confirm(
        '変更がまだ登録されていません。\nこのまま戻ると入力内容は破棄されます。よろしいですか？'
      );
      if (!ok) return;
    }
    onBack();
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const names = ['日', '月', '火', '水', '木', '金', '土'];
    const dow = date.getDay();
    return {
      label: `${month}/${day} (${names[dow]})`,
      dow
    };
  };

  const gridClass = statusOptions.length > 6
    ? 'grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-2'
    : 'grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-2';

  const canEdit = !loadError || hasSeed;
  const blockSave = !hasChanges || isSaving || isLoading || loadError;

  return (
    <Layout
      title={`${config.showEmployeeId !== false && user.employeeId ? `${user.employeeId} ` : ''}${user.name} さんの予定編集（${currentGroupName}）`}
      onLogout={onLogout}
    >
      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-6">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 sticky top-[44px] sm:top-[72px] z-30 overflow-hidden">
          <div className="px-3 py-2 sm:p-6 flex flex-row justify-between items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <h2 className="text-lg font-bold text-slate-800">各日程の予定を選択</h2>
              <p className="text-slate-500 text-sm">タップして記号を選んでください</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleBack}
                className="flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg sm:rounded-xl transition shadow-sm text-sm sm:text-base"
              >
                戻る
              </button>
              <button
                onClick={handleSave}
                disabled={blockSave}
                className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black transition flex items-center justify-center space-x-1.5 sm:space-x-2 text-sm sm:text-base ${
                  !blockSave
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                <span>{isSaving ? '保存中...' : '登録する'}</span>
              </button>
            </div>
          </div>

          {(isLoading || hasChanges || loadError || saveNotice) && (
            <div className="px-3 sm:px-6 pb-2 sm:pb-3 space-y-2">
              {loadError && !hasSeed && (
                <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1.5 sm:p-3 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold">
                  予定の読み込みに失敗しました。戻ってもう一度開いてください。
                </div>
              )}
              {isLoading && (
                <div className="w-full text-slate-400 text-xs sm:text-sm flex items-center space-x-2 px-1 italic">
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>{hasSeed ? 'シーズン全体を読み込み中...' : '読み込み中...'}</span>
                </div>
              )}
              {!isLoading && hasChanges && (
                <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1.5 sm:p-3 rounded-lg sm:rounded-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <i className="fas fa-exclamation-circle text-sm sm:text-lg shrink-0"></i>
                  <span className="font-bold text-[11px] sm:text-sm leading-snug">未保存です。「登録する」を押してください。</span>
                </div>
              )}
              {saveNotice && (
                <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-sm font-bold">
                  {saveNotice}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className={`w-full text-left px-3 py-2.5 sm:px-4 sm:py-4 rounded-xl sm:rounded-2xl border-2 transition flex items-center justify-between gap-3 active:scale-[0.99] ${
            hasUserNote(note)
              ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <i className={`fas fa-sticky-note text-sm sm:text-base ${hasUserNote(note) ? 'text-amber-600' : 'text-slate-400'}`}></i>
              <span className="font-black text-slate-800 text-sm sm:text-base">
                {hasUserNote(note) ? '備考を参照・編集' : '備考を書く'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 sm:mt-1 truncate">
              {hasUserNote(note)
                ? note.trim()
                : '記号で表せない連絡（残業不可・鍵など）があればここへ'}
            </p>
          </div>
          <i className="fas fa-chevron-right text-slate-300 shrink-0"></i>
        </button>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showNeedsInputOnly}
              onChange={(e) => setShowNeedsInputOnly(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-800">表示切替</span>
              <span className="block text-[11px] sm:text-xs text-slate-600 font-bold mt-0.5 leading-snug">
                {showNeedsInputOnly
                  ? '入力が必要な日のみ表示中（無し・△のみ表示中）'
                  : 'すべての日を表示中'}
              </span>
            </span>
          </label>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden min-h-[200px] relative">
          {isLoading && !hasSeed && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <i className="fas fa-spinner fa-spin text-indigo-600 text-2xl"></i>
            </div>
          )}
          {canEdit &&
            visibleDates.map((dateStr) => {
            const { label } = formatDateLabel(dateStr);
            const status = localSchedules[dateStr] || '-';
            const isChanged = (initialSchedules[dateStr] || '-') !== status;
            const tone = getDayTone(dateStr, config.holidays || []);

            return (
              <div key={dateStr} className={`px-3 py-2.5 sm:p-6 transition-colors ${isChanged ? 'bg-indigo-50/30' : ''} ${tone === 'holiday' ? 'bg-rose-50/10' : tone === 'saturday' ? 'bg-blue-50/10' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <span className={`text-sm sm:text-base font-black ${dayToneTextClass(tone)}`}>
                      {label}
                    </span>
                    {isChanged && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-tighter shadow-sm">変更あり</span>}
                  </div>

                  <div className={gridClass}>
                    {statusOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleStatusChange(dateStr, opt)}
                        className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center border-2 font-black text-xs sm:text-sm transition-all duration-75 active:scale-90 ${
                          status === opt
                            ? `${STATUS_COLORS[opt]} ring-2 ring-indigo-400 scale-105 shadow-md z-10`
                            : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {opt === '-' ? '無し' : opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {!isLoading && datesInRange.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              設定された期間がありません。管理者に確認してください。
            </div>
          )}
          {!isLoading && datesInRange.length > 0 && visibleDates.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-bold space-y-2">
              <p>入力が必要な日はありません</p>
              <p className="text-xs font-medium text-slate-400">全部表示する場合は上のチェックを外してください</p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 mb-8">
          <h3 className="text-slate-700 font-bold mb-4 flex items-center space-x-2">
            <i className="fas fa-info-circle text-indigo-500"></i>
            <span>使い方のヒント</span>
          </h3>
          <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
            <li>日程ごとに記号ボタンをタップして予定を選択してください。</li>
            <li>「表示切替」で無し・△に絞れます（変更中の日は登録まで残ります）。</li>
            <li>「無し」を選択すると予定が未設定の状態になります。</li>
            <li>入力を終えたら、画面上部の「登録する」ボタンを必ず押して保存してください。</li>
            <li>記号で表せない連絡は、上の「備考を書く」から入力できます（予定の保存とは別です）。</li>
          </ul>
        </div>
      </div>

      {noteOpen && (
        <UserNoteModal
          userId={user.id}
          userName={user.name}
          groupId={user.groupId}
          initialNote={note}
          onClose={() => setNoteOpen(false)}
          onSaved={(next) => setNote(next)}
        />
      )}
    </Layout>
  );
};

export default EditSchedule;
