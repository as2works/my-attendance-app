import React from 'react';

const STATUS_CELL: Record<string, string> = {
  '〇': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×': 'bg-rose-100 text-rose-700 border-rose-200',
  '△': 'bg-amber-100 text-amber-700 border-amber-200',
  AM: 'bg-sky-100 text-sky-700 border-sky-200',
  PM: 'bg-violet-100 text-violet-700 border-violet-200',
  '': 'bg-white border-slate-100',
};

const EDIT_OPTS = ['〇', '×', '△', 'AM', 'PM', 'in', 'out', '無し'] as const;

/** 一般の出勤予定一覧（実画面に近い） */
export const MainListScreenMock: React.FC<{
  highlightUser?: boolean;
  searchQuery?: string;
  highlightSearch?: boolean;
  highlightMonth?: boolean;
}> = ({
  highlightUser = false,
  searchQuery,
  highlightSearch = false,
  highlightMonth = false,
}) => {
  const days = [
    { d: 18, w: '金', tone: '' },
    { d: 19, w: '土', tone: 'bg-blue-50 text-blue-700' },
    { d: 20, w: '日', tone: 'bg-rose-50 text-rose-700' },
    { d: 21, w: '月', tone: '' },
    { d: 22, w: '火', tone: '' },
  ];
  const rows = [
    { id: '22', name: '青木　恵', you: false, cells: ['〇', '', '×', '〇', 'AM'] },
    { id: '25', name: '山田　太郎', you: true, cells: ['', '△', '', '〇', ''] },
    { id: '42', name: '中村　蓮', you: false, cells: ['〇', '〇', '', 'PM', '×'] },
  ].filter((r) => !searchQuery || r.name.includes(searchQuery));

  // 狭い画面では日付列を減らして、横にはみ出さない
  const visibleDays = days.slice(0, 3);
  const wideDays = days;

  const renderTable = (dayCols: typeof days, compact: boolean) => (
    <table className="w-full border-separate border-spacing-0 text-left text-sm">
      <thead>
        <tr>
          <th
            className={`sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-1.5 py-2 text-[10px] font-semibold text-slate-500 sm:px-2 sm:text-[11px] ${
              compact ? 'w-[96px]' : 'w-[120px] sm:w-[148px]'
            }`}
          >
            {compact ? '氏名' : 'ユーザID / 氏名'}
          </th>
          {dayCols.map((day) => (
            <th
              key={day.d}
              className={`border-b border-r border-slate-100 bg-slate-50 px-0.5 py-1.5 text-center last:border-r-0 ${
                compact ? 'w-[16.5%]' : 'min-w-[40px]'
              } ${day.tone}`}
            >
              <div className="text-[9px] opacity-70">{day.w}</div>
              <div className="text-xs font-bold">{day.d}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="group">
            <td
              className={`sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-1.5 py-2 sm:px-2 ${
                highlightUser && row.you ? 'bg-teal-50 ring-2 ring-inset ring-teal-500' : ''
              }`}
            >
              {!compact && (
                <span className="block truncate text-[10px] font-bold leading-tight text-slate-400">
                  {row.id}
                </span>
              )}
              <span className="mt-0.5 block break-words text-xs font-bold leading-tight text-slate-800 sm:text-sm">
                {row.name}
              </span>
              <div className="mt-1 flex items-center gap-1">
                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-bold text-white sm:text-xs ${
                    highlightUser && row.you
                      ? 'animate-[pulse_2s_ease-in-out_infinite] bg-indigo-600 shadow-md shadow-indigo-100'
                      : 'bg-indigo-600'
                  }`}
                >
                  編集
                </span>
              </div>
            </td>
            {dayCols.map((day) => {
              const c = row.cells[days.indexOf(day)] ?? '';
              return (
                <td
                  key={`${row.id}-${day.d}`}
                  className={`border-b border-r border-slate-100 px-0.5 py-2 text-center last:border-r-0 ${
                    day.tone.includes('blue')
                      ? 'bg-blue-50/40'
                      : day.tone.includes('rose')
                        ? 'bg-rose-50/40'
                        : ''
                  }`}
                >
                  <div
                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md border-2 text-[10px] font-black sm:h-8 sm:w-8 ${
                      STATUS_CELL[c] ?? STATUS_CELL['']
                    }`}
                  >
                    {c}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="relative w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between gap-2 bg-indigo-600 px-3 py-2.5 text-white sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <i className="fas fa-calendar-check shrink-0 text-sm" />
          <span className="truncate text-xs font-bold sm:text-sm">寮・出勤予定一覧</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium sm:text-xs">
          <span>使い方</span>
          <span className="rounded-lg bg-indigo-700 px-2 py-1">
            <i className="fas fa-sign-out-alt" />
          </span>
        </div>
      </div>

      <div className="min-w-0 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div
            className={`flex min-w-0 items-center justify-center gap-2 sm:gap-3 ${
              highlightMonth ? 'rounded-xl ring-2 ring-teal-400' : ''
            }`}
          >
            <span className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <i className="fas fa-chevron-left text-xs text-slate-400" />
            </span>
            <span className="min-w-0 flex-1 text-center text-sm font-bold text-slate-800 sm:text-base">
              2026年 12月
            </span>
            <span className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <i className="fas fa-chevron-right text-xs text-slate-400" />
            </span>
          </div>
          <label
            className={`relative w-full min-w-0 sm:w-56 ${
              highlightSearch ? 'rounded-xl ring-2 ring-teal-400' : ''
            }`}
          >
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <span className="block truncate rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-bold text-slate-800 shadow-sm">
              {searchQuery || '氏名・ユーザIDで検索'}
            </span>
          </label>
        </div>

        {searchQuery && (
          <div className="break-words border-b border-slate-100 bg-white px-3 py-2 text-xs font-bold leading-relaxed text-slate-500 sm:px-4">
            「{searchQuery}」に一致: {rows.length}人 / 全3人
          </div>
        )}

        {/* スマホ: 3日分で枠内に収める / 広い画面: 5日＋横スクロール */}
        <div className="min-w-0 sm:hidden">{renderTable(visibleDays, true)}</div>
        <div className="hidden min-w-0 overflow-x-auto overscroll-x-contain sm:block">
          {renderTable(wideDays, false)}
        </div>
      </div>
      <p className="break-words border-t border-slate-100 bg-white px-3 py-2 text-center text-[11px] font-bold leading-relaxed text-slate-400">
        ※ 説明用の画面イメージです（実画面と同じ部品配置）
      </p>
    </div>
  );
};

/** 予定編集画面（実画面に近い） */
export const EditScheduleScreenMock: React.FC<{
  highlightNote?: boolean;
  highlightSave?: boolean;
  pick?: { date: string; status: string; tone?: string }[];
}> = ({
  highlightNote = false,
  highlightSave = false,
  pick = [
    { date: '1/9（土）', status: '〇', tone: 'text-blue-600' },
    { date: '1/10（日）', status: '×', tone: 'text-rose-600' },
  ],
}) => (
  <div className="relative w-full min-w-0 max-w-md rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)]">
    <div className="flex items-center justify-between gap-2 bg-indigo-600 px-3 py-2.5 text-white">
      <div className="flex min-w-0 items-center gap-2">
        <i className="fas fa-calendar-check shrink-0 text-sm" />
        <span className="truncate text-xs font-bold">山田 太郎 さんの予定編集（寮）</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[10px]">
        <span className="rounded-lg bg-indigo-700 px-2 py-1">
          <i className="fas fa-sign-out-alt" />
        </span>
      </div>
    </div>

    <div className="min-w-0 space-y-2 p-3">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-2 px-3 py-2">
          <span className="min-w-0 flex-1 rounded-lg bg-slate-100 py-2 text-center text-xs font-bold text-slate-700">
            戻る
          </span>
          <span
            className={`min-w-0 flex-1 rounded-lg py-2 text-center text-xs font-black ${
              highlightSave
                ? 'animate-[pulse_1.8s_ease-in-out_infinite] bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-300'
                : 'bg-slate-100 text-slate-300'
            }`}
          >
            <i className="fas fa-check mr-1" />
            登録する
          </span>
        </div>
        {highlightSave && (
          <div className="mx-3 mb-2 break-words rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-bold leading-relaxed text-amber-800">
            未保存です。「登録する」を押してください。
          </div>
        )}
      </div>

      <div
        className={`flex items-center justify-between gap-3 rounded-xl border-2 bg-white px-3 py-2.5 shadow-sm ${
          highlightNote ? 'border-teal-400 ring-2 ring-teal-200' : 'border-slate-200'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <i className={`fas fa-sticky-note shrink-0 ${highlightNote ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="text-sm font-black text-slate-800">備考を書く</span>
          </div>
          <p className="mt-0.5 break-words text-[11px] font-medium leading-relaxed text-slate-500">
            記号で表せない連絡（残業不可・鍵など）があればここへ
          </p>
        </div>
        <i className="fas fa-chevron-right shrink-0 text-slate-300" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-indigo-500 bg-indigo-600">
            <i className="fas fa-check text-[8px] text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800">表示切替</p>
            <p className="break-words text-[11px] font-bold leading-snug text-slate-600">
              入力が必要な日のみ表示中（無し・△のみ表示中）
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {pick.map((row) => (
          <div key={row.date} className="border-b border-slate-100 px-3 py-2.5 last:border-b-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
              <span className={`text-sm font-black ${row.tone || 'text-slate-800'}`}>{row.date}</span>
              {row.status !== '無し' && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[8px] font-black text-indigo-700">
                  変更あり
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {EDIT_OPTS.map((s) => (
                <span
                  key={s}
                  className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border-2 px-1 text-[10px] font-black ${
                    s === row.status
                      ? s === '〇'
                        ? 'scale-105 border-indigo-400 bg-emerald-100 text-emerald-700 ring-2 ring-indigo-400'
                        : s === '×'
                          ? 'border-indigo-400 bg-rose-100 text-rose-700 ring-2 ring-indigo-400'
                          : 'border-indigo-400 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-400'
                      : 'border-slate-100 bg-white text-slate-300'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    <p className="break-words border-t border-slate-100 bg-white px-3 py-2 text-center text-[11px] font-bold leading-relaxed text-slate-400">
      ※ 説明用の画面イメージです（実画面と同じ部品配置）
    </p>
  </div>
);
