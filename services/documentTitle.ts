export const APP_DOCUMENT_TITLE = 'KSS出勤予定確認';

/** ブラウザタブ用。画面見出し + サイト名 */
export function setDocumentTitle(pageTitle?: string | null) {
  const trimmed = typeof pageTitle === 'string' ? pageTitle.trim() : '';
  document.title = trimmed ? `${trimmed} | ${APP_DOCUMENT_TITLE}` : APP_DOCUMENT_TITLE;
}
