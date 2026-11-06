import React from 'react';
import { adminManualHref, GENERAL_MANUAL_PATH } from '../../services/manualPath';
import {
  AdminManualShell,
  CheckList,
  DocGoals,
  PageHero,
  RelatedLinks,
  StepCard,
  WarnBox,
} from './generalShared';

type FaqItem = {
  symptom: string;
  cause: string;
  steps: string[];
  link?: { href: string; label: string };
};

const items: FaqItem[] = [
  {
    symptom: '期間を変えたのに、一覧が古い月のまま',
    cause:
      '表示中の月は、期間の保存だけでは自動更新されません。初期の「開いたときの月」の決まり方と、いま見ている月は別物です。',
    steps: [
      '予定表の左右矢印で月を動かす',
      'それでもおかしければページを再読み込みする',
      '期間の開始・終了が意図どおりか「期間・休日」で確認する',
    ],
    link: { href: adminManualHref('season'), label: '期間・休日・表示設定' },
  },
  {
    symptom: '一覧の読み込みが遅い',
    cause:
      'グループの人数が多いと、予定の取得に時間がかかることがあります。設計上、大人数ほど待ちやすいです。',
    steps: [
      '可能ならグループを分けて、1グループの人数を抑える',
      '検索で見る人を絞る',
      '通信環境を確認し、時間をおいて再読み込みする',
    ],
  },
  {
    symptom: 'CSVが出せない／中身がスカスカ',
    cause:
      '期間が未設定・不正だとダウンロードできません。期間は正しいのにスカスカなら、そもそも予定が未入力のことが多いです。',
    steps: [
      '期間・休日が保存されているか確認する',
      'もう一度「CSV出力」を試す',
      '確認・消込で空欄が多いか見て、入力依頼を出す',
    ],
    link: { href: adminManualHref('csv'), label: '出勤CSVを出す' },
  },
  {
    symptom: '一般用／管理者用URLを開いても「ページが見つかりません」',
    cause: '再発行後に古いリンクを開いているか、URLの欠け・誤コピーが多いです。',
    steps: [
      '入場URL画面で最新をコピーし直す',
      '手元のブックマークが古くないか確認する',
      '再発行した直後なら、配り直しが完了しているか確認する',
    ],
    link: { href: adminManualHref('links'), label: '入場URLと再発行' },
  },
  {
    symptom: '消込したのに予定の〇×が変わらない',
    cause: '消込は「連絡を見た」印です。予定データは変わりません。',
    steps: [
      '予定を直したいなら「一般画面へ」で編集し、「登録する」を押す',
      '履歴の内容が想定と違うなら、完了分も表示して確認する',
    ],
    link: { href: adminManualHref('edit'), label: '一般画面で予定を直す' },
  },
  {
    symptom: '一般画面から管理者に戻ったら、一覧が空／古い',
    cause: '戻ったあとに再取得しますが、表示月が違うと空に見えたり、古い月を見ていることがあります。',
    steps: ['月送りで対象月に合わせる', '必要なら再読み込みする'],
    link: { href: adminManualHref('daily'), label: '毎日の確認と消込' },
  },
  {
    symptom: 'CSV取込で名前やグループがぶつかる',
    cause: '既存名簿との一致判定や、CSV内の重複があると同じ氏名・グループで確認画面が出ます。',
    steps: [
      '画面の案内に従って上書き／新規／キャンセルを選ぶ',
      '同じIDで中身が違う行がある場合はCSVを直してやり直す',
      '少人数なら手入力に切り替える',
    ],
    link: { href: adminManualHref('users'), label: '利用者を登録する' },
  },
  {
    symptom: 'グループを消したらURLが使えなくなった',
    cause: 'グループ削除時、そのグループの一般用入場URLは無効になります。',
    steps: [
      '入場URL画面で、残っているグループのURLを確認する',
      '必要な人に新しい一般用URLを配る',
      '利用者の移動先グループが意図どおりか確認する',
    ],
    link: { href: adminManualHref('groups'), label: 'グループを整える' },
  },
  {
    symptom: '入力する人に何を渡せばいい？',
    cause: '権限はURL単位です。一般用URLとそのグループ向けの説明が必要です。',
    steps: [
      'そのグループの一般用URLを渡す',
      'みなさん向けガイドを渡す',
      '「自分の名前で入れる」「最後に登録するを押す」を口頭でも伝える',
    ],
    link: { href: GENERAL_MANUAL_PATH, label: 'みなさん向けガイド' },
  },
  {
    symptom: '再発行用パスワードが分からない',
    cause:
      '再発行用パスワードは、最初に管理者へ渡された控えないと後から画面では見えません。普段の入場用URLとは別物です。',
    steps: [
      '最初に渡された控（メモ・メール・紙）を探す',
      '「再発行パスワードを変更」で新しくしたあとの控がないか確認する',
      'それでも分からない場合は、管理者用URLを渡した担当者に問い合わせる',
    ],
    link: { href: adminManualHref('links'), label: '入場URLと再発行' },
  },
];

const AdminManualFaq: React.FC = () => (
  <AdminManualShell slug="faq" pageTitle="困ったとき">
    <PageHero
      badge="困ったとき"
      title={
        <>
          症状から探す
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            確認手順
          </span>
        </>
      }
      lead="うまくいかないときは、下の症状に近いものを開き、原因と手順の順で確認してください。"
    />

    <DocGoals
      items={[
        'よくある症状の原因を切り分けられる',
        '関連する詳細ページへ進める',
        '準備の順番に戻って見直せる',
      ]}
    />

    <div className="mb-8">
      <WarnBox>
        期間変更後の月ずれと、大人数グループの遅さは設計上よく出ます。
        <br />
        まず上の2つ（月・速さ）を見てから、ほかを当たると早いです。
      </WarnBox>
    </div>

    <div className="space-y-4">
      {items.map((item, i) => (
        <StepCard key={item.symptom} emphasize={i < 2}>
          <p className="text-xs font-bold text-teal-700">症状 {i + 1}</p>
          <h2 className="mt-1 font-display text-lg font-extrabold text-slate-900 sm:text-xl">
            {item.symptom}
          </h2>
          <p className="mt-3 text-sm font-bold text-slate-500">考えられる原因</p>
          <p className="mt-1 text-base font-medium leading-relaxed text-slate-700">{item.cause}</p>
          <p className="mt-4 text-sm font-bold text-slate-500">確認手順</p>
          <ol className="mt-2 space-y-1.5">
            {item.steps.map((s, idx) => (
              <li key={s} className="text-base font-medium leading-relaxed text-slate-700">
                {idx + 1}. {s}
              </li>
            ))}
          </ol>
          {item.link && (
            <p className="mt-3 text-sm font-medium">
              くわしくは
              <a
                href={item.link.href}
                className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
              >
                {item.link.label}
              </a>
            </p>
          )}
        </StepCard>
      ))}
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('setup'), label: 'シーズン準備の流れ', note: '最初から見直す' },
        { href: adminManualHref('tour'), label: '画面の全体像' },
        { href: adminManualHref('daily'), label: '毎日の確認と消込' },
      ]}
    />

    <CheckList
      label="それでもだめなとき"
      items={[
        '最新の入場URLで開き直した',
        '期間・グループ・利用者が意図どおりか確認した',
        '別のブラウザ／端末でも再現するか見た',
        '再現手順（どの画面・どの操作）を控えた',
      ]}
    />
  </AdminManualShell>
);

export default AdminManualFaq;
