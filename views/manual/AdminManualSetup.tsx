import React from 'react';
import { adminManualHref, GENERAL_MANUAL_PATH } from '../../services/manualPath';
import {
  AdminConfigScreenMock,
  AdminGroupsScreenMock,
  AdminLinksScreenMock,
  AdminUsersScreenMock,
} from './adminMocks';
import {
  AdminManualShell,
  DarkRecap,
  PageHero,
  StepBadge,
  StepCard,
  SummaryList,
  TipCard,
  WarnBox,
} from './generalShared';

export const AdminManualSetup: React.FC = () => (
  <AdminManualShell slug="setup" pageTitle="シーズン準備の流れ">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          始める前の
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            順番チェック
          </span>
        </>
      }
      lead={
        <>
          下の順番で進めると迷いやすいです。
          <br />
          くわしい操作は、各ページに分かれています。
        </>
      }
    />

    <section className="mb-10 space-y-3">
      {[
        { n: 1, title: '期間・休日', href: adminManualHref('season'), desc: 'いつからいつまで入力できるかを決める' },
        { n: 2, title: 'グループ', href: adminManualHref('groups'), desc: '寮などのグループを整える' },
        { n: 3, title: '利用者', href: adminManualHref('users'), desc: '名前を登録する（手入力 or CSV）' },
        { n: 4, title: '入場URL', href: adminManualHref('links'), desc: '入力用の長いURLをコピーして配る' },
        { n: 5, title: '入力をお願いする', href: GENERAL_MANUAL_PATH, desc: 'みなさん向けガイドも一緒に渡すと安心' },
      ].map((item) => (
        <a
          key={item.n}
          href={item.href}
          className="flex gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 transition hover:border-teal-300 hover:bg-white sm:p-5"
        >
          <StepBadge n={item.n} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold text-slate-900">{item.title}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-600">{item.desc}</p>
          </div>
          <i className="fas fa-chevron-right mt-2 text-slate-300" />
        </a>
      ))}
    </section>

    <DarkRecap label="この順番を守ると楽">
      <p className="font-medium leading-relaxed">
        期間 → グループ → 利用者 → URL配布 → 入力依頼
      </p>
    </DarkRecap>
  </AdminManualShell>
);

export const AdminManualSeason: React.FC = () => (
  <AdminManualShell slug="season" pageTitle="期間・休日を設定する">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          入力できる期間を
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            決める
          </span>
        </>
      }
      lead="左メニューの「期間・休日」で設定します。全グループ共通です。"
    />

    <SummaryList
      items={[
        { n: 1, title: '開始日と終了日を入れる', desc: 'この期間の中だけ、予定を入れられます' },
        { n: 2, title: '休日を足す（任意）', desc: '祝日などを赤く見せたいときに追加します' },
        { n: 3, title: '保存する', desc: '保存しないと反映されません' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          どこで設定する？
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          左メニューの「期間・休日」を開きます。
          <br />
          開始日・終了日を入れて、下の緑の「保存する」を押します。
        </p>
        <div className="mt-6">
          <AdminConfigScreenMock highlightDates highlightSave />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          期間が大事な理由
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          入力する人が見られる月や日付は、この期間の中だけです。
          <br />
          CSVも、この期間をもとに出ます。
        </p>
        <div className="mt-4">
          <WarnBox>
            開始日は終了日より前にしてください。
            <br />
            途中で期間を変えたときの注意は
            <a href={adminManualHref('faq')} className="mx-1 font-bold text-teal-800 underline">
              困ったとき
            </a>
            にも書いてあります。
          </WarnBox>
        </div>
      </StepCard>

      <TipCard title="ユーザIDの表示">
        同じ画面で、一覧にユーザIDを出す／隠すも切り替えられます。隠しても、CSVのID列は残ります。
      </TipCard>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 開始日・終了日を入れる</li>
        <li>2. 必要なら休日を足す</li>
        <li>
          3. <span className="text-teal-300">保存する</span>
        </li>
      </ol>
    </DarkRecap>
  </AdminManualShell>
);

export const AdminManualGroups: React.FC = () => (
  <AdminManualShell slug="groups" pageTitle="グループを整える">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          グループを
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            追加・整理する
          </span>
        </>
      }
      lead="左メニューの「グループ」で操作します。一般の入場URLはグループごとに分かれます。"
    />

    <SummaryList
      items={[
        { n: 1, title: 'グループを作る／名前を変える', desc: '寮・日勤などの単位で分けます' },
        { n: 2, title: '寮記号が必要か決める', desc: 'in / out が必要なグループだけONにします' },
        { n: 3, title: '順番を整える', desc: '一覧に出る並びを調整できます' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          画面のイメージ
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          左メニューの「グループ」です。
          <br />
          寮で in / out が必要なら、「寮用記号あり」にチェックを付けます。
        </p>
        <div className="mt-6">
          <AdminGroupsScreenMock highlightLodging />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          寮の in / out について
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          グループ設定で宿泊の記号をONにすると、入力画面に「in」「out」が出ます。
        </p>
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm font-medium leading-relaxed text-slate-700">
          <p>
            <strong className="text-slate-900">in</strong>
            … 入寮する日で、その日は仕事をしないとき
          </p>
          <p className="mt-2">
            <strong className="text-slate-900">out</strong>
            … 退寮する日で、その日は仕事をしないとき
          </p>
          <p className="mt-2 font-bold text-slate-900">
            入寮・退寮でも仕事をする日は、〇・AM・PM などを選びます。
          </p>
        </div>
      </StepCard>

      <WarnBox>
        グループを消すと、利用者の移動などが必要になります。消す前に中身を確認してください。
      </WarnBox>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 必要なグループを用意する</li>
        <li>2. 寮なら in / out をON</li>
        <li>
          3. <span className="text-teal-300">利用者登録へ進む</span>
        </li>
      </ol>
    </DarkRecap>
  </AdminManualShell>
);

export const AdminManualUsers: React.FC = () => (
  <AdminManualShell slug="users" pageTitle="利用者を登録する">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          名前を登録する
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            （手入力 / CSV）
          </span>
        </>
      }
      lead="左メニューの「利用者管理」で追加・編集します。人数が多いときはCSV取込が便利です。"
    />

    <SummaryList
      items={[
        { n: 1, title: '手入力で追加', desc: '氏名と、必要ならユーザID・グループを入れて追加' },
        { n: 2, title: 'CSVでまとめて取り込む', desc: '年度切替や大量登録向け。画面の案内に従います' },
        { n: 3, title: '移動・削除', desc: 'グループ移動や、不要な人の削除もここから' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          手入力
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          氏名は必須です。ユーザIDは出勤システム連携用で、空でも登録できます。
          <br />
          追加先のグループを間違えないように選んでください。
        </p>
        <div className="mt-6">
          <AdminUsersScreenMock />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          CSV取込
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          名簿カード右下の「CSV取込」から、画面の手順どおりに進みます。
          <br />
          同じ名前があるときなどは、画面の確認で上書きや対応を選びます。
        </p>
        <div className="mt-6">
          <AdminUsersScreenMock highlightCsv />
        </div>
        <div className="mt-4">
          <WarnBox>
            取り込む前に、どのグループ向けのCSVかを確認してください。
            <br />
            迷ったら、少人数で手入力してからCSVに慣れる方法でも大丈夫です。
          </WarnBox>
        </div>
      </StepCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <TipCard title="削除するとき">
          利用者を消すと、その人の出勤予定も消えます。消す前に本当に不要か確認してください。
        </TipCard>
        <TipCard title="備考">
          人ごとのメモ（備考）も、ここや一覧から開けます。入力する人も編集画面から書けます。
        </TipCard>
      </div>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 手入力 or CSV で登録</li>
        <li>2. グループが合っているか確認</li>
        <li>
          3. <span className="text-teal-300">入場URLの配布へ</span>
        </li>
      </ol>
    </DarkRecap>
  </AdminManualShell>
);

export const AdminManualLinks: React.FC = () => (
  <AdminManualShell slug="links" pageTitle="入場URLを配る">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          長いURLをコピーして
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            配る
          </span>
        </>
      }
      lead="左メニューの「リンク」からコピーします。パスワードはありません。URLそのものが鍵です。"
    />

    <SummaryList
      items={[
        { n: 1, title: '管理者用URL', desc: '管理者パネルを開く用。限られた人だけに渡す' },
        { n: 2, title: '一般用URL', desc: 'グループごとに1本。入力する人へ渡す' },
        { n: 3, title: '再発行は慎重に', desc: '再発行すると、古いURLは使えなくなります' },
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          一般用URLの注意
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          一般用のURLを持っている人は、そのグループの
          <strong className="text-slate-900">全員の予定や備考を見たり変えたり</strong>
          できます。
        </p>
        <div className="mt-4">
          <WarnBox>
            必要な人だけに配ってください。
            <br />
            配るときは、「自分の名前で登録する」ことと
            <a
              href={GENERAL_MANUAL_PATH}
              className="mx-1 font-bold text-teal-800 underline"
            >
              みなさん向けガイド
            </a>
            も一緒に伝えると安心です。
          </WarnBox>
        </div>
        <div className="mt-6">
          <AdminLinksScreenMock highlightGeneral />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          再発行するとき
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          URLが漏れたり、古いリンクを無効にしたいときに使います。
          <br />
          再発行すると、以前のURLでは開けなくなります。ブックマークしている人には、新しいURLを配り直してください。
        </p>
      </StepCard>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 管理者用は少人数に</li>
        <li>2. 一般用はグループごとに配る</li>
        <li>
          3. <span className="text-teal-300">再発行したら配り直す</span>
        </li>
      </ol>
    </DarkRecap>
  </AdminManualShell>
);
