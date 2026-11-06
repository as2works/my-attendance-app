import React from 'react';

const STATUS_CELL: Record<string, string> = {
  '〇': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '×': 'bg-rose-100 text-rose-700 border-rose-200',
  '△': 'bg-amber-100 text-amber-700 border-amber-200',
  AM: 'bg-sky-100 text-sky-700 border-sky-200',
  PM: 'bg-violet-100 text-violet-700 border-violet-200',
  '': 'bg-white text-slate-300 border-slate-100',
};

/** 管理者パネル共通枠（ヘッダー＋グループ行＋左メニュー） */
export const AdminAppShellMock: React.FC<{
  children: React.ReactNode;
  activeNav?: 'overview' | 'users' | 'groups' | 'config' | 'links' | 'csv';
  highlightCsv?: boolean;
  highlightBadge?: boolean;
  highlightHeader?: 'manual' | 'general' | null;
  highlightGroup?: boolean;
  caption?: string;
}> = ({
  children,
  activeNav = 'overview',
  highlightCsv = false,
  highlightBadge = false,
  highlightHeader = null,
  highlightGroup = false,
  caption = '※ 説明用の画面イメージです（実画面と同じ部品配置）',
}) => {
  const nav = [
    { id: 'overview' as const, i: 'fa-th-list', t: '確認・消込' },
    { id: 'users' as const, i: 'fa-users-cog', t: '利用者管理' },
    { id: 'groups' as const, i: 'fa-layer-group', t: 'グループ' },
    { id: 'config' as const, i: 'fa-cog', t: '期間・休日' },
    { id: 'links' as const, i: 'fa-link', t: '入場URL' },
  ];

  return (
    <div className="relative w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between gap-2 bg-indigo-600 px-3 py-2.5 text-white sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <i className="fas fa-calendar-check shrink-0 text-sm" />
          <span className="truncate text-xs font-bold sm:text-sm">管理者パネル（寮）</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium sm:gap-2 sm:text-xs">
          <span
            className={`hidden sm:inline ${
              highlightHeader === 'manual' ? 'rounded bg-teal-400 px-1.5 py-0.5 font-black text-slate-900' : ''
            }`}
          >
            使い方
          </span>
          <span
            className={`hidden sm:inline ${
              highlightHeader === 'general' ? 'rounded bg-teal-400 px-1.5 py-0.5 font-black text-slate-900' : ''
            }`}
          >
            一般画面へ
          </span>
          <span className="rounded-lg bg-indigo-700 px-2 py-1">
            <i className="fas fa-sign-out-alt" />
          </span>
        </div>
      </div>

      <div className="min-w-0 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm ${
              highlightGroup ? 'ring-2 ring-teal-400' : ''
            }`}
          >
            寮 ▾
          </span>
          <span
            className={`inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-600 ${
              highlightBadge ? 'ring-2 ring-teal-400' : ''
            }`}
          >
            未消込 3
          </span>
          <span className="inline-flex max-w-full break-words rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black leading-snug text-amber-700">
            他グループにも未消込 1
          </span>
        </div>
        <p className="mb-3 break-words text-[10px] font-medium leading-relaxed text-slate-500 sm:text-xs">
          表示・追加・履歴は、いま選んでいる「寮」だけが対象です。
        </p>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="hidden w-36 shrink-0 flex-col gap-2 sm:flex">
            {nav.map((x) => (
              <div
                key={x.id}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${
                  activeNav === x.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'border border-slate-200 bg-white text-slate-500'
                }`}
              >
                <i className={`fas ${x.i}`} />
                {x.t}
              </div>
            ))}
            <div
              className={`mt-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold shadow-md ${
                highlightCsv || activeNav === 'csv'
                  ? 'bg-teal-600 text-white ring-2 ring-teal-300'
                  : 'bg-slate-800 text-white'
              }`}
            >
              <i className="fas fa-file-csv" />
              CSV出力
            </div>
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
      <p className="border-t border-slate-100 bg-white px-3 py-2 text-center text-[11px] font-bold text-slate-400">
        {caption}
      </p>
    </div>
  );
};

export const AdminOverviewScheduleMock: React.FC<{ highlightMonth?: boolean }> = ({
  highlightMonth = false,
}) => {
  const days = [
    { d: 1, w: '月', tone: '' },
    { d: 2, w: '火', tone: '' },
    { d: 3, w: '水', tone: '' },
    { d: 4, w: '木', tone: '' },
    { d: 5, w: '金', tone: '' },
    { d: 6, w: '土', tone: 'bg-blue-50 text-blue-700' },
    { d: 7, w: '日', tone: 'bg-rose-50 text-rose-700' },
  ];
  const rows: Array<{ id: string; name: string; cells: string[] }> = [
    { id: '22', name: '青木　恵', cells: ['〇', '〇', '×', '〇', 'AM', '', ''] },
    { id: '25', name: '加藤　翔', cells: ['〇', '△', '〇', '', '〇', '×', ''] },
    { id: '42', name: '中村　蓮', cells: ['', '〇', '〇', 'PM', '〇', '', '×'] },
  ];

  const mobileDays = days.slice(0, 4);

  const renderRows = (dayCols: typeof days) =>
    rows.map((row) => (
      <tr key={row.id} className="group">
        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-1.5 py-2 font-bold text-slate-700 sm:px-2">
          <div className="hidden text-[9px] font-bold leading-tight text-slate-400 sm:block">{row.id}</div>
          <div className="break-words text-[11px] leading-tight">{row.name}</div>
        </td>
        {dayCols.map((day) => {
          const i = days.indexOf(day);
          const c = row.cells[i] ?? '';
          return (
            <td
              key={`${row.id}-${day.d}`}
              className={`border-b border-r border-slate-100 px-0 py-1.5 text-center last:border-r-0 ${
                day.tone.includes('blue')
                  ? 'bg-blue-50/40'
                  : day.tone.includes('rose')
                    ? 'bg-rose-50/40'
                    : ''
              }`}
            >
              <div
                className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border text-[9px] font-black ${
                  STATUS_CELL[c] ?? STATUS_CELL['']
                } ${!c ? 'border-dashed border-amber-200 bg-amber-50/40' : ''}`}
              >
                {c}
              </div>
            </td>
          );
        })}
      </tr>
    ));

  return (
    <AdminAppShellMock activeNav="overview">
      <div className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <h3 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-800">
            <i className="fas fa-calendar-alt shrink-0 text-indigo-500" />
            <span className="truncate">寮・出勤予定一覧</span>
          </h3>
          <label className="relative w-full min-w-0 flex-1 sm:min-w-[160px]">
            <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
            <span className="block truncate rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-[11px] font-medium text-slate-400">
              氏名・ユーザIDで検索
            </span>
          </label>
          <div
            className={`flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm sm:ml-auto sm:w-auto ${
              highlightMonth ? 'ring-2 ring-teal-400' : ''
            }`}
          >
            <span className="p-1 text-slate-400">
              <i className="fas fa-chevron-left text-[10px]" />
            </span>
            <span className="min-w-0 text-center text-xs font-bold">2026年 12月</span>
            <span className="p-1 text-slate-400">
              <i className="fas fa-chevron-right text-[10px]" />
            </span>
          </div>
        </div>
        <div className="min-w-0 sm:hidden">
          <table className="w-full border-separate border-spacing-0 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-500">
              <tr>
                <th className="w-[88px] border-b border-r border-slate-200 bg-slate-50 px-1.5 py-2">氏名</th>
                {mobileDays.map((day) => (
                  <th
                    key={day.d}
                    className={`border-b border-r border-slate-200 px-0.5 py-1.5 text-center last:border-r-0 ${day.tone}`}
                  >
                    <div className="text-[8px] opacity-70">{day.w}</div>
                    <div className="font-black">{day.d}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderRows(mobileDays)}</tbody>
          </table>
        </div>
        <div className="hidden min-w-0 overflow-x-auto overscroll-x-contain sm:block">
          <table className="w-full border-separate border-spacing-0 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 min-w-[120px] border-b border-r border-slate-200 bg-slate-50 px-2 py-2">
                  ユーザID / 氏名
                </th>
                {days.map((day) => (
                  <th
                    key={day.d}
                    className={`min-w-[32px] border-b border-r border-slate-200 px-0.5 py-1.5 text-center last:border-r-0 ${day.tone}`}
                  >
                    <div className="text-[8px] opacity-70">{day.w}</div>
                    <div className="font-black">{day.d}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderRows(days)}</tbody>
          </table>
        </div>
      </div>
      <div className="mt-2 flex justify-center">
        <div className="h-1.5 w-14 rounded-full bg-slate-300" />
      </div>
      <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-400 shadow-sm">
        <i className="fas fa-history mr-1 text-indigo-400" />
        寮・変更履歴・消込（下に続きます）
      </div>
    </AdminAppShellMock>
  );
};

export const AdminCsvScreenMock: React.FC = () => (
  <AdminAppShellMock activeNav="overview" highlightCsv>
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg">
        <i className="fas fa-file-csv text-lg" />
      </div>
      <p className="text-sm font-black text-slate-800">左メニューの「CSV出力」</p>
      <p className="mt-1 max-w-xs text-xs font-medium leading-relaxed text-slate-600">
        押すと、全グループ・期間分の出勤CSVがダウンロードされます。
      </p>
      <div className="mt-4 w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500">
          出勤確認表_20261201_1530.csv（例）
        </div>
        <div className="grid grid-cols-4 gap-px bg-slate-100 p-px text-[9px] font-bold">
          <div className="bg-white px-2 py-1.5 text-slate-500">ID</div>
          <div className="bg-white px-2 py-1.5 text-slate-500">氏名</div>
          <div className="bg-white px-2 py-1.5 text-slate-500">2026-12-01</div>
          <div className="bg-white px-2 py-1.5 text-slate-500">2026-12-02</div>
          <div className="bg-white px-2 py-1.5">22</div>
          <div className="bg-white px-2 py-1.5">青木　恵</div>
          <div className="bg-white px-2 py-1.5 text-emerald-700">〇</div>
          <div className="bg-white px-2 py-1.5 text-rose-700">×</div>
        </div>
      </div>
    </div>
  </AdminAppShellMock>
);

export const AdminLinksScreenMock: React.FC<{ highlightGeneral?: boolean }> = ({
  highlightGeneral = true,
}) => (
  <AdminAppShellMock activeNav="links">
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800">管理者用（他の人に送らない）</p>
            <p className="mt-1 break-all font-mono text-[11px] font-bold leading-relaxed text-indigo-700">
              https://example.amplifyapp.com/a1b2c3d4-e5f6-7890-abcd-ef1234567890
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-black text-white">
              コピー
            </span>
            <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700">
              再発行
            </span>
          </div>
        </div>
      </div>

      <div
        className={`rounded-2xl border bg-white p-4 shadow-sm ${
          highlightGeneral
            ? 'border-teal-300 ring-2 ring-teal-200'
            : 'border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800">一般用・寮</p>
            <p className="mt-1 break-all font-mono text-[11px] font-bold leading-relaxed text-indigo-700">
              https://example.amplifyapp.com/f1e2d3c4-b5a6-7980-1234-567890abcdef
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-xl bg-teal-600 px-3 py-2 text-[11px] font-black text-white shadow">
              コピー
            </span>
            <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700">
              再発行
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm opacity-80">
        <p className="text-sm font-black text-slate-800">一般用・日勤</p>
        <p className="mt-1 break-all font-mono text-[11px] font-bold text-indigo-700">
          https://example.amplifyapp.com/99887766-5544-3322-1100-aabbccddeeff
        </p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-medium leading-relaxed text-amber-900">
        再発行には、最初に渡された専用パスワードが必要です（普段の入場とは別です）。
      </div>
    </div>
  </AdminAppShellMock>
);

/** 期間・休日（実画面に近い） */
export const AdminConfigScreenMock: React.FC<{
  highlightDates?: boolean;
  highlightSave?: boolean;
}> = ({ highlightDates = true, highlightSave = false }) => (
  <AdminAppShellMock activeNav="config">
    <div className="mx-auto max-w-xl space-y-3">
      <h3 className="text-sm font-black text-slate-800 sm:text-base">システム設定（全体共通）</h3>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h4 className="text-xs font-black text-slate-800 sm:text-sm">シーズン期間</h4>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">
            この期間内だけ、一般ユーザーが予定を編集できます。
          </p>
        </div>
        <div
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            highlightDates ? 'rounded-xl ring-2 ring-teal-400' : ''
          }`}
        >
          <div>
            <p className="mb-1 text-[10px] font-black text-slate-700 sm:text-xs">シーズン開始日</p>
            <div className="rounded-xl border-2 border-slate-100 bg-white px-3 py-2.5 text-xs font-black text-slate-800">
              2026-12-01
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black text-slate-700 sm:text-xs">シーズン終了日</p>
            <div className="rounded-xl border-2 border-slate-100 bg-white px-3 py-2.5 text-xs font-black text-slate-800">
              2027-03-31
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-indigo-500 bg-indigo-600">
            <i className="fas fa-check text-[8px] text-white" />
          </span>
          <div>
            <p className="text-xs font-black text-slate-800">ユーザIDを表示する</p>
            <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500">
              OFFにすると一覧からユーザID列を隠します（CSVのID列は残ります）。
            </p>
          </div>
        </div>
        <div
          className={`flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-black text-white shadow-md shadow-emerald-100 sm:text-sm ${
            highlightSave ? 'ring-2 ring-teal-400' : ''
          }`}
        >
          <i className="fas fa-save" />
          期間・表示設定を保存する
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h4 className="text-xs font-black text-slate-800 sm:text-sm">休日設定（赤表示）</h4>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">
            祝日など、日曜と同じく赤く見せる日を登録します。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 rounded-xl border-2 border-slate-100 px-3 py-2.5 text-xs font-bold text-slate-400">
            日付を選ぶ
          </div>
          <span className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-xs font-black text-white">
            追加して保存
          </span>
        </div>
        <div className="divide-y divide-slate-50 overflow-hidden rounded-xl border border-slate-100">
          {['2026-12-23', '2027-01-01'].map((d) => (
            <div key={d} className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-black text-rose-600">{d}</span>
              <span className="text-[10px] font-bold text-slate-400">削除</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </AdminAppShellMock>
);

/** グループ管理（実画面に近い） */
export const AdminGroupsScreenMock: React.FC<{ highlightLodging?: boolean }> = ({
  highlightLodging = true,
}) => (
  <AdminAppShellMock activeNav="groups">
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-black text-slate-800 sm:text-base">グループ管理</h3>
        <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-slate-500 sm:text-xs">
          追加すると一般用入場URLが自動作成されます。
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black text-slate-800">グループを追加</p>
        <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-400">
          グループ名（例: 第2寮）
        </div>
        <div
          className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 ${
            highlightLodging ? 'bg-teal-50 ring-2 ring-teal-400' : ''
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded border border-indigo-500 bg-indigo-600">
            <i className="fas fa-check text-[8px] text-white" />
          </span>
          寮用記号あり（入寮・退寮）
        </div>
        <div className="rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-black text-white">
          追加する
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {[
          { name: '寮', lodging: true },
          { name: '日勤', lodging: false },
        ].map((g) => (
          <div
            key={g.name}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm font-black text-slate-800">{g.name}</p>
              <p
                className={`mt-0.5 text-[10px] font-bold ${
                  g.lodging ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                {g.lodging ? '寮用記号あり（in / out）' : '寮用記号なし'}
              </p>
            </div>
            <div className="flex gap-1.5">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-500">
                編集
              </span>
              <span className="rounded-lg border border-slate-100 px-2 py-1.5 text-[10px] text-slate-300">
                <i className="fas fa-arrow-up" />
              </span>
              <span className="rounded-lg border border-slate-100 px-2 py-1.5 text-[10px] text-slate-300">
                <i className="fas fa-arrow-down" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </AdminAppShellMock>
);

/** 利用者管理（実画面に近い） */
export const AdminUsersScreenMock: React.FC<{ highlightCsv?: boolean }> = ({
  highlightCsv = false,
}) => (
  <AdminAppShellMock activeNav="users">
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-black text-slate-800 sm:text-base">寮の利用者名簿</h3>
        <p className="text-[10px] font-bold text-slate-400">ユーザID・氏名の編集・並べ替えなど</p>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-400 sm:w-28">
            ユーザID
          </div>
          <div className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-400">
            追加する名前
          </div>
          <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 sm:w-24">
            寮 ▾
          </div>
          <span className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-xs font-black text-white shadow">
            <i className="fas fa-plus mr-1" />
            追加
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-medium text-slate-400">
            ユーザIDは出勤・給与システム連携用です。未設定でも追加できます。
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700 ${
              highlightCsv ? 'ring-2 ring-teal-400' : ''
            }`}
          >
            <i className="fas fa-file-csv" />
            CSV取込
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {[
          { n: 1, id: '22', name: '青木　恵' },
          { n: 2, id: '25', name: '加藤　翔' },
          { n: 3, id: '42', name: '中村　蓮' },
        ].map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-black text-slate-400">
                {u.n}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400">{u.id}</p>
                <p className="truncate text-sm font-black text-slate-700">{u.name}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-600">
                編集
              </span>
              <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1.5 text-[10px] font-bold text-indigo-600">
                グループ移動
              </span>
              <span className="rounded-lg px-2 py-1.5 text-[10px] text-rose-300">
                <i className="fas fa-trash-alt" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </AdminAppShellMock>
);

/** 確認・消込の下段：履歴・消込（実画面に近い） */
export const AdminHistoryScreenMock: React.FC<{
  highlight?: 'badge' | 'checkbox';
}> = ({ highlight = 'badge' }) => (
  <div className="relative w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)]">
    <div className="flex items-center justify-between gap-2 bg-indigo-600 px-3 py-2.5 text-white sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <i className="fas fa-calendar-check shrink-0 text-sm" />
        <span className="truncate text-xs font-bold sm:text-sm">管理者パネル（寮）</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium sm:text-xs">
        <span className="hidden sm:inline">使い方</span>
        <span className="hidden sm:inline">一般画面へ</span>
        <span className="rounded-lg bg-indigo-700 px-2 py-1">
          <i className="fas fa-sign-out-alt" />
        </span>
      </div>
    </div>

    <div className="min-w-0 p-3 sm:p-4">
      <div className="relative mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
          寮 ▾
        </span>
        <span
          className={`inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-600 ${
            highlight === 'badge' ? 'ring-2 ring-teal-400' : ''
          }`}
        >
          未消込 3
        </span>
        <span className="inline-flex max-w-full break-words rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black leading-snug text-amber-700">
          他グループにも未消込 1
        </span>
        {highlight === 'badge' && (
          <span className="w-full rounded-xl bg-teal-600 px-2.5 py-1.5 text-center text-[11px] font-bold leading-snug text-white shadow-lg sm:absolute sm:-top-8 sm:left-28 sm:w-auto sm:text-left">
            ここの数字を見る
            <span className="absolute left-1/2 top-full hidden h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-teal-600 sm:left-6 sm:block sm:translate-x-0" />
          </span>
        )}
      </div>
      <p className="mb-3 break-words text-[10px] font-medium leading-relaxed text-slate-500 sm:text-xs">
        表示・追加・履歴は、いま選んでいる「寮」だけが対象です。
      </p>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="hidden w-36 shrink-0 flex-col gap-2 sm:flex">
          <div className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-100">
            <i className="fas fa-th-list" />
            確認・消込
          </div>
          {[
            { i: 'fa-users-cog', t: '利用者管理' },
            { i: 'fa-layer-group', t: 'グループ' },
            { i: 'fa-cog', t: '期間・休日' },
            { i: 'fa-link', t: '入場URL' },
          ].map((x) => (
            <div
              key={x.t}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-500"
            >
              <i className={`fas ${x.i}`} />
              {x.t}
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-bold text-white shadow-md">
            <i className="fas fa-file-csv" />
            CSV出力
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-3 py-2 text-[11px] font-bold text-slate-600">
              寮・出勤予定一覧
            </div>
            <div className="px-3 py-4 text-center text-[10px] font-bold text-slate-300">
              （予定の表がここにあります）
            </div>
          </div>
          <div className="mb-2 flex justify-center">
            <div className="h-1.5 w-14 rounded-full bg-slate-300" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-3 sm:px-4">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-800">
                <i className="fas fa-history shrink-0 text-indigo-500" />
                <span className="truncate">寮・変更履歴・消込</span>
              </h3>
              <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="flex h-3 w-3 items-center justify-center rounded border border-slate-300 bg-white" />
                完了分も表示
              </label>
            </div>
            <div className="space-y-3 bg-slate-50/10 p-3 sm:p-4">
              <div
                className={`relative rounded-xl border border-indigo-100 bg-white p-3 shadow-sm ring-1 ring-indigo-50 sm:p-4 ${
                  highlight === 'checkbox' ? 'ring-2 ring-teal-400' : ''
                }`}
              >
                {highlight === 'checkbox' && (
                  <span className="absolute -top-9 right-2 z-10 rounded-xl bg-teal-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg">
                    右の□で消込
                    <span className="absolute right-6 top-full h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-teal-600" />
                  </span>
                )}
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-grow">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">
                        Update
                      </span>
                      <span className="text-sm font-black text-slate-800 underline decoration-slate-200 underline-offset-2">
                        山田 太郎
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        <i className="far fa-clock mr-1" />
                        12月5日 14:20
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
                      山田 太郎: 12/5 を「-」→「〇」に変更
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm ${
                        highlight === 'checkbox' ? 'ring-2 ring-teal-500' : ''
                      }`}
                    />
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">
                      未消込
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3 opacity-50 shadow-sm grayscale-[0.5] sm:p-4">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-grow">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">
                        Update
                      </span>
                      <span className="text-sm font-black text-slate-800 underline decoration-slate-200 underline-offset-2">
                        佐藤 花子
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        <i className="far fa-clock mr-1" />
                        12月4日 09:05
                      </span>
                    </div>
                    <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
                      佐藤 花子: 備考を更新
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500 bg-indigo-600 text-white shadow-sm">
                      <i className="fas fa-check text-xs" />
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
                      完了
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p className="border-t border-slate-100 bg-white px-3 py-2 text-center text-[11px] font-bold text-slate-400">
      ※ 説明用の画面イメージです（実画面と同じ部品配置）
    </p>
  </div>
);
