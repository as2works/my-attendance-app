import React from 'react';
import { generalManualHref } from '../../services/manualPath';
import { MainListScreenMock } from './generalMocks';
import {
  DarkRecap,
  ManualShell,
  PageHero,
  StepCard,
  SummaryList,
  TipCard,
  WarnBox,
} from './generalShared';

const GeneralManualList: React.FC = () => (
  <ManualShell slug="list" pageTitle="一覧画面の見方">
    <PageHero
      badge="画面の見方"
      title={
        <>
          名前が並んでいる
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            一覧の見方
          </span>
        </>
      }
      lead={
        <>
          最初に出る画面です。
          <br />
          月の変え方と、〇×の意味を確認しましょう。
        </>
      }
    />

    <SummaryList
      items={[
        { n: 1, title: '月を変える', desc: '左右の矢印で、前の月・次の月に移動します' },
        { n: 2, title: '〇×を見る', desc: 'マスの中の記号が、その日の予定です' },
        { n: 3, title: '名前を探す', desc: '上の検索欄に名前を入れると見つかりやすいです' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          月の変え方
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          画面の上に「2026年 12月」のような表示があります。
          <br />
          左右の矢印を押すと、月が変わります。
        </p>
        <div className="mt-4">
          <WarnBox>
            管理者の人が決めた期間の外には、進めません。
            <br />
            矢印が押せないときは、期間の端まで来ています。
          </WarnBox>
        </div>
        <div className="mt-6">
          <MainListScreenMock highlightMonth />
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          記号の意味
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          マスの中に出ている記号が、その日の予定です。
          <br />
          いちばんよく見るのは次のものです。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { s: '〇', l: '出られる', c: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
            { s: '×', l: '休みたい', c: 'bg-rose-50 text-rose-800 border-rose-100' },
            { s: '△', l: 'まだ未定', c: 'bg-amber-50 text-amber-800 border-amber-100' },
            { s: 'AM', l: '午前だけ', c: 'bg-sky-50 text-sky-800 border-sky-100' },
            { s: 'PM', l: '午後だけ', c: 'bg-violet-50 text-violet-800 border-violet-100' },
            { s: '（空）', l: 'まだ決まっていない', c: 'bg-white text-slate-500 border-slate-200' },
          ].map((x) => (
            <div key={x.s} className={`rounded-xl border px-2.5 py-3 text-center ${x.c}`}>
              <div className="font-display text-base font-extrabold">{x.s}</div>
              <div className="mt-0.5 text-[11px] font-bold">{x.l}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
          <p className="text-xs font-bold text-indigo-700">寮の人向け（in / out が出るグループだけ）</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
            「in」と「out」は、<strong className="text-slate-900">仕事をしない日</strong>
            に使います。
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-indigo-100 bg-white px-3 py-3">
              <p className="font-display text-sm font-extrabold text-indigo-800">in</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                入寮する日で、その日は仕事をしないとき
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white px-3 py-3">
              <p className="font-display text-sm font-extrabold text-indigo-800">out</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                退寮する日で、その日は仕事をしないとき
                <br />
                （寮に泊まったあと、仕事はしない日）
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold leading-relaxed text-slate-800">
            入寮や退寮の日でも、仕事をするなら「in」「out」ではなく、〇・AM・PM などを選びます。
          </p>
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          名前の探し方
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          画面の上に、虫眼鏡のついた欄があります。
          <br />
          そこに自分の名前を入れると、候補が絞られます。
        </p>
        <p className="mt-3 text-sm font-medium text-slate-500">
          予定を入れるときは、自分の名前の下の「編集」を押します。詳しくは
          <a
            href={generalManualHref('register')}
            className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
          >
            予定の入れ方
          </a>
          へ。
        </p>
        <div className="mt-6">
          <MainListScreenMock searchQuery="山田" highlightSearch highlightUser />
        </div>
      </StepCard>

      <TipCard title="ユーザIDについて">
        名前の上に数字や英字が出ることがあります。出勤システム用の番号です。分からなくても、名前が合っていれば大丈夫です。
      </TipCard>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 矢印で月を変える</li>
        <li>2. マスの〇×が予定</li>
        <li>
          3. <span className="text-teal-300">検索で自分を見つける</span>
        </li>
      </ol>
    </DarkRecap>
  </ManualShell>
);

export default GeneralManualList;
