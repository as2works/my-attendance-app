import React from 'react';
import { adminManualHref, GENERAL_MANUAL_PATH } from '../../services/manualPath';
import { AdminCsvScreenMock, AdminOverviewScheduleMock } from './adminMocks';
import {
  AdminManualShell,
  DarkRecap,
  PageHero,
  StepCard,
  SummaryList,
  TipCard,
  WarnBox,
} from './generalShared';

export const AdminManualOverview: React.FC = () => (
  <AdminManualShell slug="overview" pageTitle="予定一覧で確認する">
    <PageHero
      badge="毎日・よく使う"
      title={
        <>
          予定が集まっているか
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            一覧で確認する
          </span>
        </>
      }
      lead={
        <>
          左メニューの「確認・消込」が、いちばんよく見る画面です。
          <br />
          グループと月を選んで、入力の進み方を見ます。
        </>
      }
    />

    <SummaryList
      items={[
        { n: 1, title: 'グループを選ぶ', desc: '画面上のグループ切替で見たいグループにします' },
        { n: 2, title: '月を合わせる', desc: '左右の矢印で月を動かします' },
        { n: 3, title: '空欄を見つける', desc: 'マスが空なら、まだ予定が入っていません' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          グループと月を選ぶ
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          画面上のグループ切替で、見たいグループを選びます。
          <br />
          予定表の右上の矢印で、月を変えます。
        </p>
        <div className="mt-4">
          <WarnBox>
            最初に開いた月は、設定した期間に合わせて決まります。
            <br />
            期間の外の日だと、開始月や終了月から始まることがあります。
          </WarnBox>
        </div>
        <div className="mt-6">
          <AdminOverviewScheduleMock highlightMonth />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          空欄＝まだ入っていない
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          マスが空の日は、まだ予定が入っていません。
          <br />
          自分で直すときは、ヘッダーの「一般画面へ」から入力画面を開きます。
        </p>
        <p className="mt-3 text-sm font-medium text-slate-500">
          入力する人への説明は
          <a
            href={GENERAL_MANUAL_PATH}
            className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
          >
            みなさん向けガイド
          </a>
          を配ると伝わりやすいです。
        </p>
      </StepCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <TipCard title="一般画面へ">
          ヘッダーの「一般画面へ」で、入力する人と同じ画面に切り替えられます。戻るときは「管理者画面へ」です。
        </TipCard>
        <TipCard title="検索">
          名前やユーザIDで絞り込めます。人数が多いときに便利です。
        </TipCard>
      </div>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. グループと月を選ぶ</li>
        <li>2. 空欄がないか見る</li>
        <li>
          3. <span className="text-teal-300">必要なら自分でも編集する</span>
        </li>
      </ol>
    </DarkRecap>
  </AdminManualShell>
);

/** 実画面の「確認・消込」に寄せた説明用モック */
const AdminHistoryScreenMock: React.FC<{
  highlight?: 'badge' | 'checkbox';
}> = ({ highlight = 'badge' }) => (
  <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)]">
    {/* 実アプリのヘッダー */}
    <div className="flex items-center justify-between gap-2 bg-indigo-600 px-3 py-2.5 text-white sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <i className="fas fa-calendar-check text-sm" />
        <span className="truncate text-xs font-bold sm:text-sm">管理者パネル・サンプル箱（寮）</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium sm:text-xs">
        <span className="hidden sm:inline">使い方</span>
        <span>一般画面へ</span>
        <span className="rounded-lg bg-indigo-700 px-2 py-1">
          <i className="fas fa-sign-out-alt" />
        </span>
      </div>
    </div>

    <div className="p-3 sm:p-4">
      {/* グループ＋未消込バッジ（実クラスに近い） */}
      <div className="relative mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
          寮 ▾
        </span>
        <span
          className={`inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black whitespace-nowrap text-rose-600 ${
            highlight === 'badge' ? 'ring-2 ring-teal-400 ring-offset-2' : ''
          }`}
        >
          未消込 3
        </span>
        <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black whitespace-nowrap text-amber-700">
          他グループにも未消込 1
        </span>
        {highlight === 'badge' && (
          <span className="absolute -top-8 left-16 rounded-xl bg-teal-600 px-2.5 py-1.5 text-[11px] font-bold leading-snug text-white shadow-lg sm:left-28">
            ここの数字を見る
            <span className="absolute left-6 top-full h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-teal-600" />
          </span>
        )}
      </div>
      <p className="mb-3 text-[10px] font-medium text-slate-500 sm:text-xs">
        表示・追加・履歴は、いま選んでいる「寮」だけが対象です。
      </p>

      <div className="flex flex-col gap-3 lg:flex-row">
        {/* 左メニュー */}
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

        {/* 右：上に薄い一覧＋下に履歴（実画面と同じ二段） */}
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
                        highlight === 'checkbox' ? 'ring-2 ring-teal-500 ring-offset-1' : ''
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

export const AdminManualHistory: React.FC = () => (
  <AdminManualShell slug="history" pageTitle="連絡・履歴を処理する">
    <PageHero
      badge="毎日・よく使う"
      title={
        <>
          下の履歴を見て
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            消込する
          </span>
        </>
      }
      lead={
        <>
          「確認・消込」画面の下に、変更や連絡の履歴があります。
          <br />
          確認が終わったら、消込します。
        </>
      }
    />

    <SummaryList
      items={[
        { n: 1, title: '未消込の数字を見る', desc: 'グループの横に赤い「未消込」が出ます' },
        { n: 2, title: '下の履歴で内容を確認する', desc: '誰が・いつ・何を変えたかがカードで並びます' },
        { n: 3, title: '右の□で消込する', desc: '済んだらチェック。ラベルが「完了」になります' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          未消込の数字
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          グループ名の横に、赤い
          <strong className="text-rose-600">「未消込」</strong>
          の数が出ます。
          <br />
          数字が残っている＝まだ見ていない連絡がある、という目安です。
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          黄色い「他グループにも未消込」は、いま選んでいないグループ側の残りです。
        </p>
        <div className="mt-6">
          <AdminHistoryScreenMock highlight="badge" />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          消込のしかた
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          履歴カードの
          <strong className="text-slate-900">右にある大きな□</strong>
          を押すと消込できます。
          <br />
          「未消込」が「完了」に変わります。
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          終わったものも見たいときは、右上の「完了分も表示」にチェックを付けます。
        </p>
        <div className="mt-4">
          <WarnBox>
            消込は「見たよ」の印です。予定そのものが消えるわけではありません。
          </WarnBox>
        </div>
        <div className="mt-6">
          <AdminHistoryScreenMock highlight="checkbox" />
        </div>
      </StepCard>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 赤い「未消込」の数字を見る</li>
        <li>2. 下の履歴カードで内容を確認</li>
        <li>
          3. <span className="text-teal-300">右の□を押して消込</span>
        </li>
      </ol>
    </DarkRecap>
  </AdminManualShell>
);

export const AdminManualCsv: React.FC = () => (
  <AdminManualShell slug="csv" pageTitle="出勤CSVを出す">
    <PageHero
      badge="毎日・よく使う"
      title={
        <>
          左メニューから
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            CSVを出す
          </span>
        </>
      }
      lead={
        <>
          出勤や給与のシステムに渡すときなどに使います。
          <br />
          全グループ分が、いまの期間に合わせて出ます。
        </>
      }
    />

    <SummaryList
      items={[
        { n: 1, title: '「CSV出力」を押す', desc: '左メニュー（または画面左）にあります' },
        { n: 2, title: 'ファイルが落ちてくる', desc: 'ダウンロードフォルダなどを確認します' },
        { n: 3, title: '中身を確認する', desc: 'ID・氏名・日付の列が並んでいます' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          押し場所
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          管理者パネルの左メニュー下にある
          <strong className="text-slate-900">「CSV出力」</strong>
          を押します。
        </p>
        <div className="mt-4">
          <WarnBox>
            期間が正しく設定されていないと、出せません。
            <br />
            そのときは
            <a
              href={adminManualHref('season')}
              className="mx-1 font-bold text-teal-800 underline"
            >
              期間・休日
            </a>
            を先に確認してください。
          </WarnBox>
        </div>
        <div className="mt-6">
          <AdminCsvScreenMock />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          出てくるもののイメージ
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          すべてのグループの利用者が、期間中の日付ぶん並びます。
          <br />
          予定が空の日は、マスが空欄になります。
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            出勤確認表_20261201_1530.csv（中身の例）
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 bg-white font-bold text-slate-500">
                  {['ID', '氏名', 'グループ', '2026-12-01', '2026-12-02', '2026-12-03'].map((h) => (
                    <th key={h} className="px-2.5 py-2 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-bold text-slate-700">
                <tr className="border-b border-slate-50">
                  <td className="px-2.5 py-2">22</td>
                  <td className="px-2.5 py-2">青木　恵</td>
                  <td className="px-2.5 py-2">寮</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                  <td className="px-2.5 py-2 text-rose-700">×</td>
                  <td className="px-2.5 py-2 text-sky-700">AM</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="px-2.5 py-2">25</td>
                  <td className="px-2.5 py-2">加藤　翔</td>
                  <td className="px-2.5 py-2">寮</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                  <td className="px-2.5 py-2 text-slate-300">　</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-2">08</td>
                  <td className="px-2.5 py-2">森　あかり</td>
                  <td className="px-2.5 py-2">日勤</td>
                  <td className="px-2.5 py-2 text-violet-700">PM</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                  <td className="px-2.5 py-2 text-amber-700">△</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-3 py-2 text-center text-[11px] font-bold text-slate-400">
            ※ 説明用の画面イメージです（列の並びは実ファイルに近い例）
          </p>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500">
          ユーザIDの列は、出勤・給与システム連携用です。画面でIDを隠していても、CSVには残ります。
        </p>
      </StepCard>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 期間が正しいか確認</li>
        <li>2. 「CSV出力」を押す</li>
        <li>
          3. <span className="text-teal-300">ダウンロードしたファイルを使う</span>
        </li>
      </ol>
    </DarkRecap>
  </AdminManualShell>
);
