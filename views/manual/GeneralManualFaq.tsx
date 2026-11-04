import React from 'react';
import { generalManualHref } from '../../services/manualPath';
import { DarkRecap, ManualShell, PageHero, StepCard, WarnBox } from './generalShared';

const items: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: '〇や×を選んだのに、一覧に残っていない',
    a: (
      <>
        青い「登録する」を押し忘れていませんか。
        <br />
        選んだだけではまだ終わりません。詳しくは
        <a
          href={generalManualHref('register')}
          className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
        >
          予定の入れ方
        </a>
        を見てください。
      </>
    ),
  },
  {
    q: '「未保存です」と出ている',
    a: (
      <>
        まだ登録できていません。
        <br />
        画面の上の青い「登録する」を押してください。
      </>
    ),
  },
  {
    q: '日付がほとんど出てこない',
    a: (
      <>
        「表示切替」にチェックが付いていると、
        <strong>予定がまだ決まっていない日</strong>
        （「無し」や「△」の日）だけが出ます。
        <br />
        〇や×を入れた日も含めて全部見たいときは、そのチェックを外してください。
      </>
    ),
  },
  {
    q: '自分の名前が見つからない',
    a: (
      <>
        画面上の検索欄に、自分の名前を入れてみてください。
        <br />
        それでも無いときは、管理者の人に連絡してください。自分で名前を追加することはできません。
      </>
    ),
  },
  {
    q: '月の矢印が押せない',
    a: (
      <>
        管理者の人が決めた期間の外には進めません。
        <br />
        期間のことで分からないときは、管理者の人に聞いてください。
      </>
    ),
  },
  {
    q: '「期間がありません」と出る',
    a: (
      <>
        いまは入力できる期間が設定されていない状態です。
        <br />
        管理者の人に、期間の設定を確認してもらってください。
      </>
    ),
  },
  {
    q: 'ログアウトしてしまった',
    a: (
      <>
        もう一度、もらった長いURLから開いてください。
        <br />
        URLをなくしたときは、管理者の人にもう一度もらってください。
      </>
    ),
  },
  {
    q: '画面の読み込みが遅い',
    a: (
      <>
        グループの人数が多いと、最初の表示に少し時間がかかることがあります。
        <br />
        しばらく待っても出ないときは、通信状況を確認するか、管理者の人に相談してください。
      </>
    ),
  },
  {
    q: '備考を書いたのに予定が変わらない',
    a: (
      <>
        備考と予定の登録は別です。
        <br />
        〇や×を変えたあとは、必ず「登録する」も押してください。
      </>
    ),
  },
];

const GeneralManualFaq: React.FC = () => (
  <ManualShell slug="faq" pageTitle="困ったとき">
    <PageHero
      badge="よくある質問"
      title={
        <>
          うまくいかないときは
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            ここを見てください
          </span>
        </>
      }
      lead={
        <>
          よくあるつまずきを集めました。
          <br />
          当てはまるものから読んでください。
        </>
      }
    />

    <div className="mb-8">
      <WarnBox>
        いちばん多いのは、「登録する」の押し忘れです。
        <br />
        まずはそこを確認してみてください。
      </WarnBox>
    </div>

    <div className="space-y-4">
      {items.map((item, i) => (
        <StepCard key={item.q} emphasize={i === 0}>
          <p className="text-xs font-bold text-teal-700">Q{i + 1}</p>
          <h2 className="mt-1 font-display text-lg font-extrabold text-slate-900 sm:text-xl">
            {item.q}
          </h2>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">{item.a}</p>
        </StepCard>
      ))}
    </div>

    <DarkRecap label="それでも分からないとき">
      <p className="font-medium leading-relaxed">
        管理者の人に連絡してください。
        <br />
        「どの画面で」「何を押したあと」「どんな表示になったか」を伝えると助かります。
      </p>
    </DarkRecap>
  </ManualShell>
);

export default GeneralManualFaq;
