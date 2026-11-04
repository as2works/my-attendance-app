import React from 'react';
import { adminManualHref, GENERAL_MANUAL_PATH } from '../../services/manualPath';
import { AdminManualShell, DarkRecap, PageHero, StepCard, WarnBox } from './generalShared';

const items: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: '期間を変えたのに、一覧が古い月のまま',
    a: (
      <>
        表示中の月は、期間を保存しただけでは自動では変わりません。
        <br />
        月の矢印で動かすか、ページを再読み込みしてください。
        最初に開く月の決まり方は、期間の内側なら当月、期間前なら開始月、期間後なら終了月です。
      </>
    ),
  },
  {
    q: '一覧の読み込みが遅い',
    a: (
      <>
        グループの人数が多いと、予定を一人ずつ取りにいくため、最初の表示に時間がかかることがあります。
        <br />
        可能ならグループを分けて人数を抑えると、待ち時間が短くなりやすいです。
      </>
    ),
  },
  {
    q: 'CSVが出せない／空に見える',
    a: (
      <>
        期間・休日が正しく保存されているか確認してください。
        <br />
        期間外だと出せないことがあります。利用者の予定がまだ空なら、CSVの日付マスも空欄になります。
      </>
    ),
  },
  {
    q: '一般用URLを開いても「ページが見つかりません」',
    a: (
      <>
        URLの再発行あとに古いリンクを開いている可能性があります。
        <br />
        「リンク」画面で最新のURLをコピーして配り直してください。
      </>
    ),
  },
  {
    q: 'CSV取込で名前がぶつかる',
    a: (
      <>
        同じ氏名がすでにいると、画面で上書きなどの確認が出ます。
        <br />
        案内に従って、どちらを残すか選んでください。迷ったら手入力の修正でも大丈夫です。
      </>
    ),
  },
  {
    q: '一般画面から管理者に戻ったら一覧が古い',
    a: (
      <>
        戻ったときに再取得しますが、表示月が違うと空に見えることがあります。
        <br />
        月を合わせるか、再読み込みしてください。
      </>
    ),
  },
  {
    q: '入力する人に何を渡せばいい？',
    a: (
      <>
        そのグループの一般用URLと、
        <a
          href={GENERAL_MANUAL_PATH}
          className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
        >
          みなさん向けガイド
        </a>
        を渡すと伝わりやすいです。「自分の名前で登録する」「最後に登録するを押す」を口頭でも伝えてください。
      </>
    ),
  },
];

const AdminManualFaq: React.FC = () => (
  <AdminManualShell slug="faq" pageTitle="困ったとき">
    <PageHero
      badge="困ったとき"
      title={
        <>
          うまくいかないときは
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            ここを見てください
          </span>
        </>
      }
      lead="期間の変更・速さ・URL切れなど、管理者でよくある確認ポイントです。"
    />

    <div className="mb-8">
      <WarnBox>
        期間を変えたあとに月がずれることと、大人数グループで遅いことは、設計上よく出ます。
        <br />
        まず下の Q1・Q2 を見てください。
      </WarnBox>
    </div>

    <div className="space-y-4">
      {items.map((item, i) => (
        <StepCard key={item.q} emphasize={i < 2}>
          <p className="text-xs font-bold text-teal-700">Q{i + 1}</p>
          <h2 className="mt-1 font-display text-lg font-extrabold text-slate-900 sm:text-xl">
            {item.q}
          </h2>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">{item.a}</p>
        </StepCard>
      ))}
    </div>

    <DarkRecap label="準備から見直すとき">
      <p className="font-medium leading-relaxed">
        <a href={adminManualHref('setup')} className="text-teal-300 underline underline-offset-2">
          シーズン準備の流れ
        </a>
        に戻って、期間 → グループ → 利用者 → URL の順を確認すると早いです。
      </p>
    </DarkRecap>
  </AdminManualShell>
);

export default AdminManualFaq;
