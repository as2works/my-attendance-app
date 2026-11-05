import React from 'react';
import { generalManualHref } from '../../services/manualPath';
import { MainListScreenMock } from './generalMocks';
import {
  DarkRecap,
  ManualShell,
  PageHero,
  SideCallout,
  StepCard,
  SummaryList,
  WarnBox,
} from './generalShared';

const GeneralManualOpen: React.FC = () => (
  <ManualShell slug="open" pageTitle="はじめて開くとき">
    <PageHero
      badge="はじめての方へ"
      title={
        <>
          もらったURLから
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            開きます
          </span>
        </>
      }
      lead={
        <>
          パスワードはありません。
          <br />
          管理者の人からもらった、長い住所（URL）を使います。
        </>
      }
    />

    <SummaryList
      label="このあとの手順（まとめ）"
      items={[
        { n: 1, title: 'もらったURLを開く', desc: 'メールやチャットに貼ってある長い文字を押します' },
        { n: 2, title: '一覧が出たらOK', desc: '名前が並んでいる画面になれば、開けています' },
        { n: 3, title: 'あとでまた使うなら残す', desc: 'ブックマーク（お気に入り）に入れておくと安心です' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="order-2 lg:order-1">
            <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
              1. 長いURLを開く
            </h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
              管理者の人から届いた
              <strong className="text-slate-900">長いリンク</strong>
              を押します。
              <br />
              青い文字や「ここを開く」のような案内になっていることが多いです。
            </p>
            <div className="mt-4">
              <WarnBox>
                自分で短い住所を打ち込む必要はありません。
                <br />
                必ず、もらったリンクから開いてください。
              </WarnBox>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="mx-auto w-full max-w-[280px] lg:max-w-none lg:pl-[9.5rem]">
              <div className="relative mx-auto w-full max-w-[280px]">
                <SideCallout className="lg:top-16">
                  この長い文字を
                  <br />
                  押して開く
                </SideCallout>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)]">
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">
                      管
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-500">管理者からのメッセージ</p>
                      <p className="truncate text-xs font-black text-slate-800">出勤予定の入力</p>
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="text-sm font-bold text-slate-800">出勤予定の入力をお願いします</p>
                    <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                      下のリンクを開いて、自分の名前から予定を入れてください。
                    </p>
                    <p className="break-all rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-indigo-700 underline decoration-indigo-300 underline-offset-2 ring-2 ring-teal-400">
                      https://example.amplifyapp.com/f1e2d3c4-b5a6-7980-...
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] font-bold text-slate-400">
                  ※ 説明用のイメージです（チャットの例）
                </p>
              </div>
            </div>
          </div>
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          2. 名前の一覧が出れば成功
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          画面に名前と日付のマスが並んでいれば、正しく開けています。
          <br />
          ここから予定を入れられます。
        </p>
        <p className="mt-4 text-sm font-medium text-slate-500">
          入れ方は「
          <a
            href={generalManualHref('register')}
            className="font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
          >
            予定の入れ方
          </a>
          」を見てください。
        </p>
        <div className="mt-6">
          <MainListScreenMock />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          3. あとでまた使うとき
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          同じリンクを、スマホやパソコンの
          <strong className="text-slate-900">ブックマーク（お気に入り）</strong>
          に入れておくと、次から探しやすくなります。
        </p>
        <div className="mt-4 space-y-3">
          <WarnBox>
            「ログアウト」を押すと、また同じ長いURLが必要です。
            <br />
            URLをなくしたときは、管理者の人にもう一度もらってください。
          </WarnBox>
          <TipLike>
            このリンクを持っている人は、同じグループの一覧を見られます。
            むやみにほかの人へ送らないでください。
          </TipLike>
        </div>
      </StepCard>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. もらった長いURLを開く</li>
        <li>2. 名前の一覧が出ればOK</li>
        <li>
          3. <span className="text-teal-300">ブックマークしておくと安心</span>
        </li>
      </ol>
    </DarkRecap>
  </ManualShell>
);

const TipLike: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-600">
    {children}
  </div>
);

export default GeneralManualOpen;
