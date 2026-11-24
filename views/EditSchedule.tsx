
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { hasUserNote } from '../components/UserNoteButton';
import UserNoteModal from '../components/UserNoteModal';
import { User, SystemConfig, AttendanceStatus, Group, groupLabel, Schedule } from '../types';
import { getDayTone, dayToneTextClass, listDatesInSeason } from '../services/calendarTone';
import { db } from '../services/database';
import { getStatusOptions, STATUS_COLORS } from '../constants';
import { buildHistoryMessage, isNewScheduleInput } from '../services/historyMessage';
import { normalizeScheduleFields } from '../services/lodgingSchedule';

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
  /** 備考保存成功時。一覧の備考アイコン即時反映用 */
  onNoteSaved?: (userId: string, note: string) => void;
}

type DayDraft = { status: AttendanceStatus; lodgingOvernight: boolean };

function schedulesToDraftMap(
  rows: Schedule[],
  legacyOvernightWork: boolean
): Record<string, DayDraft> {
  const map: Record<string, DayDraft> = {};
  for (const s of rows) {
    const n = normalizeScheduleFields(s.status, s.lodgingOvernight, {
      legacyOvernightWork,
    });
    map[s.date] = { status: n.status, lodgingOvernight: n.lodgingOvernight };
  }
  return map;
}

const emptyDay = (): DayDraft => ({ status: '-', lodgingOvernight: false });

const EditSchedule: React.FC<EditScheduleProps> = ({
  user,
  config,
  groups,
  seedSchedules = [],
  onBack,
  onLogout,
  onSaved,
  onNoteSaved,
}) => {
  const currentGroup = groups.find((g) => g.id === user.groupId);
  const currentGroupName = groupLabel(groups, user.groupId);
  const hasLodging = !!currentGroup?.hasLodgingStatuses;
  const initialSeedMap = useMemo(
    () =>
      schedulesToDraftMap(
        seedSchedules.filter((s) => s.userId === user.id),
        hasLodging
      ),
    // マウント時シードのみ。親の配列参照変更でリセットしない
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id]
  );
  const hasSeed = Object.keys(initialSeedMap).length > 0;

  const [localSchedules, setLocalSchedules] = useState<Record<string, DayDraft>>(() => ({
    ...initialSeedMap,
  }));
  const [initialSchedules, setInitialSchedules] = useState<Record<string, DayDraft>>(() => ({
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
  const statusOptions = useMemo(() => getStatusOptions(), []);
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
        const fullMap = schedulesToDraftMap(savedSchedules, hasLodging);
        setInitialSchedules(fullMap);
        setLocalSchedules((prev) => {
          const next = { ...fullMap };
          for (const date of dirtyDatesRef.current) {
            if (prev[date]) next[date] = prev[date];
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
  }, [user.id, user.groupId, config.seasonStartDate, config.seasonEndDate, hasLodging]);

  const datesInRange = useMemo(
    () => listDatesInSeason(config.seasonStartDate, config.seasonEndDate),
    [config.seasonStartDate, config.seasonEndDate]
  );

  const dayOf = (map: Record<string, DayDraft>, date: string): DayDraft =>
    map[date] || emptyDay();

  const visibleDates = useMemo(() => {
    if (!showNeedsInputOnly) return datesInRange;
    return datesInRange.filter((date) => {
      const current = dayOf(localSchedules, date);
      const initial = dayOf(initialSchedules, date);
      const needsInput = current.status === '-' || current.status === '△';
      const isDirty =
        current.status !== initial.status ||
        current.lodgingOvernight !== initial.lodgingOvernight;
      return needsInput || isDirty;
    });
  }, [datesInRange, showNeedsInputOnly, localSchedules, initialSchedules]);

  const patchDay = (date: string, patch: Partial<DayDraft>) => {
    dirtyDatesRef.current.add(date);
    setLocalSchedules((prev) => {
      const cur = prev[date] || emptyDay();
      return {
        ...prev,
        [date]: {
          status: patch.status ?? cur.status,
          lodgingOvernight: patch.lodgingOvernight ?? cur.lodgingOvernight,
        },
      };
    });
  };

  const handleSave = async () => {
    if (isSaving || isLoading) return;
    setIsSaving(true);
    setSaveNotice(null);
    try {
      const changes: {
        date: string;
        oldStatus: string;
        newStatus: string;
        oldLodging: boolean;
        newLodging: boolean;
      }[] = [];
      datesInRange.forEach((date) => {
        const oldVal = dayOf(initialSchedules, date);
        const newVal = dayOf(localSchedules, date);
        if (
          oldVal.status !== newVal.status ||
          (hasLodging && oldVal.lodgingOvernight !== newVal.lodgingOvernight)
        ) {
          changes.push({
            date,
            oldStatus: oldVal.status,
            newStatus: newVal.status,
            oldLodging: oldVal.lodgingOvernight,
            newLodging: newVal.lodgingOvernight,
          });
        }
      });

      if (changes.length > 0) {
        const changedUpdates: Schedule[] = changes.map((c) => ({
          userId: user.id,
          date: c.date,
          status: c.newStatus as AttendanceStatus,
          lodgingOvernight: hasLodging ? c.newLodging : false,
        }));
        const message = buildHistoryMessage(user.name, changes, {
          includeLodging: hasLodging,
        });
        await db.saveUserSchedules({
          userId: user.id,
          userName: user.name,
          groupId: user.groupId,
          updates: changedUpdates.map((u) => ({
            date: u.date,
            status: u.status,
            lodgingOvernight: u.lodgingOvernight,
          })),
          message,
          isProcessed: isNewScheduleInput(changes),
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
      const a = dayOf(localSchedules, date);
      const b = dayOf(initialSchedules, date);
      if (a.status !== b.status) return true;
      if (hasLodging && a.lodgingOvernight !== b.lodgingOvernight) return true;
    }
    return false;
  }, [localSchedules, initialSchedules, hasLodging]);

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
      dow,
    };
  };

  const optionsWrapClass =
    'grid grid-cols-3 sm:grid-cols-6 gap-1 w-full sm:gap-1.5';

  const canEdit = !loadError || hasSeed;
  const blockSave = !hasChanges || isSaving || isLoading || loadError;

  const renderStatusButton = (dateStr: string, opt: AttendanceStatus, selected: AttendanceStatus) => {
    const isUnset = opt === '-';
    const isLong = opt.length > 2;
    return (
      <button
        key={opt}
        type="button"
        onClick={() => patchDay(dateStr, { status: opt })}
        aria-label={isUnset ? '未入力' : opt}
        title={isUnset ? '未入力' : undefined}
        className={`h-9 sm:h-10 w-full rounded-lg flex items-center justify-center border-2 font-black transition-all duration-75 active:scale-90 px-0.5 ${
          isUnset
            ? 'text-[9px] sm:text-[10px] leading-tight'
            : isLong
              ? 'text-[10px] sm:text-xs tracking-tight'
              : 'text-xs sm:text-sm'
        } ${
          selected === opt
            ? `${STATUS_COLORS[opt]} ring-2 ring-indigo-400 shadow-md z-10`
            : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'
        }`}
      >
        {isUnset ? '未入力' : opt}
      </button>
    );
  };

  return (
    <Layout
      title={`${config.showEmployeeId !== false && user.employeeId ? `${user.employeeId} ` : ''}${user.name} さんの予定編集（${currentGroupName}）`}
      onLogout={onLogout}
      showGeneralManualLink
    >
      <div className="max-w-3xl mx-auto space-y-3 sm:space-y-6">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 sticky top-[44px] sm:top-[52px] z-30 overflow-hidden">
          <div className="px-3 py-2 sm:p-6 flex flex-row justify-between items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <h2 className="text-lg font-bold text-slate-800">各日程の予定を選択</h2>
              <p className="text-xs text-slate-500 mt-1">変更後は必ず「登録する」を押してください</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={blockSave}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm shadow-md disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSaving ? '保存中…' : '登録する'}
              </button>
            </div>
          </div>
          {saveNotice && (
            <p className="px-3 pb-2 text-xs font-bold text-emerald-600 sm:px-6">{saveNotice}</p>
          )}
          {loadError && (
            <p className="px-3 pb-2 text-xs font-bold text-rose-600 sm:px-6">
              予定の取得に失敗しました。表示中の内容で編集はできますが、保存前に再読み込みを試してください。
            </p>
          )}
          <div className="px-3 pb-2 sm:px-6 sm:pb-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-bold"
            >
              {hasUserNote(note) ? '備考を編集' : '備考を書く'}
            </button>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer ml-auto">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                checked={showNeedsInputOnly}
                onChange={(e) => setShowNeedsInputOnly(e.target.checked)}
              />
              表示切替（未入力・△のみ）
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden min-h-[200px] relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <i className="fas fa-sync fa-spin text-indigo-500 text-xl"></i>
            </div>
          )}
          {hasLodging && (
            <div className="px-3 py-2 sm:px-4 bg-yellow-50 text-[11px] sm:text-xs font-bold text-yellow-900 border-b border-yellow-100">
              右の「宿泊」にチェックした日が寮に泊まる日です（入寮日も含みます）。一覧では黄色いセルになります。
            </div>
          )}
          {canEdit &&
            visibleDates.map((dateStr) => {
              const { label } = formatDateLabel(dateStr);
              const draft = dayOf(localSchedules, dateStr);
              const initial = dayOf(initialSchedules, dateStr);
              const isChanged =
                draft.status !== initial.status ||
                (hasLodging && draft.lodgingOvernight !== initial.lodgingOvernight);
              const tone = getDayTone(dateStr, config.holidays || []);

              return (
                <div
                  key={dateStr}
                  className={`px-3 py-2.5 sm:px-4 sm:py-3 transition-colors ${
                    isChanged ? 'bg-indigo-50/30' : ''
                  } ${
                    tone === 'holiday'
                      ? 'bg-rose-50/10'
                      : tone === 'saturday'
                        ? 'bg-blue-50/10'
                        : ''
                  }`}
                >
                  <div
                    className={`grid gap-2 sm:gap-3 items-center ${
                      hasLodging
                        ? 'grid-cols-[5.5rem_minmax(0,1fr)_3.25rem] sm:grid-cols-[6.5rem_minmax(0,1fr)_4rem]'
                        : 'grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[6.5rem_minmax(0,1fr)]'
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={`text-sm sm:text-base font-black ${dayToneTextClass(tone)}`}>
                        {label}
                      </span>
                      {isChanged && (
                        <span className="w-fit px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full uppercase tracking-tighter">
                          変更
                        </span>
                      )}
                    </div>

                    <div className={optionsWrapClass}>
                      {statusOptions.map((opt) =>
                        renderStatusButton(dateStr, opt, draft.status)
                      )}
                    </div>

                    {hasLodging && (
                      <label
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 cursor-pointer select-none ${
                          draft.lodgingOvernight
                            ? 'border-yellow-300 bg-yellow-100/75 text-yellow-900'
                            : 'border-slate-100 bg-white text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-200"
                          checked={draft.lodgingOvernight}
                          onChange={(e) =>
                            patchDay(dateStr, { lodgingOvernight: e.target.checked })
                          }
                          aria-label={`${label} の宿泊`}
                        />
                        <span className="text-[10px] font-black leading-none">宿泊</span>
                      </label>
                    )}
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
              <p className="text-xs font-medium text-slate-400">
                全部表示する場合は上のチェックを外してください
              </p>
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
            <li>「表示切替」で未入力・△に絞れます（変更中の日は登録まで残ります）。</li>
            <li>「未入力」を選ぶと、予定がまだ決まっていない状態になります。</li>
            {hasLodging && (
              <li>
                寮グループでは右の「宿泊」チェックで泊まる日を指定します（入寮日もチェック）。
              </li>
            )}
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
          onSaved={(next) => {
            setNote(next);
            onNoteSaved?.(user.id, next);
          }}
        />
      )}
    </Layout>
  );
};

export default EditSchedule;
