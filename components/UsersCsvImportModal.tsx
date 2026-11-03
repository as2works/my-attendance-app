import React, { useMemo, useRef, useState } from 'react';
import { db } from '../services/database';
import {
  ApplySummary,
  CsvUserRow,
  DEFAULT_SKIP_GROUP_NAMES,
  FilteredCsv,
  IntraCsvIssue,
  PlannedAction,
  RowDecision,
  RowMatch,
  applyGroupSkipPolicy,
  buildPlannedActions,
  dedupeExactDuplicates,
  detectIntraCsvIssues,
  emptyApplySummary,
  filterEmptyRows,
  listMissingGroupNames,
  matchRowsAgainstUsers,
  parseUsersCsv,
} from '../services/importUsersCsv';
import { Group, GroupId, User, groupLabel, normalizeEmployeeId } from '../types';

type Step =
  | 'pick'
  | 'group_policy'
  | 'intra'
  | 'groups'
  | 'person_remap'
  | 'decisions'
  | 'confirm'
  | 'applying'
  | 'done';

type Props = {
  groups: Group[];
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
};

async function loadAllUsers(groups: Group[]): Promise<User[]> {
  const lists = await Promise.all(groups.map((g) => db.getUsers(g.id)));
  return lists.flat();
}

const UsersCsvImportModal: React.FC<Props> = ({ groups, onClose, onCompleted }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('pick');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [filtered, setFiltered] = useState<FilteredCsv | null>(null);
  const [nonEmptyRows, setNonEmptyRows] = useState<CsvUserRow[]>([]);
  const [csvGroupNames, setCsvGroupNames] = useState<string[]>([]);
  /** 取り込むグループ（チェックON） */
  const [importGroupNames, setImportGroupNames] = useState<Set<string>>(new Set());
  const [candidates, setCandidates] = useState<CsvUserRow[]>([]);
  const [intraIssues, setIntraIssues] = useState<IntraCsvIssue[]>([]);
  const [missingGroups, setMissingGroups] = useState<string[]>([]);
  /** まだないグループのうち、新規作成するもの */
  const [groupsToCreate, setGroupsToCreate] = useState<Set<string>>(new Set());
  /** 作成しないグループ → 既存グループへ振替の初期値（空なら取り込まない） */
  const [groupRemap, setGroupRemap] = useState<Record<string, GroupId | ''>>({});
  /** 作成しないグループの人ごとの所属先（行番号 → groupId、空なら取り込まない） */
  const [personRemap, setPersonRemap] = useState<Record<number, GroupId | ''>>({});

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<RowMatch[]>([]);
  const [decisions, setDecisions] = useState<Map<number, RowDecision>>(new Map());

  const [summary, setSummary] = useState<{
    emptySkipped: number;
    policySkipped: number;
    badColumns: number;
    skippedGroupNames: string[];
    apply: ApplySummary;
  } | null>(null);

  const needsDecision = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.kind === 'id_name_mismatch' ||
          m.kind === 'id_group_mismatch' ||
          m.kind === 'name_id_mismatch_single' ||
          m.kind === 'name_id_mismatch_multi'
      ),
    [matches]
  );

  const allDecisionsFilled = useMemo(() => {
    for (const m of needsDecision) {
      const d = decisions.get(m.row.lineNumber);
      if (!d) return false;
      if (d.action === 'overwrite_name' && m.groupAlsoDiffers && d.changeGroupAfterOverwrite == null) {
        return false;
      }
    }
    return true;
  }, [needsDecision, decisions]);

  const idConflictIssues = intraIssues.filter((i) => i.kind === 'id_conflict');
  const exactDupIssues = intraIssues.filter((i) => i.kind === 'exact_dup');
  const nameConflictIssues = intraIssues.filter((i) => i.kind === 'name_conflict');

  const notCreatedGroupNames = useMemo(
    () => missingGroups.filter((n) => !groupsToCreate.has(n)),
    [missingGroups, groupsToCreate]
  );

  const personRemapRows = useMemo(
    () => candidates.filter((r) => notCreatedGroupNames.includes(r.groupName)),
    [candidates, notCreatedGroupNames]
  );

  const resetToPick = () => {
    setError(null);
    setFiltered(null);
    setNonEmptyRows([]);
    setCsvGroupNames([]);
    setImportGroupNames(new Set());
    setCandidates([]);
    setIntraIssues([]);
    setMissingGroups([]);
    setGroupsToCreate(new Set());
    setGroupRemap({});
    setPersonRemap({});
    setMatches([]);
    setDecisions(new Map());
    setSummary(null);
    setStep('pick');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseUsersCsv(text);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const base = filterEmptyRows(parsed.rows, parsed.skippedBadColumnCount);
      if (base.nonEmptyRows.length === 0) {
        setError(
          `取り込める行がありません（空欄の行 ${base.emptySkipped.length} / 列の形がおかしい行 ${base.skippedBadColumnCount}）。`
        );
        return;
      }

      const users = await loadAllUsers(groups);
      setAllUsers(users);
      setNonEmptyRows(base.nonEmptyRows);
      setCsvGroupNames(base.groupNamesInCsv);
      setFiltered({
        emptySkipped: base.emptySkipped,
        policySkipped: [],
        candidates: [],
        skippedBadColumnCount: base.skippedBadColumnCount,
        groupNamesInCsv: base.groupNamesInCsv,
      });

      const defaultSkip = new Set<string>(DEFAULT_SKIP_GROUP_NAMES);
      setImportGroupNames(
        new Set(base.groupNamesInCsv.filter((n) => !defaultSkip.has(n)))
      );
      setStep('group_policy');
    } catch (e: any) {
      console.error(e);
      setError('ファイルの読み込みに失敗しました。UTF-8（BOM付）CSVか確認してください。');
    } finally {
      setBusy(false);
    }
  };

  const onGroupPolicyContinue = () => {
    if (!filtered) return;
    const skipNames = new Set(csvGroupNames.filter((n) => !importGroupNames.has(n)));
    const f = applyGroupSkipPolicy(nonEmptyRows, skipNames, {
      emptySkipped: filtered.emptySkipped,
      skippedBadColumnCount: filtered.skippedBadColumnCount,
      groupNamesInCsv: filtered.groupNamesInCsv,
    });
    setFiltered(f);
    if (f.candidates.length === 0) {
      setError(
        `取り込む行がありません（選ばなかったグループの行が ${f.policySkipped.length} 行）。グループを1つ以上選んでください。`
      );
      return;
    }
    setError(null);

    const issues = detectIntraCsvIssues(f.candidates);
    setCandidates(f.candidates);
    setIntraIssues(issues);

    if (issues.length > 0) {
      setStep('intra');
      return;
    }
    proceedAfterIntra(f.candidates, f, allUsers, groups);
  };

  const toggleImportGroup = (name: string) => {
    setImportGroupNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const proceedAfterIntra = (
    nextCandidates: CsvUserRow[],
    f: FilteredCsv,
    users: User[],
    currentGroups: Group[]
  ) => {
    const missing = listMissingGroupNames(nextCandidates, currentGroups);
    setCandidates(nextCandidates);
    setMissingGroups(missing);
    setFiltered(f);
    if (missing.length > 0) {
      setGroupsToCreate(new Set(missing));
      const remap: Record<string, GroupId | ''> = {};
      for (const name of missing) remap[name] = '';
      setGroupRemap(remap);
      setStep('groups');
      return;
    }
    buildMatchesAndContinue(nextCandidates, currentGroups, users, f, {
      createNames: [],
      remap: {},
      rowRemap: {},
    });
  };

  const buildMatchesAndContinue = (
    rows: CsvUserRow[],
    currentGroups: Group[],
    users: User[],
    f: FilteredCsv | null,
    opts: {
      createNames: string[];
      remap: Record<string, GroupId | ''>;
      rowRemap: Record<number, GroupId | ''>;
    }
  ) => {
    const nameToId = new Map(currentGroups.map((g) => [g.name, g.id]));
    const createSet = new Set(opts.createNames);
    const resolved: Array<CsvUserRow & { groupId: GroupId }> = [];
    const unresolvedSkips: RowMatch[] = [];

    for (const row of rows) {
      let gid = nameToId.get(row.groupName);
      if (!gid && createSet.has(row.groupName)) {
        gid = `__new__:${row.groupName}`;
      }
      if (!gid && Object.prototype.hasOwnProperty.call(opts.rowRemap, row.lineNumber)) {
        const perPerson = opts.rowRemap[row.lineNumber];
        if (perPerson) gid = perPerson;
      } else if (!gid) {
        const remapped = opts.remap[row.groupName];
        if (remapped) gid = remapped;
      }
      if (!gid) {
        unresolvedSkips.push({ row, kind: 'create' });
        continue;
      }
      resolved.push({ ...row, groupId: gid });
    }

    // 新規グループ行も含めて ID/名前照合する（groupId は適用時に解決）
    const matched = matchRowsAgainstUsers(resolved, users, currentGroups);
    const allMatches = [...matched, ...unresolvedSkips];
    setMatches(allMatches);
    setDecisions(new Map());

    const need = allMatches.filter(
      (m) =>
        m.kind === 'id_name_mismatch' ||
        m.kind === 'id_group_mismatch' ||
        m.kind === 'name_id_mismatch_single' ||
        m.kind === 'name_id_mismatch_multi'
    );
    if (need.length > 0) {
      setStep('decisions');
    } else {
      setStep('confirm');
    }

    if (f) setFiltered(f);
  };

  const onIntraContinue = (mode: 'proceed' | 'cancel') => {
    if (mode === 'cancel' || idConflictIssues.length > 0) {
      onClose();
      return;
    }
    if (!filtered) return;
    let next = candidates;
    if (exactDupIssues.length > 0) {
      next = dedupeExactDuplicates(next);
    }
    // name_conflict で proceed = 両方取り込む（そのまま）
    proceedAfterIntra(next, filtered, allUsers, groups);
  };

  const toggleGroupToCreate = (name: string) => {
    setGroupsToCreate((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const initPersonRemapFromBulk = () => {
    const next: Record<number, GroupId | ''> = {};
    for (const row of candidates) {
      if (groupsToCreate.has(row.groupName)) continue;
      if (!missingGroups.includes(row.groupName)) continue;
      next[row.lineNumber] = groupRemap[row.groupName] ?? '';
    }
    setPersonRemap(next);
  };

  const onGroupsContinue = () => {
    const needPerson =
      candidates.some(
        (r) => missingGroups.includes(r.groupName) && !groupsToCreate.has(r.groupName)
      );
    if (needPerson) {
      initPersonRemapFromBulk();
      setStep('person_remap');
      return;
    }
    buildMatchesAndContinue(candidates, groups, allUsers, filtered, {
      createNames: [...groupsToCreate],
      remap: groupRemap,
      rowRemap: {},
    });
  };

  const onPersonRemapContinue = () => {
    buildMatchesAndContinue(candidates, groups, allUsers, filtered, {
      createNames: [...groupsToCreate],
      remap: groupRemap,
      rowRemap: personRemap,
    });
  };

  const setDecision = (lineNumber: number, patch: Partial<RowDecision> & { action: RowDecision['action'] }) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      const cur = next.get(lineNumber);
      next.set(lineNumber, {
        lineNumber,
        action: patch.action,
        changeGroupAfterOverwrite:
          patch.changeGroupAfterOverwrite !== undefined
            ? patch.changeGroupAfterOverwrite
            : cur?.changeGroupAfterOverwrite,
      });
      return next;
    });
  };

  const previewActions = (): PlannedAction[] => {
    const built = buildPlannedActions(matches, decisions);
    if (!built.ok) return [];
    return built.actions;
  };

  const runApply = async () => {
    const built = buildPlannedActions(matches, decisions);
    if (!built.ok) {
      onClose();
      return;
    }
    setBusy(true);
    setStep('applying');
    const apply = emptyApplySummary();
    let workingGroups = [...groups];

    try {
      // 選択したグループだけ作成（寮用記号なし）
      for (const name of missingGroups) {
        if (!groupsToCreate.has(name)) continue;
        const created = await db.createGroup({ name, hasLodgingStatuses: false });
        workingGroups = [...workingGroups, created];
        apply.createdGroups.push(name);
      }

      const nameToId = new Map(workingGroups.map((g) => [g.name, g.id]));

      const resolveGroupId = (row: CsvUserRow, plannedGroupId?: GroupId): GroupId | null => {
        if (plannedGroupId && !plannedGroupId.startsWith('__new__:')) return plannedGroupId;
        if (plannedGroupId?.startsWith('__new__:')) {
          const name = plannedGroupId.slice('__new__:'.length);
          return nameToId.get(name) || null;
        }
        const fromName = nameToId.get(row.groupName);
        if (fromName) return fromName;
        if (Object.prototype.hasOwnProperty.call(personRemap, row.lineNumber)) {
          return personRemap[row.lineNumber] || null;
        }
        const remapped = groupRemap[row.groupName];
        return remapped || null;
      };

      for (const action of built.actions) {
        try {
          if (action.type === 'skip') {
            if (action.reason === 'exact') apply.skippedExact += 1;
            else apply.skippedOther += 1;
            continue;
          }
          if (action.type === 'create') {
            const gid = resolveGroupId(action.row, action.groupId);
            if (!gid) {
              apply.skippedOther += 1;
              continue;
            }
            await db.saveUser({
              id: '',
              name: action.row.name,
              employeeId: action.row.employeeId,
              groupId: gid,
            });
            apply.createdUsers += 1;
            continue;
          }
          if (action.type === 'update') {
            await db.saveUser({
              id: action.userId,
              name: action.name,
              employeeId: action.employeeId,
              groupId: action.currentGroupId,
            });
            apply.updatedUsers += 1;
            if (action.moveToGroupId) {
              const target = resolveGroupId(action.row, action.moveToGroupId);
              if (target && target !== action.currentGroupId) {
                await db.moveUserToGroup(action.userId, target);
                apply.movedGroups += 1;
              }
            }
          }
        } catch (e: any) {
          console.error(e);
          const msg = String(e?.message || '');
          apply.failed.push({
            lineNumber: action.row.lineNumber,
            message: msg.includes('DUPLICATE_EMPLOYEE_ID')
              ? '同じユーザIDが既に存在します'
              : '保存に失敗しました',
          });
          break;
        }
      }

      setSummary({
        emptySkipped: filtered?.emptySkipped.length || 0,
        policySkipped: filtered?.policySkipped.length || 0,
        badColumns: filtered?.skippedBadColumnCount || 0,
        skippedGroupNames: csvGroupNames.filter((n) => !importGroupNames.has(n)),
        apply,
      });
      setStep('done');
      await onCompleted();
    } catch (e: any) {
      console.error(e);
      setError('取込処理中にエラーが発生しました。');
      setStep('confirm');
    } finally {
      setBusy(false);
    }
  };

  const preview = previewActions();
  const previewCounts = {
    create: preview.filter((a) => a.type === 'create').length,
    update: preview.filter((a) => a.type === 'update').length,
    skipExact: preview.filter((a) => a.type === 'skip' && a.reason === 'exact').length,
    skipOther: preview.filter((a) => a.type === 'skip' && a.reason !== 'exact').length,
  };

  /** 直前の確認ステップへ戻る（入力内容は保持） */
  const goBack = () => {
    if (step === 'group_policy') {
      resetToPick();
      return;
    }
    if (step === 'intra') {
      setStep('group_policy');
      return;
    }
    if (step === 'groups') {
      setStep(intraIssues.length > 0 ? 'intra' : 'group_policy');
      return;
    }
    if (step === 'person_remap') {
      setStep('groups');
      return;
    }
    if (step === 'decisions') {
      if (personRemapRows.length > 0) setStep('person_remap');
      else if (missingGroups.length > 0) setStep('groups');
      else if (intraIssues.length > 0) setStep('intra');
      else setStep('group_policy');
      return;
    }
    if (step === 'confirm') {
      if (needsDecision.length > 0) setStep('decisions');
      else if (personRemapRows.length > 0) setStep('person_remap');
      else if (missingGroups.length > 0) setStep('groups');
      else if (intraIssues.length > 0) setStep('intra');
      else setStep('group_policy');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col">
        <div className="px-6 pt-6 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-black text-slate-800">利用者CSV取込</h4>
            <p className="text-xs text-slate-500 font-medium mt-1">
              UTF-8（BOM付）・列は ID / 名前 / グループ（ヘッダなし）
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy && step === 'applying'}
            className="text-slate-400 hover:text-slate-600 w-10 h-10 rounded-xl"
            title="閉じる"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold px-4 py-3">
              {error}
            </div>
          )}

          {step === 'pick' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                空欄の行は取り込みません。次の画面で、取り込むグループを選べます。
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) => void handleFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-bold hover:file:bg-indigo-100"
              />
              {busy && <p className="text-sm font-bold text-slate-500">読み込み中…</p>}
            </div>
          )}

          {step === 'group_policy' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 font-medium">
                チェックをつけたグループだけ取り込みます。最初は「常勤」だけ外してあります。
              </p>
              <div className="space-y-2">
                {csvGroupNames.map((name) => {
                  const count = nonEmptyRows.filter((r) => r.groupName === name).length;
                  const checked = importGroupNames.has(name);
                  return (
                    <label
                      key={name}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer ${
                        checked ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleImportGroup(name)}
                        />
                        <span className="text-sm font-black text-slate-800 truncate">{name}</span>
                      </span>
                      <span className="text-xs font-bold text-slate-500 shrink-0">{count}行</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                  onClick={() => setImportGroupNames(new Set(csvGroupNames))}
                >
                  すべて選択
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                  onClick={() => setImportGroupNames(new Set())}
                >
                  すべて解除
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                  onClick={() =>
                    setImportGroupNames(
                      new Set(
                        csvGroupNames.filter(
                          (n) => !(DEFAULT_SKIP_GROUP_NAMES as readonly string[]).includes(n)
                        )
                      )
                    )
                  }
                >
                  はじめの選び方に戻す（常勤だけ外す）
                </button>
              </div>
            </div>
          )}

          {step === 'intra' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                CSV内に重複・衝突があります。データ不備の可能性があるため確認してください。
              </p>

              {idConflictIssues.map((issue) =>
                issue.kind === 'id_conflict' ? (
                  <div key={`id-${issue.employeeId}`} className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
                    <div className="font-black text-rose-800 text-sm">
                      同一IDの内容不一致（ID: {issue.employeeId}）
                    </div>
                    <p className="text-xs text-rose-700 font-medium">
                      両方取り込むことはできません。CSVを修正してから再度取り込んでください。
                    </p>
                    <ul className="text-xs text-slate-700 space-y-1 font-medium">
                      {issue.rows.map((r) => (
                        <li key={r.lineNumber}>
                          {r.lineNumber}行: {r.name} / {r.groupName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}

              {exactDupIssues.map((issue, idx) =>
                issue.kind === 'exact_dup' ? (
                  <div key={`ex-${idx}`} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <div className="font-black text-slate-800 text-sm">完全同一行の重複</div>
                    <ul className="text-xs text-slate-600 space-y-1 font-medium">
                      {issue.rows.map((r) => (
                        <li key={r.lineNumber}>
                          {r.lineNumber}行: ID {r.employeeId} / {r.name} / {r.groupName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}

              {nameConflictIssues.map((issue) =>
                issue.kind === 'name_conflict' ? (
                  <div key={`nm-${issue.name}`} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <div className="font-black text-slate-800 text-sm">
                      同名・ID違い（{issue.name}）
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1 font-medium">
                      {issue.rows.map((r) => (
                        <li key={r.lineNumber}>
                          {r.lineNumber}行: ID {r.employeeId} / {r.groupName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          )}

          {step === 'groups' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 font-medium">
                まだないグループがあります。作るものにチェックを入れてください（作る場合、寮用の記号はありません）。
                作らないグループは、まず全員の初期の所属先を選べます。次の画面で一人ずつ変えられます。
              </p>
              <div className="space-y-3">
                {missingGroups.map((name) => {
                  const willCreate = groupsToCreate.has(name);
                  const count = candidates.filter((r) => r.groupName === name).length;
                  return (
                    <div
                      key={name}
                      className={`rounded-2xl border p-4 space-y-3 ${
                        willCreate ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={willCreate}
                            onChange={() => toggleGroupToCreate(name)}
                          />
                          <span className="text-sm font-black text-slate-800 truncate">
                            {name} を新しく作る
                          </span>
                        </span>
                        <span className="text-xs font-bold text-slate-500 shrink-0">{count}人</span>
                      </label>
                      {!willCreate && (
                        <div className="pl-7 space-y-1">
                          <p className="text-xs font-bold text-slate-500">
                            作らない場合の初期の所属先（次で個人ごとに変更可）
                          </p>
                          <select
                            value={groupRemap[name] ?? ''}
                            onChange={(e) =>
                              setGroupRemap((prev) => ({
                                ...prev,
                                [name]: e.target.value as GroupId | '',
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-sm bg-white"
                          >
                            <option value="">取り込まない</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name} に入れる
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                  onClick={() => setGroupsToCreate(new Set(missingGroups))}
                >
                  すべて作る
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                  onClick={() => setGroupsToCreate(new Set())}
                >
                  すべて作らない
                </button>
              </div>
            </div>
          )}

          {step === 'person_remap' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 font-medium">
                作らないグループの人です。一人ずつ、どのグループに入れるか選んでください。
                「取り込まない」にすると、その人だけ取り込みません。
              </p>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                onClick={initPersonRemapFromBulk}
              >
                一括の所属先をもう一度全員に反映
              </button>
              <div className="space-y-2">
                {personRemapRows.map((row) => (
                  <div
                    key={row.lineNumber}
                    className="rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                  >
                    <div className="min-w-0 flex-1 text-sm font-bold text-slate-800">
                      <span className="text-slate-400 font-medium mr-2">{row.lineNumber}行</span>
                      ID {row.employeeId} / {row.name}
                      <span className="text-xs text-slate-500 font-medium ml-2">
                        （CSV: {row.groupName}）
                      </span>
                    </div>
                    <select
                      value={personRemap[row.lineNumber] ?? ''}
                      onChange={(e) =>
                        setPersonRemap((prev) => ({
                          ...prev,
                          [row.lineNumber]: e.target.value as GroupId | '',
                        }))
                      }
                      className="sm:w-48 px-3 py-2 rounded-xl border border-slate-200 font-bold text-sm bg-white shrink-0"
                    >
                      <option value="">取り込まない</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} に入れる
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'decisions' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 font-medium">
                既存データとの差異があります。行ごとに判断してください。
              </p>
              {needsDecision.map((m) => {
                const d = decisions.get(m.row.lineNumber);
                return (
                  <div
                    key={m.row.lineNumber}
                    className="rounded-2xl border border-slate-200 p-4 space-y-3"
                  >
                    <div className="text-sm font-black text-slate-800">
                      {m.row.lineNumber}行: ID {m.row.employeeId} / {m.row.name} / {m.row.groupName}
                    </div>

                    {m.kind === 'id_name_mismatch' && m.existing && (
                      <>
                        <p className="text-xs text-slate-600 font-medium">
                          同じIDの既存: 「{m.existing.name}」（
                          {groupLabel(groups, m.existing.groupId)}）→ 名前が違います
                          {m.groupAlsoDiffers ? '（グループも違う）' : ''}
                        </p>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'overwrite_name'}
                              onChange={() =>
                                setDecision(m.row.lineNumber, {
                                  action: 'overwrite_name',
                                  changeGroupAfterOverwrite: m.groupAlsoDiffers ? true : undefined,
                                })
                              }
                            />
                            名前を上書きする
                          </label>
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'cancel_all'}
                              onChange={() => setDecision(m.row.lineNumber, { action: 'cancel_all' })}
                            />
                            全体をキャンセル
                          </label>
                        </div>
                        {d?.action === 'overwrite_name' && m.groupAlsoDiffers && (
                          <div className="ml-4 flex flex-col gap-2 border-l-2 border-indigo-100 pl-3">
                            <span className="text-xs font-bold text-slate-500">グループも変更しますか？</span>
                            <label className="flex items-center gap-2 text-sm font-bold">
                              <input
                                type="radio"
                                name={`dg-${m.row.lineNumber}`}
                                checked={d.changeGroupAfterOverwrite === true}
                                onChange={() =>
                                  setDecision(m.row.lineNumber, {
                                    action: 'overwrite_name',
                                    changeGroupAfterOverwrite: true,
                                  })
                                }
                              />
                              グループを変更する
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold">
                              <input
                                type="radio"
                                name={`dg-${m.row.lineNumber}`}
                                checked={d.changeGroupAfterOverwrite === false}
                                onChange={() =>
                                  setDecision(m.row.lineNumber, {
                                    action: 'overwrite_name',
                                    changeGroupAfterOverwrite: false,
                                  })
                                }
                              />
                              グループは現状維持
                            </label>
                          </div>
                        )}
                      </>
                    )}

                    {m.kind === 'id_group_mismatch' && m.existing && (
                      <>
                        <p className="text-xs text-slate-600 font-medium">
                          ID・名前は一致。グループのみ違う（現在:{' '}
                          {groupLabel(groups, m.existing.groupId)} → CSV: {m.row.groupName}）
                        </p>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'change_group'}
                              onChange={() => setDecision(m.row.lineNumber, { action: 'change_group' })}
                            />
                            グループを変更する（履歴も移動）
                          </label>
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'keep_group'}
                              onChange={() => setDecision(m.row.lineNumber, { action: 'keep_group' })}
                            />
                            スキップ（グループは変えない）
                          </label>
                        </div>
                      </>
                    )}

                    {m.kind === 'name_id_mismatch_single' && m.existing && (
                      <>
                        <p className="text-xs text-slate-600 font-medium">
                          同名の既存あり（ID:{' '}
                          {normalizeEmployeeId(m.existing.employeeId) || '未設定'} /{' '}
                          {groupLabel(groups, m.existing.groupId)}）
                        </p>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'overwrite_existing'}
                              onChange={() =>
                                setDecision(m.row.lineNumber, { action: 'overwrite_existing' })
                              }
                            />
                            上書き（既存をCSVに合わせる）
                          </label>
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'create_new'}
                              onChange={() => setDecision(m.row.lineNumber, { action: 'create_new' })}
                            />
                            新規追加
                          </label>
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'skip'}
                              onChange={() => setDecision(m.row.lineNumber, { action: 'skip' })}
                            />
                            スキップ
                          </label>
                        </div>
                      </>
                    )}

                    {m.kind === 'name_id_mismatch_multi' && (
                      <>
                        <p className="text-xs text-slate-600 font-medium">
                          同名の既存が{m.nameMatches?.length || 0}人います（同性同名の可能性）。上書き対象は選べません。
                        </p>
                        <ul className="text-xs text-slate-500 font-medium list-disc pl-4">
                          {(m.nameMatches || []).map((u) => (
                            <li key={u.id}>
                              ID:{normalizeEmployeeId(u.employeeId) || '未設定'} /{' '}
                              {groupLabel(groups, u.groupId)}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'create_despite_multi'}
                              onChange={() =>
                                setDecision(m.row.lineNumber, { action: 'create_despite_multi' })
                              }
                            />
                            新規登録する
                          </label>
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`d-${m.row.lineNumber}`}
                              checked={d?.action === 'cancel_all'}
                              onChange={() => setDecision(m.row.lineNumber, { action: 'cancel_all' })}
                            />
                            全体をキャンセル
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step === 'confirm' && filtered && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-black text-slate-800">この内容で取り込みます</p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  「取り込む」を押すと、下の内容だけ反映します。
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-indigo-700">これからやること</p>
                <ul className="text-sm text-slate-700 font-medium space-y-1">
                  {[...groupsToCreate].length > 0 && (
                    <li>まだないグループを作る: {[...groupsToCreate].join('、')}</li>
                  )}
                  {personRemapRows.length > 0 && (
                    <li>
                      所属先を個人指定した人:{' '}
                      {personRemapRows.filter((r) => personRemap[r.lineNumber]).length}人 ／
                      取り込まない:{' '}
                      {personRemapRows.filter((r) => !personRemap[r.lineNumber]).length}人
                    </li>
                  )}
                  {previewCounts.create > 0 && (
                    <li>新しく登録する人: {previewCounts.create}人</li>
                  )}
                  {previewCounts.update > 0 && (
                    <li>すでにいる人の情報を直す: {previewCounts.update}人</li>
                  )}
                  {previewCounts.create === 0 && previewCounts.update === 0 && (
                    <li className="text-slate-500">新しく登録する人も、直す人もいません。</li>
                  )}
                </ul>
              </div>

              {(filtered.emptySkipped.length > 0 ||
                filtered.policySkipped.length > 0 ||
                filtered.skippedBadColumnCount > 0 ||
                previewCounts.skipExact > 0 ||
                previewCounts.skipOther > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-500">取り込まないもの</p>
                  <ul className="text-sm text-slate-700 font-medium space-y-1">
                    {filtered.emptySkipped.length > 0 && (
                      <li>名前やIDが空欄の行（取り込まない）: {filtered.emptySkipped.length}行</li>
                    )}
                    {filtered.policySkipped.length > 0 && (
                      <li>
                        選ばなかったグループの行（取り込まない）: {filtered.policySkipped.length}行
                        {csvGroupNames.filter((n) => !importGroupNames.has(n)).length > 0
                          ? `（${csvGroupNames.filter((n) => !importGroupNames.has(n)).join('、')}）`
                          : ''}
                      </li>
                    )}
                    {filtered.skippedBadColumnCount > 0 && (
                      <li>列の形がおかしい行（取り込まない）: {filtered.skippedBadColumnCount}行</li>
                    )}
                    {previewCounts.skipExact > 0 && (
                      <li>すでに同じ内容で登録済み（そのまま）: {previewCounts.skipExact}人</li>
                    )}
                    {previewCounts.skipOther > 0 && (
                      <li>今回は触らない行: {previewCounts.skipOther}行</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 'applying' && (
            <p className="text-sm font-bold text-slate-600">取り込み中です…</p>
          )}

          {step === 'done' && summary && (
            <div className="space-y-4">
              <p className="text-sm font-black text-emerald-700">取り込みが終わりました</p>

              <div className="space-y-2">
                <p className="text-xs font-black text-indigo-700">やったこと</p>
                <ul className="text-sm text-slate-700 font-medium space-y-1">
                  {summary.apply.createdGroups.length > 0 && (
                    <li>つくったグループ: {summary.apply.createdGroups.join('、')}</li>
                  )}
                  {summary.apply.createdUsers > 0 && (
                    <li>新しく登録した人: {summary.apply.createdUsers}人</li>
                  )}
                  {summary.apply.updatedUsers > 0 && (
                    <li>情報を直した人: {summary.apply.updatedUsers}人</li>
                  )}
                  {summary.apply.movedGroups > 0 && (
                    <li>グループを移した人: {summary.apply.movedGroups}人</li>
                  )}
                  {summary.apply.createdGroups.length === 0 &&
                    summary.apply.createdUsers === 0 &&
                    summary.apply.updatedUsers === 0 &&
                    summary.apply.movedGroups === 0 && (
                      <li className="text-slate-500">新しく登録した人も、直した人もいません。</li>
                    )}
                </ul>
              </div>

              {(summary.emptySkipped > 0 ||
                summary.policySkipped > 0 ||
                summary.badColumns > 0 ||
                summary.apply.skippedExact > 0 ||
                summary.apply.skippedOther > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-500">取り込まなかったもの</p>
                  <ul className="text-sm text-slate-700 font-medium space-y-1">
                    {summary.emptySkipped > 0 && (
                      <li>名前やIDが空欄の行: {summary.emptySkipped}行</li>
                    )}
                    {summary.policySkipped > 0 && (
                      <li>
                        選ばなかったグループの行: {summary.policySkipped}行
                        {summary.skippedGroupNames.length > 0
                          ? `（${summary.skippedGroupNames.join('、')}）`
                          : ''}
                      </li>
                    )}
                    {summary.badColumns > 0 && (
                      <li>列の形がおかしい行: {summary.badColumns}行</li>
                    )}
                    {summary.apply.skippedExact > 0 && (
                      <li>すでに同じ内容で登録済み（そのまま）: {summary.apply.skippedExact}人</li>
                    )}
                    {summary.apply.skippedOther > 0 && (
                      <li>今回は触らなかった行: {summary.apply.skippedOther}行</li>
                    )}
                  </ul>
                </div>
              )}

              {summary.apply.failed.length > 0 && (
                <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700 font-bold space-y-1">
                  <div>途中でエラーが出たので、そこで止めました。</div>
                  {summary.apply.failed.map((f) => (
                    <div key={f.lineNumber}>
                      {f.lineNumber}行目: {f.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
          {step === 'pick' && (
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
              やめる
            </button>
          )}

          {step === 'group_policy' && (
            <>
              <button type="button" onClick={goBack} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                戻る
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                やめる
              </button>
              <button
                type="button"
                disabled={importGroupNames.size === 0}
                onClick={onGroupPolicyContinue}
                className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-40"
              >
                次へ
              </button>
            </>
          )}

          {step === 'intra' && (
            <>
              <button type="button" onClick={goBack} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                戻る
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                やめる
              </button>
              {idConflictIssues.length === 0 && (
                <button
                  type="button"
                  onClick={() => onIntraContinue('proceed')}
                  className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black"
                >
                  {nameConflictIssues.length > 0
                    ? '両方取り込む'
                    : exactDupIssues.length > 0
                      ? '続ける（同一行は1件化）'
                      : '続ける'}
                </button>
              )}
            </>
          )}

          {step === 'groups' && (
            <>
              <button type="button" onClick={goBack} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                戻る
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                やめる
              </button>
              <button
                type="button"
                onClick={onGroupsContinue}
                className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black"
              >
                次へ
              </button>
            </>
          )}

          {step === 'person_remap' && (
            <>
              <button type="button" onClick={goBack} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                戻る
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                やめる
              </button>
              <button
                type="button"
                onClick={onPersonRemapContinue}
                className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black"
              >
                次へ
              </button>
            </>
          )}

          {step === 'decisions' && (
            <>
              <button type="button" onClick={goBack} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                戻る
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                やめる
              </button>
              <button
                type="button"
                disabled={!allDecisionsFilled}
                onClick={() => {
                  for (const m of needsDecision) {
                    if (decisions.get(m.row.lineNumber)?.action === 'cancel_all') {
                      onClose();
                      return;
                    }
                  }
                  setStep('confirm');
                }}
                className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-40"
              >
                次へ
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button type="button" onClick={goBack} className="px-5 py-3 rounded-xl bg-slate-100 font-bold">
                戻る
              </button>
              <button
                type="button"
                onClick={resetToPick}
                className="px-5 py-3 rounded-xl bg-slate-100 font-bold"
              >
                やりなおす
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runApply()}
                className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-40"
              >
                取り込む
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersCsvImportModal;
