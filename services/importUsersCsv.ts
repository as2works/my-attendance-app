import { Group, GroupId, User, normalizeEmployeeId } from '../types';

/** グループ選択UIの初期除外（変更可能） */
export const DEFAULT_SKIP_GROUP_NAMES = ['常勤'] as const;

export type CsvUserRow = {
  lineNumber: number;
  employeeId: string;
  name: string;
  groupName: string;
};

export type ParseUsersCsvResult = {
  ok: true;
  rows: CsvUserRow[];
  skippedBadColumnCount: number;
} | {
  ok: false;
  error: string;
};

/** 1行の CSV（RFC4180 風のダブルクォート）をパース */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  const s = line;
  if (s.length === 0) return [''];
  while (i <= s.length) {
    if (i === s.length) {
      // 末尾がカンマで終わった場合の空セル
      break;
    }
    if (s[i] === '"') {
      i += 1;
      let cell = '';
      while (i < s.length) {
        if (s[i] === '"') {
          if (s[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        cell += s[i];
        i += 1;
      }
      result.push(cell);
      if (s[i] === ',') i += 1;
      else if (i >= s.length) break;
    } else {
      const start = i;
      while (i < s.length && s[i] !== ',') i += 1;
      result.push(s.slice(start, i));
      if (s[i] === ',') {
        i += 1;
        if (i === s.length) {
          result.push('');
          break;
        }
      } else {
        break;
      }
    }
  }
  return result;
}

export function parseUsersCsv(text: string): ParseUsersCsvResult {
  const raw = text.replace(/^\uFEFF/, '');
  if (!raw.trim()) {
    return { ok: false, error: 'ファイルが空です。UTF-8（BOM付）のCSVを指定してください。' };
  }

  const lines = raw.split(/\r?\n/);
  const rows: CsvUserRow[] = [];
  let skippedBadColumnCount = 0;

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (line.trim() === '') {
      // 完全空行は後段の空スキップと同じ扱い（列パースしない）
      rows.push({ lineNumber: idx + 1, employeeId: '', name: '', groupName: '' });
      continue;
    }
    let cols: string[];
    try {
      cols = parseCsvLine(line);
    } catch {
      return {
        ok: false,
        error: `${idx + 1}行目を読めませんでした。UTF-8（BOM付）で保存し直してください。`,
      };
    }
    if (cols.length !== 3) {
      skippedBadColumnCount += 1;
      continue;
    }
    rows.push({
      lineNumber: idx + 1,
      employeeId: normalizeEmployeeId(cols[0]),
      name: (cols[1] || '').trim(),
      groupName: (cols[2] || '').trim(),
    });
  }

  return { ok: true, rows, skippedBadColumnCount };
}

export type FilteredCsv = {
  emptySkipped: CsvUserRow[];
  policySkipped: CsvUserRow[];
  candidates: CsvUserRow[];
  skippedBadColumnCount: number;
  /** 空行除去後に登場したグループ名（選択UI用） */
  groupNamesInCsv: string[];
};

/** 空行・列欠落を除いた行に含まれるグループ名（出現順・重複なし） */
export function listGroupNamesInRows(rows: CsvUserRow[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of rows) {
    if (!row.groupName || seen.has(row.groupName)) continue;
    seen.add(row.groupName);
    names.push(row.groupName);
  }
  return names;
}

/** 空の項目がある行だけを分離する（グループ除外は別ステップ） */
export function filterEmptyRows(
  rows: CsvUserRow[],
  skippedBadColumnCount: number
): Omit<FilteredCsv, 'policySkipped' | 'candidates'> & {
  nonEmptyRows: CsvUserRow[];
} {
  const emptySkipped: CsvUserRow[] = [];
  const nonEmptyRows: CsvUserRow[] = [];

  for (const row of rows) {
    if (!row.employeeId || !row.name || !row.groupName) {
      emptySkipped.push(row);
      continue;
    }
    nonEmptyRows.push(row);
  }

  return {
    emptySkipped,
    nonEmptyRows,
    skippedBadColumnCount,
    groupNamesInCsv: listGroupNamesInRows(nonEmptyRows),
  };
}

/** 選択した除外グループを適用して候補行を作る */
export function applyGroupSkipPolicy(
  nonEmptyRows: CsvUserRow[],
  skipGroupNames: Set<string>,
  base: Pick<FilteredCsv, 'emptySkipped' | 'skippedBadColumnCount' | 'groupNamesInCsv'>
): FilteredCsv {
  const policySkipped: CsvUserRow[] = [];
  const candidates: CsvUserRow[] = [];

  for (const row of nonEmptyRows) {
    if (skipGroupNames.has(row.groupName)) {
      policySkipped.push(row);
      continue;
    }
    candidates.push(row);
  }

  return {
    ...base,
    policySkipped,
    candidates,
  };
}

/** @deprecated 互換用。空行分離＋デフォルト除外を一括適用 */
export function filterImportRows(
  rows: CsvUserRow[],
  skippedBadColumnCount: number,
  skipGroupNames: Iterable<string> = DEFAULT_SKIP_GROUP_NAMES
): FilteredCsv {
  const base = filterEmptyRows(rows, skippedBadColumnCount);
  return applyGroupSkipPolicy(base.nonEmptyRows, new Set(skipGroupNames), {
    emptySkipped: base.emptySkipped,
    skippedBadColumnCount: base.skippedBadColumnCount,
    groupNamesInCsv: base.groupNamesInCsv,
  });
}

export type IntraCsvIssue =
  | { kind: 'exact_dup'; rows: CsvUserRow[] }
  | { kind: 'id_conflict'; employeeId: string; rows: CsvUserRow[] }
  | { kind: 'name_conflict'; name: string; rows: CsvUserRow[] };

export function detectIntraCsvIssues(candidates: CsvUserRow[]): IntraCsvIssue[] {
  const byId = new Map<string, CsvUserRow[]>();
  const byName = new Map<string, CsvUserRow[]>();
  const byExact = new Map<string, CsvUserRow[]>();

  for (const row of candidates) {
    const idList = byId.get(row.employeeId) || [];
    idList.push(row);
    byId.set(row.employeeId, idList);

    const nameList = byName.get(row.name) || [];
    nameList.push(row);
    byName.set(row.name, nameList);

    const exactKey = `${row.employeeId}\0${row.name}\0${row.groupName}`;
    const exactList = byExact.get(exactKey) || [];
    exactList.push(row);
    byExact.set(exactKey, exactList);
  }

  const issues: IntraCsvIssue[] = [];

  for (const rows of byExact.values()) {
    if (rows.length > 1) {
      issues.push({ kind: 'exact_dup', rows });
    }
  }

  for (const [employeeId, rows] of byId) {
    if (rows.length <= 1) continue;
    const signature = `${rows[0].name}\0${rows[0].groupName}`;
    const allSame = rows.every((r) => `${r.name}\0${r.groupName}` === signature);
    if (!allSame) {
      issues.push({ kind: 'id_conflict', employeeId, rows });
    }
  }

  for (const [name, rows] of byName) {
    if (rows.length <= 1) continue;
    const ids = new Set(rows.map((r) => r.employeeId));
    if (ids.size > 1) {
      // 完全同一行の重複だけの場合は exact_dup で扱う（IDも同じ）
      const onlyExactDup =
        ids.size === 1 ||
        rows.every(
          (r) =>
            r.employeeId === rows[0].employeeId &&
            r.name === rows[0].name &&
            r.groupName === rows[0].groupName
        );
      if (!onlyExactDup) {
        issues.push({ kind: 'name_conflict', name, rows });
      }
    }
  }

  return issues;
}

/** exact_dup を「両方取り込む＝1件化」した候補列を返す */
export function dedupeExactDuplicates(candidates: CsvUserRow[]): CsvUserRow[] {
  const seen = new Set<string>();
  const out: CsvUserRow[] = [];
  for (const row of candidates) {
    const key = `${row.employeeId}\0${row.name}\0${row.groupName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function listMissingGroupNames(
  candidates: CsvUserRow[],
  groups: Group[]
): string[] {
  const existing = new Set(groups.map((g) => g.name));
  const missing = new Set<string>();
  for (const row of candidates) {
    if (!existing.has(row.groupName)) missing.add(row.groupName);
  }
  return [...missing].sort((a, b) => a.localeCompare(b, 'ja'));
}

export type MatchKind =
  | 'exact'
  | 'id_name_mismatch'
  | 'id_group_mismatch'
  | 'name_id_mismatch_single'
  | 'name_id_mismatch_multi'
  | 'create';

export type RowMatch = {
  row: CsvUserRow;
  kind: MatchKind;
  /** 解決済み groupId（スキップ行や未解決は undefined） */
  groupId?: GroupId;
  existing?: User;
  nameMatches?: User[];
  /** id_name_mismatch 時にグループも違う */
  groupAlsoDiffers?: boolean;
};

/**
 * グループ名 → id が解決済みの行について既存ユーザと照合する。
 * groupId が無い行は呼び出し側で除外すること。
 */
export function matchRowsAgainstUsers(
  rows: Array<CsvUserRow & { groupId: GroupId }>,
  existingUsers: User[],
  _groups: Group[]
): RowMatch[] {
  const byEmployeeId = new Map<string, User>();
  const byName = new Map<string, User[]>();

  for (const u of existingUsers) {
    const eid = normalizeEmployeeId(u.employeeId);
    if (eid) byEmployeeId.set(eid, u);
    const list = byName.get(u.name) || [];
    list.push(u);
    byName.set(u.name, list);
  }

  return rows.map((row) => {
    const byId = byEmployeeId.get(row.employeeId);
    if (byId) {
      const nameSame = byId.name === row.name;
      // 振替後は groupId で比較（CSV上のグループ名と既存名が違っても同一扱い）
      const groupSame = byId.groupId === row.groupId;
      if (nameSame && groupSame) {
        return { row, kind: 'exact' as const, groupId: row.groupId, existing: byId };
      }
      if (nameSame && !groupSame) {
        return {
          row,
          kind: 'id_group_mismatch' as const,
          groupId: row.groupId,
          existing: byId,
        };
      }
      return {
        row,
        kind: 'id_name_mismatch' as const,
        groupId: row.groupId,
        existing: byId,
        groupAlsoDiffers: !groupSame,
      };
    }

    const nameHits = byName.get(row.name) || [];
    if (nameHits.length === 1) {
      return {
        row,
        kind: 'name_id_mismatch_single' as const,
        groupId: row.groupId,
        existing: nameHits[0],
        nameMatches: nameHits,
      };
    }
    if (nameHits.length > 1) {
      return {
        row,
        kind: 'name_id_mismatch_multi' as const,
        groupId: row.groupId,
        nameMatches: nameHits,
      };
    }
    return { row, kind: 'create' as const, groupId: row.groupId };
  });
}

export type PlannedAction =
  | { type: 'skip'; row: CsvUserRow; reason: 'exact' | 'group_keep' | 'user_skip' | 'group_unresolved' }
  | { type: 'create'; row: CsvUserRow; groupId: GroupId }
  | {
      type: 'update';
      row: CsvUserRow;
      userId: string;
      /** saveUser に渡す現在の groupId（移動前） */
      currentGroupId: GroupId;
      name: string;
      employeeId: string;
      moveToGroupId?: GroupId;
    };

export type RowDecisionAction =
  | 'overwrite_name'
  | 'cancel_all'
  | 'change_group'
  | 'keep_group'
  | 'overwrite_existing'
  | 'create_new'
  | 'skip'
  | 'create_despite_multi';

export type RowDecision = {
  lineNumber: number;
  action: RowDecisionAction;
  /** id_name_mismatch で上書き後にグループも変えるか */
  changeGroupAfterOverwrite?: boolean;
};

export function buildPlannedActions(
  matches: RowMatch[],
  decisions: Map<number, RowDecision>
): { ok: true; actions: PlannedAction[] } | { ok: false; cancelAll: true } {
  const actions: PlannedAction[] = [];

  for (const m of matches) {
    if (m.kind === 'exact') {
      actions.push({ type: 'skip', row: m.row, reason: 'exact' });
      continue;
    }
    if (m.kind === 'create') {
      if (!m.groupId) {
        actions.push({ type: 'skip', row: m.row, reason: 'group_unresolved' });
        continue;
      }
      actions.push({ type: 'create', row: m.row, groupId: m.groupId });
      continue;
    }

    const d = decisions.get(m.row.lineNumber);
    if (!d) {
      // 未決定は呼び出し側で防ぐ
      continue;
    }
    if (d.action === 'cancel_all') {
      return { ok: false, cancelAll: true };
    }

    if (m.kind === 'id_name_mismatch' && m.existing && m.groupId) {
      if (d.action === 'overwrite_name') {
        const move =
          m.groupAlsoDiffers && d.changeGroupAfterOverwrite ? m.groupId : undefined;
        actions.push({
          type: 'update',
          row: m.row,
          userId: m.existing.id,
          currentGroupId: m.existing.groupId,
          name: m.row.name,
          employeeId: m.row.employeeId,
          moveToGroupId: move,
        });
      } else if (d.action === 'keep_group' || d.action === 'skip') {
        actions.push({ type: 'skip', row: m.row, reason: 'user_skip' });
      }
      continue;
    }

    if (m.kind === 'id_group_mismatch' && m.existing && m.groupId) {
      if (d.action === 'change_group') {
        actions.push({
          type: 'update',
          row: m.row,
          userId: m.existing.id,
          currentGroupId: m.existing.groupId,
          name: m.existing.name,
          employeeId: normalizeEmployeeId(m.existing.employeeId),
          moveToGroupId: m.groupId,
        });
      } else {
        actions.push({ type: 'skip', row: m.row, reason: 'group_keep' });
      }
      continue;
    }

    if (m.kind === 'name_id_mismatch_single' && m.existing && m.groupId) {
      if (d.action === 'overwrite_existing') {
        const move = groupNameNeedsMove(m.existing, m.groupId) ? m.groupId : undefined;
        actions.push({
          type: 'update',
          row: m.row,
          userId: m.existing.id,
          currentGroupId: m.existing.groupId,
          name: m.row.name,
          employeeId: m.row.employeeId,
          moveToGroupId: move,
        });
      } else if (d.action === 'create_new') {
        actions.push({ type: 'create', row: m.row, groupId: m.groupId });
      } else {
        actions.push({ type: 'skip', row: m.row, reason: 'user_skip' });
      }
      continue;
    }

    if (m.kind === 'name_id_mismatch_multi' && m.groupId) {
      if (d.action === 'create_despite_multi' || d.action === 'create_new') {
        actions.push({ type: 'create', row: m.row, groupId: m.groupId });
      } else {
        actions.push({ type: 'skip', row: m.row, reason: 'user_skip' });
      }
    }
  }

  return { ok: true, actions };
}

function groupNameNeedsMove(existing: User, targetGroupId: GroupId): boolean {
  return existing.groupId !== targetGroupId;
}

export type ApplySummary = {
  createdGroups: string[];
  createdUsers: number;
  updatedUsers: number;
  movedGroups: number;
  skippedExact: number;
  skippedOther: number;
  failed: Array<{ lineNumber: number; message: string }>;
};

export function emptyApplySummary(): ApplySummary {
  return {
    createdGroups: [],
    createdUsers: 0,
    updatedUsers: 0,
    movedGroups: 0,
    skippedExact: 0,
    skippedOther: 0,
    failed: [],
  };
}
