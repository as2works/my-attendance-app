
import React, { useEffect, useState } from 'react';
import { AccessLink, GROUP_IDS, GROUP_LABELS, GroupId } from '../types';
import { db } from '../services/database';
import { buildAccessUrl } from '../services/accessPath';

type LinkKind = 'ADMIN' | 'DORM' | 'HOME';

interface AccessLinksPanelProps {
  /** いま開いている管理者 URL の linkId。管理者 URL 再発行後の案内に使う */
  currentLinkId: string;
}

function kindLabel(kind: LinkKind): string {
  if (kind === 'ADMIN') return '管理者用（他の人に送らない）';
  if (kind === 'DORM') return `一般用・${GROUP_LABELS.dorm}`;
  return `一般用・${GROUP_LABELS.home}`;
}

function matchKind(link: AccessLink, kind: LinkKind): boolean {
  if (kind === 'ADMIN') return link.role === 'ADMIN';
  if (kind === 'DORM') return link.role === 'GENERAL' && link.groupId === GROUP_IDS.DORM;
  return link.role === 'GENERAL' && link.groupId === GROUP_IDS.HOME;
}

function reissueParams(kind: LinkKind): { role: 'ADMIN' | 'GENERAL'; groupId?: GroupId } {
  if (kind === 'ADMIN') return { role: 'ADMIN' };
  if (kind === 'DORM') return { role: 'GENERAL', groupId: GROUP_IDS.DORM };
  return { role: 'GENERAL', groupId: GROUP_IDS.HOME };
}

const AccessLinksPanel: React.FC<AccessLinksPanelProps> = ({ currentLinkId }) => {
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [reissueKind, setReissueKind] = useState<LinkKind | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [reissuedAdmin, setReissuedAdmin] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await db.listAccessLinks();
    setLinks(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('コピーに失敗しました。URLを手動で選択してコピーしてください。');
    }
  };

  const openReissue = (kind: LinkKind) => {
    setReissueKind(kind);
    setPassword('');
    setError('');
  };

  const closeReissue = () => {
    if (busy) return;
    setReissueKind(null);
    setPassword('');
    setError('');
  };

  const submitReissue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reissueKind) return;
    setBusy(true);
    setError('');
    try {
      const params = reissueParams(reissueKind);
      const created = await db.reissueAccessLink({
        ...params,
        password,
      });
      const url = buildAccessUrl(created.id);
      const wasCurrentAdmin =
        reissueKind === 'ADMIN' && currentLinkId === links.find(l => l.role === 'ADMIN')?.id;

      setNewUrl(url);
      setReissuedAdmin(!!wasCurrentAdmin);
      setReissueKind(null);
      setPassword('');
      await load();
    } catch (err: any) {
      if (err?.message === 'INVALID_REISSUE_PASSWORD') {
        setError('パスワードが正しくありません');
      } else {
        console.error(err);
        setError('再発行に失敗しました');
      }
    } finally {
      setBusy(false);
    }
  };

  const kinds: LinkKind[] = ['ADMIN', 'DORM', 'HOME'];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-y-auto pr-2 pb-8">
      <div>
        <h3 className="text-xl font-black text-slate-800">入場URL</h3>
        <p className="text-sm text-slate-500 font-medium mt-1">
          いつでもコピーできます。なくしたときだけ再発行してください。再発行すると古いURLは使えなくなります。
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 font-bold flex items-center gap-2">
          <i className="fas fa-spinner fa-spin"></i>
          読み込み中...
        </div>
      ) : (
        <div className="space-y-4">
          {kinds.map((kind) => {
            const link = links.find(l => matchKind(l, kind));
            const url = link ? buildAccessUrl(link.id) : '';
            return (
              <div key={kind} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h4 className={`font-black text-sm ${kind === 'ADMIN' ? 'text-rose-700' : 'text-slate-800'}`}>
                    {kindLabel(kind)}
                  </h4>
                  <button
                    type="button"
                    onClick={() => openReissue(kind)}
                    disabled={!link}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    再発行…
                  </button>
                </div>
                {link ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={url}
                      className="flex-grow px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => copyText(url, link.id)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm whitespace-nowrap"
                    >
                      {copiedId === link.id ? 'コピーしました' : 'コピー'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-rose-500 font-bold">URLがありません。再読み込みするか、開発者に確認してください。</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-sm text-amber-900 font-medium leading-relaxed">
        再発行には、あらかじめ設定された専用パスワードが必要です（普段の入場とは別です）。パスワードは DynamoDB の Config（id=system）の <code className="text-xs">reissuePassword</code> にあります。
      </div>

      {reissueKind && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={submitReissue}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100"
          >
            <h4 className="text-lg font-black text-slate-800">URLを再発行</h4>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              「{kindLabel(reissueKind)}」を作り直します。<br />
              古いURLはすぐに無効になります。新しいURLを必ず控えてください。
            </p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">再発行用パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className={`w-full px-4 py-3 rounded-xl border-2 font-bold ${error ? 'border-rose-400 bg-rose-50/40' : 'border-slate-100'} focus:outline-none focus:ring-4 focus:ring-indigo-100`}
                placeholder="パスワードを入力"
                autoFocus
              />
              {error && <p className="text-rose-500 text-sm font-bold mt-2">{error}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeReissue}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                やめる
              </button>
              <button
                type="submit"
                disabled={busy || !password}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black disabled:opacity-40"
              >
                {busy ? '処理中…' : '再発行する'}
              </button>
            </div>
          </form>
        </div>
      )}

      {newUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-emerald-100">
            <h4 className="text-lg font-black text-emerald-800">新しいURLができました</h4>
            <p className="text-sm text-slate-600 font-medium">
              下のURLをコピーして保存してください。この画面を閉じる前に控えないと、あとから探せなくなります。
            </p>
            <textarea
              readOnly
              value={newUrl}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-slate-800 text-sm font-mono font-bold"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => copyText(newUrl, 'new')}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
              >
                {copiedId === 'new' ? 'コピーしました' : '新しいURLをコピー'}
              </button>
              {reissuedAdmin ? (
                <button
                  type="button"
                  onClick={() => { window.location.href = newUrl; }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  新しいURLで開き直す
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setNewUrl(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  閉じる
                </button>
              )}
            </div>
            {reissuedAdmin && (
              <p className="text-xs text-rose-600 font-bold">
                管理者URLを作り直したので、今のページはもう無効です。コピーしたあと「新しいURLで開き直す」を押してください。
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessLinksPanel;
