
function formatDay(dateStr: string): string {
  // YYYY-MM-DD をローカル解釈（UTC Date パースによる日付ずれ防止）
  const parts = dateStr.split('-').map(Number);
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  return `${month}月${day}日`;
}

export type ScheduleChange = {
  date: string;
  oldStatus: string;
  newStatus: string;
  oldLodging?: boolean;
  newLodging?: boolean;
};

function changeLabel(
  status: string,
  lodging: boolean | undefined,
  includeLodging: boolean
): string {
  const work = !status || status === '-' ? '未入力' : status;
  if (!includeLodging) return work;
  return lodging ? `${work}・宿泊` : `${work}・未宿泊`;
}

/** 差分がすべて「未入力 → 何か」なら新規入力扱い（宿泊のみの変更は新規にしない） */
export function isNewScheduleInput(changes: ScheduleChange[]): boolean {
  if (changes.length === 0) return false;
  return changes.every((c) => {
    const oldEmpty = c.oldStatus === '-' || !c.oldStatus;
    const lodgingOnly =
      (c.oldStatus || '-') === (c.newStatus || '-') &&
      !!c.oldLodging !== !!c.newLodging;
    return oldEmpty && !lodgingOnly;
  });
}

/**
 * AI を待たず、変更差分から履歴文をすぐ作る。
 * 管理者が「誰がどこを変えたか」を確実に見られることが優先。
 */
export function buildHistoryMessage(
  userName: string,
  changes: ScheduleChange[],
  options?: { includeLodging?: boolean }
): string {
  if (changes.length === 0) {
    return `${userName}さんが予定を確認しました。`;
  }

  const includeLodging = !!options?.includeLodging;
  const sorted = [...changes].sort((a, b) => a.date.localeCompare(b.date));

  if (isNewScheduleInput(sorted)) {
    const start = formatDay(sorted[0].date);
    const end = formatDay(sorted[sorted.length - 1].date);
    return `${userName}さんが予定を新規入力しました。（${start}～${end}）`;
  }

  const lines = sorted.map((c) => {
    const from = changeLabel(c.oldStatus, c.oldLodging, includeLodging);
    const to = changeLabel(c.newStatus, c.newLodging, includeLodging);
    return `　　${formatDay(c.date)}：${from}→${to}`;
  });
  return `${userName}さんが予定を変更しました。\n${lines.join('\n')}`;
}
