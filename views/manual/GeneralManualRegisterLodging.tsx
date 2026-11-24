import React from 'react';
import { generalManualHref } from '../../services/manualPath';
import { LODGING_OVERNIGHT_CELL_CLASS } from '../../constants';
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

const GeneralManualRegisterLodging: React.FC = () => (
  <ManualShell
    slug="register-lodging"
    pageTitle="予定の入れ方（寮版）"
    headerHref="#steps"
    headerLabel="下の手順へ"
  >
    <PageHero
      badge="寮グループの人向け"
      title={
        <>
          寮の出勤・宿泊予定を
          <br />
          <span className="bg-gradient-to-r from-yellow-600 to-teal-700 bg-clip-text text-transparent">
            入れる方法
          </span>
        </>
      }
      lead={
        <>
          自宅グループより少し手順が増えます。
          <br />
          このページだけ読めば、寮の予定が入れられるように書いてあります。
        </>
      }
    />

    <div className="rounded-[1.5rem] border border-yellow-200 bg-yellow-50 p-4 sm:p-5">
      <p className="text-sm font-bold text-yellow-900">このページを読む人</p>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-700">
        所属が<strong className="text-slate-900">寮グループ</strong>
        （画面に「宿泊」チェックが出るグループ）の人です。
        宿泊チェックが無いグループの人は、ふつうの
        <a
          href={generalManualHref('register')}
          className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
        >
          予定の入れ方
        </a>
        を見てください。
      </p>
    </div>

    <SummaryList
      label="このあとの手順（まとめ）"
      items={[
        { n: 1, title: '自分の名前を開く', desc: '一覧で自分の「編集」を押します' },
        { n: 2, title: '〇や×を選ぶ', desc: 'その日の出勤（仕事）の予定です' },
        { n: 3, title: '宿泊にチェック', desc: '寮に泊まる日は、右の「宿泊」をONにします' },
        { n: 4, title: '「登録する」を押す', desc: '最後に押さないと、何も残りません' },
      ]}
    />

    <div id="steps" className="min-w-0 max-w-full space-y-8 sm:space-y-10">
      <StepCard>
        <div className="mb-3 flex items-center gap-3">
          <StepBadge n={1} />
          <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            自分の名前を開く
          </h2>
        </div>
        <p className="text-base font-medium leading-relaxed text-slate-700">
          名前が並んでいる一覧で、
          <strong className="text-slate-900">自分の名前の下の「編集」</strong>
          を押します。
        </p>
        <div className="mt-4">
          <WarnBox>
            ほかの人の行は押さないでください。
            <br />
            名前が見つからないときは、上の検索欄か、管理者の人に聞いてください。
          </WarnBox>
        </div>
        <div className="mt-6 min-w-0 max-w-full">
          <MainListScreenMock highlightUser searchQuery="山田" highlightSearch />
        </div>
      </StepCard>

      <StepCard>
        <div className="mb-3 flex items-center gap-3">
          <StepBadge n={2} />
          <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            出勤の記号（〇×など）を選ぶ
          </h2>
        </div>
        <p className="text-base font-medium leading-relaxed text-slate-700">
          日付の<strong className="text-slate-900">真ん中</strong>
          にあるボタンが、その日の出勤予定です。自宅グループと同じ記号です。
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            { s: '〇', l: '出られる', c: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            { s: '×', l: '休みたい', c: 'bg-slate-200 text-slate-700 border-slate-300' },
            { s: '△', l: 'まだ未定', c: 'bg-orange-100 text-orange-800 border-orange-200' },
            { s: 'AM', l: '午前だけ', c: 'bg-sky-100 text-sky-700 border-sky-200' },
            { s: 'PM', l: '午後だけ', c: 'bg-violet-100 text-violet-700 border-violet-200' },
            { s: '未入力', l: 'まだ決めていない', c: 'bg-white text-slate-500 border-slate-200' },
          ].map((x) => (
            <div key={x.s} className={`rounded-xl border px-2 py-2.5 text-center ${x.c}`}>
              <div className="font-display text-sm font-extrabold sm:text-base">{x.s}</div>
              <div className="mt-0.5 text-[10px] font-bold leading-tight">{x.l}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
          ここは「その日仕事があるか」だけを選びます。泊まるかどうかは、次のステップです。
        </p>
      </StepCard>

      <StepCard emphasize>
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <StepBadge n={3} />
              <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
                右の「宿泊」にチェックする
              </h2>
            </div>
            <p className="text-base font-medium leading-relaxed text-slate-700">
              日付の<strong className="text-slate-900">右端</strong>
              に「宿泊」があります。
              <br />
              <strong className="text-slate-900">寮に泊まる日は、すべてチェックをON</strong>
              にしてください。
            </p>
            <ul className="mt-3 space-y-2 text-sm font-medium leading-relaxed text-slate-600">
              <li>
                ・<strong className="text-slate-900">入寮する日もON</strong>
                （その夜から泊まるなら、入った日にチェック）
              </li>
              <li>
                ・泊まり続ける日は、毎日ONのまま
              </li>
              <li>
                ・<strong className="text-slate-900">退寮する日はOFF</strong>
                （その日はもう泊まらない）
              </li>
              <li>
                ・行事などで<strong className="text-slate-900">出勤は休み（×）でも泊まる</strong>
                日は、×を選んだうえで宿泊だけON
              </li>
            </ul>
            <div className="mt-4">
              <WarnBox>
                出勤の〇×と、宿泊チェックは別ものです。
                <br />
                「出る／休む」と「泊まる／泊まらない」を、それぞれ選んでください。
              </WarnBox>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <EditScheduleScreenMock
              pick={[
                { date: '1/9（金）', status: '〇', lodging: true },
                { date: '1/10（土）', status: '×', tone: 'text-blue-600', lodging: true },
                { date: '1/11（日）', status: '〇', tone: 'text-rose-600', lodging: false },
              ]}
            />
            <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
              例：9〜10日は宿泊ON、11日（退寮日）は宿泊OFF
            </p>
          </div>
        </div>
      </StepCard>

      <StepCard emphasize>
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <StepBadge n={4} />
              <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
                最後に「登録する」を押す
              </h2>
            </div>
            <p className="text-base font-medium leading-relaxed text-slate-700">
              〇×や宿泊を選んだだけでは終わりません。
              <br />
              画面上の
              <strong className="text-indigo-700">青い「登録する」</strong>
              を押してください。
            </p>
            <div className="mt-4">
              <WarnBox>
                「未保存です」と出ていたら、まだ残っていません。
                <br />
                必ず「登録する」を押してから戻ってください。
              </WarnBox>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <EditScheduleScreenMock
              highlightSave
              pick={[
                { date: '1/9（金）', status: '〇', lodging: true },
                { date: '1/10（土）', status: '×', tone: 'text-blue-600', lodging: true },
              ]}
            />
          </div>
        </div>
      </StepCard>

      <StepCard>
        <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
          登録したあと、一覧ではこう見えます
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          宿泊にチェックした日は、マスの背景が
          <strong className="text-slate-900">黄色</strong>
          になります（入寮日も含みます）。
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[20rem] border-collapse text-center text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="border-b border-slate-200 px-2 py-2 text-left font-bold">日付の例</th>
                <th className="border-b border-slate-200 px-2 py-2 font-bold">9日</th>
                <th className="border-b border-slate-200 px-2 py-2 font-bold">10日</th>
                <th className="border-b border-slate-200 px-2 py-2 font-bold">11日</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-slate-100 px-2 py-2 text-left font-bold text-slate-700">
                  あなた
                </td>
                <td className={`border-b border-slate-100 px-1 py-2 ${LODGING_OVERNIGHT_CELL_CLASS}`}>
                  <span className="inline-flex rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                    〇in
                  </span>
                </td>
                <td className={`border-b border-slate-100 px-1 py-2 ${LODGING_OVERNIGHT_CELL_CLASS}`}>
                  <span className="inline-flex rounded border border-slate-300 bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                    ×
                  </span>
                </td>
                <td className="border-b border-slate-100 bg-rose-50/50 px-1 py-2">
                  <span className="inline-flex rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                    〇out
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-2 text-sm font-medium leading-relaxed text-slate-600">
          <li>
            ・黄色いマス＝その日は<strong className="text-slate-900">宿泊ON</strong>
          </li>
          <li>
            ・<strong className="text-slate-900">〇in</strong>
            などと見える日＝「出勤の記号」＋「入寮・退寮の境目」をまとめて表示したものです（入力画面では別々に選びます）
          </li>
          <li>
            ・<strong className="text-slate-900">AM out</strong> /{' '}
            <strong className="text-slate-900">PM out</strong>{' '}
            のように、英字のときはスペースが入って折り返し表示されることがあります
          </li>
          <li>
            ・退寮日（宿泊OFF）は黄色になりません
          </li>
        </ul>
      </StepCard>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <h3 className="font-display text-sm font-extrabold text-slate-900">よくある入れ方</h3>
          <ul className="mt-2 space-y-1.5 text-sm font-medium leading-relaxed text-slate-600">
            <li>・仕事ありで入寮 → 〇 ＋ 宿泊ON</li>
            <li>・休みで入寮 → × ＋ 宿泊ON</li>
            <li>・仕事して退寮 → 〇 ＋ 宿泊OFF（退寮日）</li>
            <li>・休みで退寮 → × ＋ 宿泊OFF</li>
          </ul>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <h3 className="font-display text-sm font-extrabold text-slate-900">記号で足りないとき</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            「午前だけ退寮」など細かい連絡は、上の「備考を書く」へ。ただし備考を書いても、予定は「登録する」を押さないと残りません。くわしくは
            <a
              href={generalManualHref('note')}
              className="mx-1 font-bold text-teal-700 underline decoration-teal-300 underline-offset-2"
            >
              備考の書き方
            </a>
            へ。
          </p>
        </div>
      </section>
    </div>

    <DarkRecap>
      <ol className="space-y-2">
        <li>1. 自分の「編集」を押す</li>
        <li>2. 出勤は 〇×△AM PM で選ぶ</li>
        <li>3. 泊まる日は右の「宿泊」をON（入寮日もON／退寮日はOFF）</li>
        <li>
          4. <span className="text-teal-300">青い「登録する」を押す</span>
        </li>
      </ol>
      <p className="mt-4 text-sm font-medium text-slate-400">
        自宅グループの人は
        <a href={generalManualHref('register')} className="mx-1 text-teal-300 underline">
          予定の入れ方
        </a>
        を見てください。
      </p>
    </DarkRecap>
  </ManualShell>
);

export default GeneralManualRegisterLodging;
