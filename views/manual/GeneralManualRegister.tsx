import React from 'react';
import { generalManualHref } from '../../services/manualPath';
import { EditScheduleScreenMock, MainListScreenMock } from './generalMocks';
import {
  DarkRecap,
  ManualShell,
  PageHero,
  StepBadge,
  StepCard,
  SummaryList,
  WarnBox,
} from './generalShared';

const GeneralManualRegister: React.FC = () => (
  <ManualShell
    slug="register"
    pageTitle="予定の入れ方"
    headerHref="#steps"
    headerLabel="下の手順へ"
  >
    <PageHero
      badge="はじめに読んでほしいページ"
      title={
        <>
          自分の出勤予定を
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            入れる方法
          </span>
        </>
      }
      lead={
        <>
          やることは、たった3つです。
          <br className="hidden sm:block" />
          パソコンでもスマホでも、やり方は同じです。
        </>
      }
    />

    <SummaryList
      label="このあとの手順（まとめ）"
      items={[
        { n: 1, title: '自分の名前を開く', desc: '名前の一覧から、自分の「編集」を押します' },
        { n: 2, title: '〇や×を選ぶ', desc: '日付ごとに、出勤できるかどうかを選びます' },
        { n: 3, title: '「登録する」を押す', desc: '最後にこのボタンを押さないと、予定は残りません' },
      ]}
    />

    <div id="steps" className="space-y-8 sm:space-y-10">
      <StepCard>
        <div className="mb-3 flex items-center gap-3">
          <StepBadge n={1} />
          <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            自分の名前を開く
          </h2>
        </div>
        <p className="text-base font-medium leading-relaxed text-slate-700">
          まず、名前が並んでいる画面を見ます。
          <br />
          <strong className="text-slate-900">自分の名前の下にある「編集」</strong>
          を押してください。
        </p>
        <div className="mt-4 space-y-2">
          <WarnBox>
            ほかの人の名前は、押さないでください。
            <br />
            自分の名前が見つからないときは、管理者の人に聞いてください。
          </WarnBox>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500">
          名前が多いときは、画面の上の検索（虫眼鏡の欄）に自分の名前を入れると探しやすいです。
        </p>
        <div className="mt-6">
          <MainListScreenMock highlightUser searchQuery="山田" highlightSearch />
        </div>
      </StepCard>

      <StepCard>
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <EditScheduleScreenMock
              pick={[
                { date: '12/5（金）', status: '〇' },
                { date: '12/6（土）', status: '×', tone: 'text-blue-600' },
              ]}
            />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-3">
              <StepBadge n={2} />
              <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
                〇や×を選ぶ
              </h2>
            </div>
            <p className="text-base font-medium leading-relaxed text-slate-700">
              日付の横に、〇や×などのボタンがあります。
              <br />
              <strong className="text-slate-900">その日の予定に合うボタンを押します。</strong>
            </p>
            <p className="mt-3 text-sm font-medium text-slate-500">いちばんよく使うのは、次の3つです。</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { s: '〇', l: '出られる', c: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
                { s: '×', l: '休みたい', c: 'bg-rose-50 text-rose-800 border-rose-100' },
                { s: '△', l: 'まだ未定', c: 'bg-amber-50 text-amber-800 border-amber-100' },
              ].map((x) => (
                <div key={x.s} className={`rounded-xl border px-2 py-2.5 text-center ${x.c}`}>
                  <div className="font-display text-lg font-extrabold">{x.s}</div>
                  <div className="text-[11px] font-bold">{x.l}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              「AM」は午前だけ、「PM」は午後だけ、出られるときです。
              <br />
              「無し」を押すと、まだ決めていない状態に戻ります。
            </p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              寮のグループでは「in」「out」も出ることがあります。
              仕事をしない入寮・退寮の日に使います。くわしくは
              <a
                href={generalManualHref('list')}
                className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
              >
                一覧の見方
              </a>
              を見てください。
            </p>
          </div>
        </div>
      </StepCard>

      <StepCard emphasize>
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <StepBadge n={3} />
              <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
                最後に「登録する」を押す
              </h2>
            </div>
            <p className="text-base font-medium leading-relaxed text-slate-700">
              〇や×を選んだだけでは、まだ終わっていません。
              <br />
              画面の上にある
              <strong className="text-indigo-700">青い「登録する」ボタン</strong>
              を押してください。
            </p>
            <div className="mt-4">
              <WarnBox>
                「未保存です」と出てきたら、まだ登録できていません。
                <br />
                必ず「登録する」を押してから、画面を閉じてください。
              </WarnBox>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">
              「登録する」を押すと、最初の一覧の画面に戻ります。それで完了です。
            </p>
          </div>
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <EditScheduleScreenMock highlightSave />
          </div>
        </div>
      </StepCard>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <h3 className="font-display text-sm font-extrabold text-slate-900">
            日付が少ないように見えるとき
          </h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            「表示切替」にチェックが付いていると、予定がまだ決まっていない日（「無し」や「△」の日）だけが出ます。
            〇や×を入れた日も含めて全部見たいときは、そのチェックを外してください。
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <h3 className="font-display text-sm font-extrabold text-slate-900">「備考を書く」について</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            「備考を書く」は記号で表せない連絡用です。ただし、備考を書いたあとでも、予定は「登録する」を押さないと残りません。
          </p>
        </div>
      </section>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 自分の「編集」を押す</li>
        <li>2. 〇や×を選ぶ</li>
        <li>
          3. <span className="text-teal-300">青い「登録する」を押す</span>
        </li>
      </ol>
    </DarkRecap>
  </ManualShell>
);

export default GeneralManualRegister;
