/** マニュアル（ログイン不要・入場URLなしで開ける） */

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
  | 'tour'
  | 'daily'
  | 'edit'
  | 'csv'
  | 'setup'
  | 'season'
  | 'groups'
  | 'users'
  | 'links'
  | 'faq';

/** 旧URL → 新slug（ブックマーク互換） */
export const ADMIN_MANUAL_LEGACY_REDIRECTS: Record<string, AdminManualSlug> = {
  overview: 'daily',
  history: 'daily',
};

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
    slug: 'tour',
    path: `${ADMIN_MANUAL_PATH}/tour`,
    title: '画面の全体像',
    short: '画面の全体像',
    desc: '左メニュー・グループ切替・未消込バッジ・ヘッダー。何が「いまのグループだけ」か',
    inToc: true,
    section: 'はじめて読む',
    emphasize: true,
  },
  {
    slug: 'daily',
    path: `${ADMIN_MANUAL_PATH}/daily`,
    title: '毎日の確認と消込',
    short: '確認と消込',
    desc: '予定一覧の見方、履歴の確認、未消込の消し方',
    inToc: true,
    section: '毎日の作業',
    emphasize: true,
  },
  {
    slug: 'edit',
    path: `${ADMIN_MANUAL_PATH}/edit`,
    title: '一般画面で予定を直す',
    short: '一般画面で直す',
    desc: '「一般画面へ」の往復、備考と登録の違い、シーズン外の注意',
    inToc: true,
    section: '毎日の作業',
  },
  {
    slug: 'csv',
    path: `${ADMIN_MANUAL_PATH}/csv`,
    title: '出勤CSVを出す',
    short: 'CSV出力',
    desc: '全グループ・期間分の出勤確認表。列の意味と出せないときの確認',
    inToc: true,
    section: '毎日の作業',
  },
  {
    slug: 'setup',
    path: `${ADMIN_MANUAL_PATH}/setup`,
    title: 'シーズン準備の流れ',
    short: '準備の流れ',
    desc: '期間 → グループ → 利用者 → URL配布 → 入力依頼の順番',
    inToc: true,
    section: 'シーズンの準備',
    emphasize: true,
  },
  {
    slug: 'season',
    path: `${ADMIN_MANUAL_PATH}/season`,
    title: '期間・休日・表示設定',
    short: '期間・休日',
    desc: '入力できる期間、休日の赤表示、ユーザIDの表示／非表示',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'groups',
    path: `${ADMIN_MANUAL_PATH}/groups`,
    title: 'グループを整える',
    short: 'グループ',
    desc: '追加・寮記号・並べ替え・削除（URL無効化と利用者の移動）',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'users',
    path: `${ADMIN_MANUAL_PATH}/users`,
    title: '利用者を登録する',
    short: '利用者',
    desc: '手入力、並べ替え、移動・削除、CSV取込ウィザード',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'links',
    path: `${ADMIN_MANUAL_PATH}/links`,
    title: '入場URLと再発行',
    short: '入場URL',
    desc: '管理者用・一般用のコピー、配り方、再発行とパスワード',
    inToc: true,
    section: 'シーズンの準備',
  },
  {
    slug: 'faq',
    path: `${ADMIN_MANUAL_PATH}/faq`,
    title: '困ったとき',
    short: '困ったとき',
    desc: '症状別の確認手順（期間・速さ・URL・消込など）',
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
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === ADMIN_MANUAL_PATH) return 'index';
  const rest = p.slice(ADMIN_MANUAL_PATH.length + 1);
  const raw = rest.split('/')[0] || '';
  if (ADMIN_MANUAL_LEGACY_REDIRECTS[raw]) return ADMIN_MANUAL_LEGACY_REDIRECTS[raw];
  return getSlugFromPages(ADMIN_MANUAL_PAGES, ADMIN_MANUAL_PATH, pathname) as AdminManualSlug;
}

export function generalManualHref(slug: GeneralManualSlug): string {
  return GENERAL_MANUAL_PAGES.find((p) => p.slug === slug)?.path || GENERAL_MANUAL_PATH;
}

export function adminManualHref(slug: AdminManualSlug): string {
  return ADMIN_MANUAL_PAGES.find((p) => p.slug === slug)?.path || ADMIN_MANUAL_PATH;
}
