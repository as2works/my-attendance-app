import React from 'react';
import { generalManualHref } from '../../services/manualPath';
import { EditScheduleScreenMock } from './generalMocks';
import {
  DarkRecap,
  ManualShell,
  PageHero,
  StepCard,
  SummaryList,
  WarnBox,
} from './generalShared';

const GeneralManualNote: React.FC = () => (
  <ManualShell slug="note" pageTitle="備考の書き方">
    <PageHero
      badge="連絡メモ"
      title={
        <>
          〇や×だけでは
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            伝えにくいこと
          </span>
        </>
      }
      lead={
        <>
          「備考を書く」は、短いメモを残す場所です。
          <br />
          予定の登録とは、べつの操作です。
        </>
      }
    />

    <SummaryList
      items={[
        { n: 1, title: '「備考を書く」を開く', desc: '編集画面の上のあたりにあります' },
        { n: 2, title: '内容を書いて保存する', desc: '備考用の保存ボタンがあります' },
        { n: 3, title: '予定も忘れず登録する', desc: '〇や×を変えたなら、青い「登録する」も押します' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          どんなときに使う？
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          〇や×だけでは足りない連絡があるときに、ここに書いてください。
        </p>
        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500">
          予定を入れる画面の、上の方に「備考を書く」があります。その下に日付と〇×ボタンが続きます。
        </p>
        <div className="mx-auto mt-6 w-full max-w-md">
          <EditScheduleScreenMock highlightNote />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          いちばん大切な注意
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          備考を書いただけでは、出勤の〇×は変わりません。
          <br />
          予定を変えたときは、必ず青い
          <strong className="text-indigo-700">「登録する」</strong>
          も押してください。
        </p>
        <div className="mt-4">
          <WarnBox>
            備考の保存と、予定の「登録する」は別々です。
            <br />
            どちらも必要なときは、両方やってください。
          </WarnBox>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">
          予定の入れ方のくわしい手順は
          <a
            href={generalManualHref('register')}
            className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
          >
            こちら
          </a>
          です。
        </p>
      </StepCard>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 「備考を書く」を開く</li>
        <li>2. 書いて備考を保存する</li>
        <li>
          3. <span className="text-teal-300">予定も変えたら「登録する」</span>
        </li>
      </ol>
    </DarkRecap>
  </ManualShell>
);

export default GeneralManualNote;
