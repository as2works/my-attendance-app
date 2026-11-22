
function formatDay(dateStr: string): string {
  // YYYY-MM-DD をローカル解釈（UTC Date パースによる日付ずれ防止）
  const parts = dateStr.split('-').map(Number);
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  return `${month}月${day}日`;
}

export type ScheduleChange = { date: string; oldStatus: string; newStatus: string };

/** 差分がすべて「未入力 → 何か」なら新規入力扱い */
export function isNewScheduleInput(changes: ScheduleChange[]): boolean {
  if (changes.length === 0) return false;
  return changes.every((c) => c.oldStatus === '-' || !c.oldStatus);
}

/**
 * AI を待たず、変更差分から履歴文をすぐ作る。
 * 管理者が「誰がどこを変えたか」を確実に見られることが優先。
 */
export function buildHistoryMessage(userName: string, changes: ScheduleChange[]): string {
  if (changes.length === 0) {
    return `${userName}さんが予定を確認しました。`;
  }

  const sorted = [...changes].sort((a, b) => a.date.localeCompare(b.date));

  if (isNewScheduleInput(sorted)) {
    const start = formatDay(sorted[0].date);
    const end = formatDay(sorted[sorted.length - 1].date);
    return `${userName}さんが予定を新規入力しました。（${start}～${end}）`;
  }

  const lines = sorted.map((c) => `　　${formatDay(c.date)}：${c.oldStatus}→${c.newStatus}`);
  return `${userName}さんが予定を変更しました。\n${lines.join('\n')}`;
}
