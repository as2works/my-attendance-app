import React from 'react';
import { adminManualHref, GENERAL_MANUAL_PATH } from '../../services/manualPath';
import { AdminAppShellMock, AdminOverviewScheduleMock } from './adminMocks';
import {
  AdminManualShell,
  CheckList,
  DocGoals,
  PageHero,
  RelatedLinks,
  StepCard,
  WarnBox,
} from './generalShared';

const AdminManualTour: React.FC = () => (
  <AdminManualShell slug="tour" pageTitle="画面の全体像">
    <PageHero
      badge="はじめて読む"
      title={
        <>
          管理者パネルの
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            画面の全体像
          </span>
        </>
      }
      lead={
        <>
          管理者用URLで開いたあとの画面です。メニューと操作が多く、一般向けより複雑です。
          <br />
          まず「どこに何があるか」「何がいまのグループだけか」を押さえてください。
        </>
      }
    />

    <DocGoals
      items={[
        '左メニューとヘッダーの役割を把握する',
        'グループ切替と未消込バッジの意味を理解する',
        '「いまのグループだけ」と「全グループ共通の設定」の違いを区別する',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          画面の地図
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          管理者パネルは、だいたい次の部品でできています。
        </p>
        <ul className="mt-4 space-y-3 text-sm font-medium leading-relaxed text-slate-700">
          <li>
            <strong className="text-slate-900">ヘッダー</strong>
            … 画面タイトル、「使い方」「一般画面へ」、ログアウト
          </li>
          <li>
            <strong className="text-slate-900">グループ切替</strong>
            … いま操作するグループ（例: 寮／日勤）
          </li>
          <li>
            <strong className="text-slate-900">未消込バッジ</strong>
            … まだ見ていない連絡の目安
          </li>
          <li>
            <strong className="text-slate-900">左メニュー</strong>
            … 確認・消込／利用者／グループ／期間・休日／入場URL／CSV出力
          </li>
        </ul>
        <div className="mt-6">
          <AdminAppShellMock highlightGroup highlightBadge highlightHeader="general">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-xs font-bold text-slate-400">
              ここに、選んだメニューの内容が出ます
            </div>
          </AdminAppShellMock>
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          左メニューの役割
        </h2>
        <div className="mt-4 space-y-3">
          {[
            {
              t: '確認・消込',
              d: '毎日いちばん見る場所。上に予定一覧、下に変更履歴と消込があります。',
            },
            {
              t: '利用者管理',
              d: '名前の追加・編集・並べ替え・グループ移動・削除、CSV取込。',
            },
            {
              t: 'グループ',
              d: 'グループの追加・名前変更・寮記号（in/out）・並べ替え・削除。',
            },
            {
              t: '期間・休日',
              d: '入力できる期間、休日の赤表示、ユーザIDの表示／非表示。全グループ共通です。',
            },
            {
              t: '入場URL',
              d: '管理者用・一般用URLのコピーと再発行。',
            },
            {
              t: 'CSV出力',
              d: 'メニュー下のボタン。全グループ×期間分の出勤CSVをダウンロードします。',
            },
          ].map((row) => (
            <div
              key={row.t}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
            >
              <p className="font-display text-sm font-extrabold text-slate-900">{row.t}</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">{row.d}</p>
            </div>
          ))}
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          「いまのグループだけ」と「全グループ共通」
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          ここを取り違えると、「人がいない」「履歴が足りない」と感じやすいです。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
            <p className="text-xs font-bold text-teal-800">いま選んでいるグループだけ</p>
            <ul className="mt-2 space-y-1.5 text-sm font-medium leading-relaxed text-slate-700">
              <li>・予定一覧</li>
              <li>・変更履歴・消込</li>
              <li>・利用者名簿の表示・追加先の見え方</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">全グループ共通</p>
            <ul className="mt-2 space-y-1.5 text-sm font-medium leading-relaxed text-slate-700">
              <li>・期間・休日・ユーザID表示</li>
              <li>・CSV出力（全グループ分）</li>
              <li>・入場URL一覧</li>
            </ul>
          </div>
        </div>
        <div className="mt-4">
          <WarnBox>
            画面上にも「表示・追加・履歴は、いま選んでいるグループだけが対象です」と出ます。
            <br />
            別グループを見るときは、必ずグループ切替を変えてください。
          </WarnBox>
        </div>
        <div className="mt-6">
          <AdminOverviewScheduleMock />
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          未消込バッジ
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          赤い「未消込」は、いまのグループでまだ消込していない連絡の数です。
          <br />
          黄色い「他グループにも未消込」は、ほかのグループ側に残りがあるときの目安です。
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
          消込の手順は
          <a
            href={adminManualHref('daily')}
            className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
          >
            毎日の確認と消込
          </a>
          で詳しく説明します。消込は「見たよ」の印で、予定そのものは変わりません。
        </p>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          ヘッダーの「一般画面へ」「使い方」
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          <strong className="text-slate-900">一般画面へ</strong>
          … 入力する人と同じ画面に切り替わります。空欄を自分で埋めるときに使います。戻るときは「管理者画面へ」です。
        </p>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          <strong className="text-slate-900">使い方</strong>
          … この管理者ガイド（ログイン不要）を新しいタブで開きます。
        </p>
        <div className="mt-4">
          <AdminAppShellMock highlightHeader="general">
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-sm font-medium leading-relaxed text-slate-600">
              予定一覧は管理者パネル上では直接マスをクリックして編集できません。
              直すときは「一般画面へ」へ進みます。くわしくは
              <a
                href={adminManualHref('edit')}
                className="mx-1 font-bold text-teal-700 underline"
              >
                一般画面で予定を直す
              </a>
              へ。
            </div>
          </AdminAppShellMock>
        </div>
      </StepCard>

    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('daily'), label: '毎日の確認と消込', note: 'いちばんよく使う画面' },
        { href: adminManualHref('setup'), label: 'シーズン準備の流れ', note: '開始時の順番' },
        { href: GENERAL_MANUAL_PATH, label: 'みなさん向けガイド', note: '入力する人へ渡す' },
      ]}
    />

    <CheckList
      items={[
        '左メニュー6系統の役割が言える',
        'グループ切替の対象範囲が分かる',
        '未消込バッジの意味が分かる',
        '予定のマス編集は「一般画面へ」だと分かる',
      ]}
    />
  </AdminManualShell>
);

export default AdminManualTour;
