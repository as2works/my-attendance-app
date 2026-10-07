
function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * AI を待たず、変更差分から履歴文をすぐ作る。
 * 管理者が「誰がどこを変えたか」を確実に見られることが優先。
 */
export function buildHistoryMessage(
  userName: string,
  changes: { date: string; oldStatus: string; newStatus: string }[]
): string {
  if (changes.length === 0) {
    return `${userName}さんが予定を確認しました。`;
  }

  const sorted = [...changes].sort((a, b) => a.date.localeCompare(b.date));
  const isNewInput = sorted.every(c => c.oldStatus === '-' || !c.oldStatus);

  if (isNewInput) {
    const start = formatDay(sorted[0].date);
    const end = formatDay(sorted[sorted.length - 1].date);
    return `${userName}さんが予定を新規入力しました。（${start}～${end}）`;
  }

  const lines = sorted.map(c => `　　${formatDay(c.date)}：${c.oldStatus}→${c.newStatus}`);
  return `${userName}さんが予定を変更しました。\n${lines.join('\n')}`;
}
