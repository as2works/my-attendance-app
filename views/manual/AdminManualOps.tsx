import React from 'react';
import { adminManualHref, GENERAL_MANUAL_PATH } from '../../services/manualPath';
import {
  AdminCsvScreenMock,
  AdminHistoryScreenMock,
  AdminOverviewScheduleMock,
} from './adminMocks';
import {
  AdminManualShell,
  CheckList,
  DocGoals,
  PageHero,
  ProcedureSteps,
  RelatedLinks,
  StepCard,
  WarnBox,
} from './generalShared';

export const AdminManualDaily: React.FC = () => (
  <AdminManualShell slug="daily" pageTitle="毎日の確認と消込">
    <PageHero
      badge="毎日の作業"
      title={
        <>
          予定の集まり方を見て
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            連絡を消込する
          </span>
        </>
      }
      lead={
        <>
          管理者パネルでいちばんよく使うのが、左メニュー「確認・消込」です。
          <br />
          上で予定の進みを見て、下で変更・備考の連絡を処理します。
        </>
      }
    />

    <DocGoals
      items={[
        'グループと月を合わせて、未入力（空欄）を見つける',
        '検索や上下の分割を使って見やすくする',
        '未消込バッジと履歴カードで連絡を確認する',
        '右の□で消込する（予定データは消えない）',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          いつ使うか
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          入力期間中は、ほぼ毎日ここを見ます。
          「誰の予定がまだ空か」「昨夜以降に何が変わったか」を確認する場所です。
        </p>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          グループと月を合わせる
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: '画面上のグループ切替で、見たいグループを選ぶ',
              body: '一覧・履歴・利用者の見え方は、このグループに限定されます。',
            },
            {
              title: '予定表の月送り（左右の矢印）で月を合わせる',
              body: '最初に開く月は期間に合わせて決まります（期間の内側なら当月、期間前なら開始月、期間後なら終了月）。期間をあとから変えても、表示中の月は自動では飛びません。',
            },
            {
              title: '必要なら氏名・ユーザIDで検索する',
              body: '人数が多いときに便利です。履歴カードの名前を押すと、検索に名前が入る動きもあります。',
            },
          ]}
        />
        <div className="mt-6">
          <AdminOverviewScheduleMock highlightMonth />
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          予定一覧の読み方
        </h2>
        <ul className="mt-3 space-y-2 text-base font-medium leading-relaxed text-slate-700">
          <li>
            ・マスが<strong className="text-slate-900">空</strong>
            … まだ予定が入っていない（未入力）
          </li>
          <li>・〇／×／△／AM／PM／in／out … その日の登録内容</li>
          <li>・土日や登録した休日は、色が付いて見えやすくなります</li>
        </ul>
        <div className="mt-4">
          <WarnBox>
            この一覧のマスは、管理者パネル上では直接クリックして編集できません。
            <br />
            直すときはヘッダーの「一般画面へ」を使います（
            <a href={adminManualHref('edit')} className="mx-1 font-bold text-teal-800 underline">
              一般画面で予定を直す
            </a>
            ）。
          </WarnBox>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500">
          入力を依頼するときは
          <a
            href={GENERAL_MANUAL_PATH}
            className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
          >
            みなさん向けガイド
          </a>
          も一緒に渡すと伝わりやすいです。
        </p>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          上下の二段表示
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          「確認・消込」は、上が予定一覧、下が変更履歴・消込です。
          <br />
          真ん中のハンドルで、上下の高さ比率を変えられます（端末に覚えます）。
        </p>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          未消込と履歴カード
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          グループ名の横の赤い「未消込」は、いまのグループでまだ消込していない件数の目安です。
          <br />
          黄色い「他グループにも未消込」は、ほかのグループ側に残りがあるときの合図です。
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
          履歴に出やすいもの: 予定の新規入力・変更、備考の変更・削除。
          <br />
          出にくい／出ないもの: 氏名やユーザIDだけの編集（履歴カードは増えません）。
        </p>
        <div className="mt-6">
          <AdminHistoryScreenMock highlight="badge" />
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          消込の手順
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: '下の履歴カードで内容を読む',
              body: '誰が・いつ・何を変えたかがカードに並びます。',
            },
            {
              title: 'カード右の大きな□を押す',
              body: '「未消込」が「完了」に変わり、未消込の数字も減ります。',
            },
            {
              title: '終わったものも見たいとき',
              body: '右上の「完了分も表示」にチェックを付けます。チェックを外すと、また未消込中心の見え方に戻ります。',
            },
          ]}
        />
        <div className="mt-4">
          <WarnBox>
            消込は「確認したよ」の印です。予定の〇×が消える・戻る操作ではありません。
            <br />
            間違えて消込した場合は、同じ□をもう一度押すと未消込に戻せます。
          </WarnBox>
        </div>
        <div className="mt-6">
          <AdminHistoryScreenMock highlight="checkbox" />
        </div>
      </StepCard>
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('edit'), label: '一般画面で予定を直す' },
        { href: adminManualHref('tour'), label: '画面の全体像' },
        { href: adminManualHref('csv'), label: '出勤CSVを出す' },
      ]}
    />

    <CheckList
      items={[
        'グループと月が合っている',
        '空欄（未入力）を確認した',
        '未消込の履歴を読んで消込した',
        '必要なら他グループの未消込も見た',
      ]}
    />
  </AdminManualShell>
);

export const AdminManualEdit: React.FC = () => (
  <AdminManualShell slug="edit" pageTitle="一般画面で予定を直す">
    <PageHero
      badge="毎日の作業"
      title={
        <>
          管理者からも
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            一般と同じ画面で直す
          </span>
        </>
      }
      lead={
        <>
          予定一覧のマスは、管理者パネル上では直接編集できません。
          <br />
          空欄を埋める・間違った記号を直すときは、「一般画面へ」を使います。
        </>
      }
    />

    <DocGoals
      items={[
        '「一般画面へ」と「管理者画面へ」の往復ができる',
        '自分の名前以外でも編集できることを理解する（管理者として入っているため）',
        '備考の保存と、予定の「登録する」が別操作だと分かる',
        'シーズン外では編集できないことを知っておく',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          切り替え方
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: 'ヘッダーの「一般画面へ」を押す',
              body: '入力する人と同じ一覧画面に切り替わります。',
            },
            {
              title: '対象の人の「編集」を開き、〇×などを選ぶ',
              body: '管理者として入っているので、グループ内のどの人の行も開けます。運用ルールに沿って扱ってください。',
            },
            {
              title: '青い「登録する」を押す',
              body: '押さないと予定は残りません。戻るだけでは未保存のままです。',
            },
            {
              title: 'ヘッダーの「管理者画面へ」で戻る',
              body: '一覧は再取得されます。表示月が違うと空に見えることがあるので、月を合わせてください。',
            },
          ]}
        />
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          備考と予定登録は別
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          「備考を書く」側の保存と、予定の「登録する」は別操作です。
          <br />
          備考だけ保存しても〇×は変わりません。〇×を変えたら必ず「登録する」も押してください。
        </p>
        <p className="mt-3 text-sm font-medium text-slate-500">
          入力する人向けの説明は
          <a
            href={GENERAL_MANUAL_PATH}
            className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
          >
            みなさん向けガイド
          </a>
          にもあります。
        </p>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          よくあるつまずき
        </h2>
        <ul className="mt-3 space-y-3 text-sm font-medium leading-relaxed text-slate-700">
          <li>
            <strong className="text-slate-900">シーズン外の日付</strong>
            … 期間の外は編集できません。先に
            <a href={adminManualHref('season')} className="mx-1 font-bold text-teal-700 underline">
              期間・休日
            </a>
            を確認してください。
          </li>
          <li>
            <strong className="text-slate-900">戻ったら一覧が空／古い</strong>
            … 表示月のずれが多いです。矢印で月を合わせるか、再読み込みしてください。
          </li>
          <li>
            <strong className="text-slate-900">消込したのに予定が戻らない</strong>
            … 消込は連絡の既読です。予定を直すのは一般画面側の操作です。
          </li>
        </ul>
        <div className="mt-4">
          <WarnBox>
            一般用URLを持っている人も、そのグループの全員の予定を変えられます。
            <br />
            管理者として一般画面に入っているときも、どの行を触るかは慎重に選んでください。
          </WarnBox>
        </div>
      </StepCard>
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('daily'), label: '毎日の確認と消込' },
        { href: `${GENERAL_MANUAL_PATH}/register`, label: '予定の入れ方（みなさん向け）' },
        { href: adminManualHref('season'), label: '期間・休日・表示設定' },
      ]}
    />

    <CheckList
      items={[
        '一般画面へ切り替えた',
        '対象者の編集で記号を選んだ',
        '「登録する」を押した',
        '管理者画面へ戻り、月を合わせて確認した',
      ]}
    />
  </AdminManualShell>
);

export const AdminManualCsv: React.FC = () => (
  <AdminManualShell slug="csv" pageTitle="出勤CSVを出す">
    <PageHero
      badge="毎日の作業"
      title={
        <>
          出勤確認表を
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            CSVで出す
          </span>
        </>
      }
      lead={
        <>
          出勤・給与システムへの受け渡しなどに使います。
          <br />
          全グループ分が、設定した期間の日付列つきでダウンロードされます。
        </>
      }
    />

    <DocGoals
      items={[
        '左メニュー下の「CSV出力」からダウンロードできる',
        'ファイルの列構成（ID・氏名・日付）を理解する',
        '期間が正しくないと出せないことを知っておく',
        '画面でIDを隠していても、CSVにはID列が残ると分かる',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          出し方
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: '期間が正しいか確認する',
              body: (
                <>
                  期間が未設定・不正だと出せません。先に
                  <a href={adminManualHref('season')} className="mx-1 font-bold text-teal-700 underline">
                    期間・休日
                  </a>
                  を保存してください。
                </>
              ),
            },
            {
              title: '左メニュー下の「CSV出力」を押す',
              body: 'タブではなく、メニューの一番下付近にあるボタンです。',
            },
            {
              title: 'ダウンロードされたファイルを開く',
              body: 'ファイル名の例: 出勤確認表_YYYYMMDD_HHMM.csv（UTF-8 BOM）。Excelで文字化けする場合は、データの取り込みでUTF-8を指定してください。',
            },
          ]}
        />
        <div className="mt-6">
          <AdminCsvScreenMock />
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          ファイルの中身
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          実ファイルの列は次の並びです。
        </p>
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-bold text-slate-800">
          ID, 氏名, 日付1, 日付2, …
        </p>
        <ul className="mt-4 space-y-2 text-sm font-medium leading-relaxed text-slate-700">
          <li>・日付列は、シーズン開始日〜終了日までが並びます</li>
          <li>・予定が入っていない日は空欄です（「-」などにはなりません）</li>
          <li>・グループ名の列はありません（全グループの人が縦に並びます）</li>
          <li>・利用者管理でユーザID表示をOFFにしても、CSVのID列は残ります</li>
          <li>・人がいないグループはスキップされます</li>
        </ul>
        <div className="mt-6 min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="break-words border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold leading-relaxed text-slate-500">
            出勤確認表_20261201_1530.csv（中身の例）
          </div>
          <div className="min-w-0 overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[300px] border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 bg-white font-bold text-slate-500">
                  {['ID', '氏名', '2026-12-01', '2026-12-02', '2026-12-03'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2.5 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-bold text-slate-700">
                <tr className="border-b border-slate-50">
                  <td className="px-2.5 py-2">22</td>
                  <td className="px-2.5 py-2">青木　恵</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                  <td className="px-2.5 py-2 text-rose-700">×</td>
                  <td className="px-2.5 py-2 text-sky-700">AM</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="px-2.5 py-2">25</td>
                  <td className="px-2.5 py-2">加藤　翔</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                  <td className="px-2.5 py-2 text-slate-300">　</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-2">08</td>
                  <td className="px-2.5 py-2">森　あかり</td>
                  <td className="px-2.5 py-2 text-violet-700">PM</td>
                  <td className="px-2.5 py-2 text-emerald-700">〇</td>
                  <td className="px-2.5 py-2 text-amber-700">△</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-3 py-2 text-center text-[11px] font-bold text-slate-400">
            ※ 説明用です（実ファイルにグループ列はありません）
          </p>
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          うまく出せないとき
        </h2>
        <ul className="mt-3 space-y-2 text-sm font-medium leading-relaxed text-slate-700">
          <li>・期間の開始日・終了日が未入力／逆転していないか</li>
          <li>・通信エラーが出た場合は、時間をおいて再実行</li>
          <li>・中身がスカスカに見える場合は、そもそも予定が未入力のことが多いです</li>
        </ul>
      </StepCard>
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('season'), label: '期間・休日・表示設定' },
        { href: adminManualHref('users'), label: '利用者を登録する', note: '名簿側のCSV取込は別機能' },
        { href: adminManualHref('faq'), label: '困ったとき' },
      ]}
    />

    <CheckList
      items={[
        '期間が保存されている',
        '「CSV出力」を押した',
        'ID・氏名・日付列になっていることを確認した',
        '必要ならExcelでUTF-8として開いた',
      ]}
    />
  </AdminManualShell>
);
