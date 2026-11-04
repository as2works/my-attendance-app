/** マニュアル（ログイン不要・全箱共通） */

export const GENERAL_MANUAL_PATH = '/manual/general';
export const ADMIN_MANUAL_PATH = '/manual/admin';

export type ManualNavPage = {
  slug: string;
  path: string;
  title: string;
  short: string;
  desc: string;
  inToc: boolean;
  emphasize?: boolean;
  section?: string;
};

export type GeneralManualSlug = 'index' | 'register' | 'open' | 'list' | 'note' | 'faq';

export const GENERAL_MANUAL_PAGES: ManualNavPage[] = [
  {
    slug: 'index',
    path: GENERAL_MANUAL_PATH,
    title: '使い方ガイド',
    short: '目次',
    desc: '',
    inToc: false,
  },
  {
    slug: 'register',
    path: `${GENERAL_MANUAL_PATH}/register`,
    title: '予定の入れ方',
    short: '予定を入れる',
    desc: 'いちばん大事。自分の名前を開き、〇や×を選んで「登録する」を押します',
    inToc: true,
    emphasize: true,
  },
  {
    slug: 'open',
    path: `${GENERAL_MANUAL_PATH}/open`,
    title: 'はじめて開くとき',
    short: 'はじめて開く',
    desc: 'もらった長いURLから開きます。パスワードはありません',
    inToc: true,
  },
  {
    slug: 'list',
    path: `${GENERAL_MANUAL_PATH}/list`,
    title: '一覧画面の見方',
    short: '一覧の見方',
    desc: '月の変え方、〇×の意味、名前の探し方',
    inToc: true,
  },
  {
    slug: 'note',
    path: `${GENERAL_MANUAL_PATH}/note`,
    title: '備考の書き方',
    short: '備考を書く',
    desc: '〇や×だけで伝えにくいことを残すとき',
    inToc: true,
  },
  {
    slug: 'faq',
    path: `${GENERAL_MANUAL_PATH}/faq`,
    title: '困ったとき',
    short: '困ったとき',
    desc: 'よくある質問と、うまくいかないときの確かめ方',
    inToc: true,
  },
];

export type AdminManualSlug =
  | 'index'
  | 'overview'
  | 'history'
  | 'csv'
  | 'setup'
  | 'season'
  | 'groups'
  | 'users'
  | 'links'
  | 'faq';

export const ADMIN_MANUAL_PAGES: ManualNavPage[] = [
  {
    slug: 'index',
    path: ADMIN_MANUAL_PATH,
    title: '管理者ガイド',
    short: '目次',
    desc: '',
    inToc: false,
  },
  {
    slug: 'overview',
    path: `${ADMIN_MANUAL_PATH}/overview`,
    title: '予定一覧で確認する',
    short: '一覧の確認',
    desc: 'グループ切替・月送り・未入力の見つけ方',
    inToc: true,
    section: '毎日・よく使う',
    emphasize: true,
  },
  {
    slug: 'history',
    path: `${ADMIN_MANUAL_PATH}/history`,
    title: '連絡・履歴を処理する',
    short: '履歴の消込',
    desc: '下の履歴パネルと未消込の消し方',
    inToc: true,
    section: '毎日・よく使う',
  },
  {
    slug: 'csv',
    path: `${ADMIN_MANUAL_PATH}/csv`,
    title: '出勤CSVを出す',
    short: 'CSV出力',
    desc: '左メニューから全グループ分をダウンロード',
    inToc: true,
    section: '毎日・よく使う',
  },
  {
    slug: 'setup',
    path: `${ADMIN_MANUAL_PATH}/setup`,
    title: 'シーズン準備の流れ',
    short: '準備の流れ',
    desc: '期間→グループ→利用者→URL配布の順番',
    inToc: true,
    section: 'シーズンの準備',
    emphasize: true,
  },
  {
    slug: 'season',
    path: `${ADMIN_MANUAL_PATH}/season`,
    title: '期間・休日を設定する',
    short: '期間・休日',
    desc: '入力できる期間と休日の色付け',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'groups',
    path: `${ADMIN_MANUAL_PATH}/groups`,
    title: 'グループを整える',
    short: 'グループ',
    desc: 'グループの追加と、寮の in / out 記号',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'users',
    path: `${ADMIN_MANUAL_PATH}/users`,
    title: '利用者を登録する',
    short: '利用者',
    desc: '手入力とCSV取込、移動・削除',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'links',
    path: `${ADMIN_MANUAL_PATH}/links`,
    title: '入場URLを配る',
    short: '入場URL',
    desc: '管理者用・一般用のコピーと再発行',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'faq',
    path: `${ADMIN_MANUAL_PATH}/faq`,
    title: '困ったとき',
    short: '困ったとき',
    desc: '期間変更後の表示、読み込みの速さ、よくある質問',
    inToc: true,
    section: '困ったとき',
  },
];

export function isGeneralManualPath(pathname = window.location.pathname): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return p === GENERAL_MANUAL_PATH || p.startsWith(`${GENERAL_MANUAL_PATH}/`);
}

export function isAdminManualPath(pathname = window.location.pathname): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return p === ADMIN_MANUAL_PATH || p.startsWith(`${ADMIN_MANUAL_PATH}/`);
}

export function isAnyManualPath(pathname = window.location.pathname): boolean {
  return isGeneralManualPath(pathname) || isAdminManualPath(pathname);
}

function getSlugFromPages(pages: ManualNavPage[], homePath: string, pathname: string): string {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === homePath) return 'index';
  const rest = p.slice(homePath.length + 1);
  const slug = rest.split('/')[0] || '';
  const hit = pages.find((page) => page.slug === slug && page.slug !== 'index');
  return hit ? hit.slug : 'index';
}

export function getGeneralManualSlug(pathname = window.location.pathname): GeneralManualSlug {
  return getSlugFromPages(GENERAL_MANUAL_PAGES, GENERAL_MANUAL_PATH, pathname) as GeneralManualSlug;
}

export function getAdminManualSlug(pathname = window.location.pathname): AdminManualSlug {
  return getSlugFromPages(ADMIN_MANUAL_PAGES, ADMIN_MANUAL_PATH, pathname) as AdminManualSlug;
}

export function generalManualHref(slug: GeneralManualSlug): string {
  return GENERAL_MANUAL_PAGES.find((p) => p.slug === slug)?.path || GENERAL_MANUAL_PATH;
}

export function adminManualHref(slug: AdminManualSlug): string {
  return ADMIN_MANUAL_PAGES.find((p) => p.slug === slug)?.path || ADMIN_MANUAL_PATH;
}
