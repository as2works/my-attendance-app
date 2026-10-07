
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** パス先頭のトークンを取る（例: /{uuid} → uuid） */
export function getAccessTokenFromPath(pathname = window.location.pathname): string | null {
  const segment = pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  if (!segment || !UUID_RE.test(segment)) return null;
  return segment;
}

export function buildAccessUrl(linkId: string, origin = window.location.origin): string {
  return `${origin}/${linkId}`;
}
