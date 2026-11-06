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
  CheckList,
  DocGoals,
  PageHero,
  ProcedureSteps,
  RelatedLinks,
  StepBadge,
  StepCard,
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
          管理者用URLでパネルを開いたあとに行う準備です。期間・グループ・利用者・URLには順番があります。
          <br />
          下の流れで進めると、途中で詰まりにくいです。くわしい操作は各ページへ。
        </>
      }
    />

    <DocGoals
      items={[
        'シーズン開始時に何をどの順でやるか把握する',
        '各ステップの詳細ページへ迷わず進める',
      ]}
    />

    <section className="mb-10 space-y-3">
      {[
        {
          n: 1,
          title: '期間・休日・表示設定',
          href: adminManualHref('season'),
          desc: '入力できる期間と休日、ユーザID表示を決めて保存する',
        },
        {
          n: 2,
          title: 'グループを整える',
          href: adminManualHref('groups'),
          desc: '寮・日勤などのグループと、寮用記号（in/out）を用意する',
        },
        {
          n: 3,
          title: '利用者を登録する',
          href: adminManualHref('users'),
          desc: '手入力またはCSV取込で名簿を入れる。移動・削除もここ',
        },
        {
          n: 4,
          title: '入場URLと再発行',
          href: adminManualHref('links'),
          desc: '管理者用・一般用をコピーして配る。漏れ時は再発行',
        },
        {
          n: 5,
          title: '入力をお願いする',
          href: GENERAL_MANUAL_PATH,
          desc: '一般用URLとみなさん向けガイドを渡す',
        },
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

    <div className="mb-8">
      <WarnBox>
        この準備は、配布された管理者用URLで管理者パネルを開いたあとに行います。
        <br />
        下の順番どおりに進めると、途中で詰まりにくいです。
      </WarnBox>
    </div>

    <CheckList
      label="準備が終わったかの目安"
      items={[
        '期間が保存されている',
        '必要なグループと寮記号がある',
        '利用者が正しいグループに入っている',
        '一般用URLを必要な人だけに配った',
        'みなさん向けガイドも案内した',
      ]}
    />
  </AdminManualShell>
);

export const AdminManualSeason: React.FC = () => (
  <AdminManualShell slug="season" pageTitle="期間・休日・表示設定">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          入力できる期間と
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            休日・表示を決める
          </span>
        </>
      }
      lead="左メニュー「期間・休日」です。設定は全グループ共通です。"
    />

    <DocGoals
      items={[
        'シーズン開始日・終了日を入れて保存する',
        '休日（赤表示）を追加・削除する',
        'ユーザIDの表示／非表示を切り替える',
        '期間変更後も一覧の月が自動では飛ばないことを知る',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          画面の場所
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          左メニューの「期間・休日」を開きます。上にシーズン期間、下に休日設定があります。
        </p>
        <div className="mt-6">
          <AdminConfigScreenMock highlightDates highlightSave />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          シーズン期間の手順
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: '開始日と終了日を入れる',
              body: 'この期間の中だけ、一般（および一般画面へ）で予定を編集できます。CSVの日付列もこの期間が基準です。',
            },
            {
              title: '開始日 ≤ 終了日になっているか確認する',
              body: '逆転していると保存できません。',
            },
            {
              title: '緑の「期間・表示設定を保存する」を押す',
              body: '日付を変えただけでは反映されません。必ず保存してください。',
            },
          ]}
        />
        <div className="mt-4">
          <WarnBox>
            期間を保存したあとでも、確認・消込の「いま見ている月」は自動では変わりません。
            <br />
            月の矢印で動かすか、ページを再読み込みしてください。
          </WarnBox>
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          休日設定（赤表示）
        </h2>
        <ProcedureSteps
          steps={[
            { title: '日付を選ぶ', body: '祝日や事業カレンダー上の休日など。' },
            {
              title: '「追加して保存」を押す',
              body: '休日は追加・削除のたびに保存されます（期間フォームの保存ボタンとは別操作です）。',
            },
            {
              title: '不要なら一覧の「削除」',
              body: '日曜と同じくカレンダーが赤く見えるための設定です。入力そのものを禁止する機能ではありません。',
            },
          ]}
        />
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          ユーザIDの表示
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          「ユーザIDを表示する」のチェックで、一覧や利用者管理からID列を隠せます（初期はON）。
          <br />
          隠しても、出勤CSVのID列は残ります。
        </p>
        <TipCard title="なぜ残る？">
          IDは出勤・給与システム連携用です。画面の見やすさと、CSV連携の必要が分かれているためです。
        </TipCard>
      </StepCard>
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('setup'), label: 'シーズン準備の流れ' },
        { href: adminManualHref('csv'), label: '出勤CSVを出す' },
        { href: adminManualHref('faq'), label: '困ったとき', note: '期間変更後の月ずれ' },
      ]}
    />

    <CheckList
      items={[
        '開始日・終了日を入れた',
        '保存ボタンを押した',
        '必要な休日を追加した',
        'ID表示のON/OFFを決めた',
      ]}
    />
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
      lead="左メニュー「グループ」です。一般の入場URLはグループごとに1本あります。"
    />

    <DocGoals
      items={[
        'グループを追加・改名・並べ替えできる',
        '寮用記号（in/out）のON/OFFを正しく付ける',
        '削除時の利用者移動とURL無効化を理解する',
        'CSV取込でできたグループは寮記号OFFだと知る',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          画面のイメージ
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          上で新規追加、下に既存グループの一覧です。
        </p>
        <div className="mt-6">
          <AdminGroupsScreenMock highlightLodging />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          追加・編集・並べ替え
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: 'グループ名を入れて「追加する」',
              body: '追加すると、そのグループ用の一般入場URLが自動作成されます。同じ名前は作れません。',
            },
            {
              title: '寮で in/out が必要なら「寮用記号あり」にチェック',
              body: 'ONにすると、入力画面に in / out が出ます。日勤など不要なグループはOFFのままにします。',
            },
            {
              title: '既存グループは「編集」で名前・寮記号を変更',
              body: '途中で寮記号をOFFにすると、すでに入っている in/out の見え方と入力UIが食い違うことがあるので注意してください。',
            },
            {
              title: '上下矢印で順番を変える',
              body: '切替リストや一覧の並びに影響します。',
            },
          ]}
        />
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          寮の in / out の意味
        </h2>
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

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          グループを削除するとき
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: '移動先のグループを選ぶ',
              body: '所属している人と履歴は、指定した移動先へ移ります。',
            },
            {
              title: '削除を確定する',
              body: 'そのグループの一般用入場URLは使えなくなります。配っていた人には新しいURLが必要です。',
            },
          ]}
        />
        <div className="mt-4">
          <WarnBox>
            最後の1グループは削除できません。
            <br />
            CSV取込で新しくできたグループは、寮用記号がOFFのことがあります。寮ならあとから編集でONにしてください。
          </WarnBox>
        </div>
      </StepCard>
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('users'), label: '利用者を登録する' },
        { href: adminManualHref('links'), label: '入場URLと再発行' },
        { href: adminManualHref('setup'), label: 'シーズン準備の流れ' },
      ]}
    />

    <CheckList
      items={[
        '必要なグループがある',
        '寮グループに寮用記号が付いている',
        '不要グループの削除影響を理解した',
        '次は利用者登録へ進む',
      ]}
    />
  </AdminManualShell>
);

export const AdminManualUsers: React.FC = () => (
  <AdminManualShell slug="users" pageTitle="利用者を登録する">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          名簿を登録する
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            （手入力 / CSV）
          </span>
        </>
      }
      lead="左メニュー「利用者管理」です。人数が多いときはCSV取込が便利ですが、手順が長いので下を順に読んでください。"
    />

    <DocGoals
      items={[
        '手入力で追加・編集・並べ替えができる',
        'グループ移動と削除の影響を理解する',
        'CSV取込の形式とウィザードの流れを把握する',
        '途中失敗で一部だけ反映される可能性があると知る',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          画面のイメージ（手入力）
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          上の欄で追加、下の名簿で並べ替え・編集・グループ移動・削除ができます。
        </p>
        <div className="mt-6">
          <AdminUsersScreenMock />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          手入力の手順
        </h2>
        <ProcedureSteps
          steps={[
            {
              title: 'ユーザID（任意）・氏名・追加先グループを入れる',
              body: '氏名は必須です。ユーザIDはこの出勤予定の中で一意です（別グループでも同じIDは使えません）。',
            },
            {
              title: '「追加」を押す',
              body: '別グループを追加先に選んだ場合、グループ切替もそちらへ寄ることがあります。',
            },
            {
              title: '並べ替えは ↑↓',
              body: '一覧に出る順番を整えます。',
            },
            {
              title: '「編集」で氏名・IDを直す',
              body: '氏名変更は履歴カード上の表示名にも反映されますが、新しい履歴行は増えません。',
            },
            {
              title: '「グループ移動」で所属を変える',
              body: 'その人の変更履歴も一緒に移動します。',
            },
            {
              title: '削除は慎重に',
              body: '利用者を消すと、その人の出勤予定と履歴も消えます。元に戻せません。',
            },
          ]}
        />
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          CSV取込のファイル形式
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          UTF-8（BOM付き推奨）、<strong className="text-slate-900">ヘッダー行なし</strong>、3列です。
        </p>
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-bold text-slate-800">
          ID, 名前, グループ名
        </p>
        <ul className="mt-4 space-y-2 text-sm font-medium leading-relaxed text-slate-700">
          <li>・空行や列数が合わない行はスキップされます</li>
          <li>・まったく同じ行の重複はまとめられます</li>
          <li>・同じIDなのに中身が違う行が混ざると、そのCSVは取り込めません（作り直してください）</li>
          <li>・取込で新しく作られたグループは、寮用記号がOFFのことがあります → グループ画面で直す</li>
        </ul>
        <div className="mt-6">
          <AdminUsersScreenMock highlightCsv />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          CSV取込ウィザードの流れ
        </h2>
        <ProcedureSteps
          label="画面の案内に従って進みます"
          steps={[
            {
              title: 'CSVファイルを選ぶ',
              body: '利用者管理の「CSV取込」から開始します。',
            },
            {
              title: '取り込むグループを選ぶ',
              body: '対象外にしたいグループは外します（例: 常勤をスキップする、など）。',
            },
            {
              title: 'CSV内の問題を確認する',
              body: '重複や不整合があれば、ここで止まります。直せないものはCSVを修正してやり直します。',
            },
            {
              title: 'まだないグループの扱い',
              body: '新規作成するか、既存グループに割り当てるかを選びます。',
            },
            {
              title: '既存の人との突き合わせ',
              body: '同じ名前があるときなどは、上書き・新規・キャンセルなどを画面の選択肢から決めます。複数候補に当たる場合は上書きできないことがあります。',
            },
            {
              title: '最終確認して適用',
              body: '途中でエラーになると、そこまでの一部だけ反映されることがあります。終わったら名簿を目視確認してください。',
            },
          ]}
        />
        <div className="mt-4">
          <WarnBox>
            迷ったら、少人数は手入力の方が安全です。
            <br />
            大量取込の前に、テスト用の短いCSVで一度通すことをおすすめします。
          </WarnBox>
        </div>
      </StepCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <TipCard title="備考">
          人ごとのメモは、ここや確認・消込の一覧からも開けます。備考の変更は未消込の履歴になります。
        </TipCard>
        <TipCard title="出勤CSVとの違い">
          ここで扱うのは「名簿の取込」です。出勤予定を出すCSVは左メニュー下の「CSV出力」です。
        </TipCard>
      </div>
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('groups'), label: 'グループを整える' },
        { href: adminManualHref('links'), label: '入場URLと再発行' },
        { href: adminManualHref('csv'), label: '出勤CSVを出す' },
      ]}
    />

    <CheckList
      items={[
        '氏名とグループが正しい',
        'IDの重複がない',
        'CSV取込後に寮記号が必要なグループを確認した',
        '削除前に予定が消えてよいか確認した',
      ]}
    />
  </AdminManualShell>
);

export const AdminManualLinks: React.FC = () => (
  <AdminManualShell slug="links" pageTitle="入場URLと再発行">
    <PageHero
      badge="シーズンの準備"
      title={
        <>
          長いURLをコピーして
          <br />
          <span className="bg-gradient-to-r from-teal-700 to-sky-700 bg-clip-text text-transparent">
            配る・守り直す
          </span>
        </>
      }
      lead="左メニュー「入場URL」です。パスワードログインはありません。長いURLそのものが鍵です。再発行だけ、最初に渡された専用パスワードを使います。"
    />

    <DocGoals
      items={[
        '管理者用と一般用（グループごと）の違いが分かる',
        '安全な配り方ができる',
        '再発行の手順と副作用（旧URL即無効）を理解する',
        '再発行パスワードの扱いが分かる',
      ]}
    />

    <div className="space-y-8 sm:space-y-10">
      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          画面のイメージ
        </h2>
        <div className="mt-6">
          <AdminLinksScreenMock highlightGeneral />
        </div>
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          種類と権限
        </h2>
        <ul className="mt-3 space-y-3 text-base font-medium leading-relaxed text-slate-700">
          <li>
            <strong className="text-slate-900">管理者用</strong>
            … 管理者パネルを開くURL。限られた人だけに渡します。
          </li>
          <li>
            <strong className="text-slate-900">一般用（グループごと）</strong>
            … そのグループの一覧・編集ができます。持っている人は、グループ内の
            <strong className="text-slate-900">全員の予定や備考を見たり変えたり</strong>
            できます。
          </li>
        </ul>
        <div className="mt-4">
          <WarnBox>
            必要な人だけに配ってください。
            <br />
            配るときは「自分の名前で登録する」ことと
            <a href={GENERAL_MANUAL_PATH} className="mx-1 font-bold text-teal-800 underline">
              みなさん向けガイド
            </a>
            も一緒に伝えると安心です。
          </WarnBox>
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          コピーの手順
        </h2>
        <ProcedureSteps
          steps={[
            { title: '「入場URL」を開く', body: '管理者用と、グループごとの一般用が並びます。' },
            { title: '対象の「コピー」を押す', body: '端末によっては手動コピーが必要な場合があります。' },
            {
              title: 'チャットやメールで渡す',
              body: '短い住所を手打ちさせないでください。長いURLをそのまま開いてもらいます。',
            },
          ]}
        />
      </StepCard>

      <StepCard emphasize>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          再発行するとき
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          URLが漏れたり、古いリンクを無効にしたいときに使います。
        </p>
        <ProcedureSteps
          steps={[
            {
              title: '対象URLの「再発行」を開く',
              body: '最初に管理者へ渡された再発行用パスワード（または、あとから変更した新しいパスワード）が必要です。普段の入場用ではありません。画面に一度しか出ないので、控えてあるものを使います。',
            },
            {
              title: '再発行を確定する',
              body: '古いURLはすぐ使えなくなります。「ページが見つかりません」になるのは、だいたい古いリンクです。',
            },
            {
              title: '新しいURLを配り直す',
              body: 'ブックマークしている人にも、必ず新しい方を渡してください。',
            },
          ]}
        />
        <div className="mt-4">
          <WarnBox>
            いま使っている管理者用URLを再発行すると、その瞬間から今の入場は切れます。
            <br />
            新しい管理者URLを控えてから実行してください。
          </WarnBox>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500">
          再発行パスワード自体を変更する機能もあります。新しいパスワードも画面に一度しか出ないので、安全な場所に控えてください。
        </p>
      </StepCard>
    </div>

    <RelatedLinks
      items={[
        { href: adminManualHref('setup'), label: 'シーズン準備の流れ' },
        { href: adminManualHref('faq'), label: '困ったとき', note: 'URLが開けない' },
        { href: GENERAL_MANUAL_PATH, label: 'みなさん向けガイド' },
      ]}
    />

    <CheckList
      items={[
        '管理者用は少人数に限定した',
        '一般用はグループごとに配った',
        'みなさん向けガイドも案内した',
        '再発行したら旧URL利用者へ連絡した',
      ]}
    />
  </AdminManualShell>
);
