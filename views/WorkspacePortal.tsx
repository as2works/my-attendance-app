import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { db } from '../services/database';
import { Workspace, WORKSPACE_NOTE_MAX_LENGTH } from '../types';
import { buildAccessUrl } from '../services/accessPath';

interface WorkspacePortalProps {
  onLogout: () => void;
}

const WorkspacePortal: React.FC<WorkspacePortalProps> = ({ onLogout }) => {
  const [items, setItems] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createNote, setCreateNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdSecrets, setCreatedSecrets] = useState<{
    name: string;
    reissuePassword: string;
    adminUrl?: string;
  } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await db.listWorkspaces();
      setItems(list);
    } catch (err) {
      console.error(err);
      alert('箱一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 3500);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await db.createWorkspace({ name, note: createNote });
      setCreateName('');
      setCreateNote('');
      await refresh();
      showNotice('空の箱を作成しました');
      if (created.reissuePassword) {
        setCreatedSecrets({
          name: created.name,
          reissuePassword: created.reissuePassword,
          adminUrl: created.adminLinkId ? buildAccessUrl(created.adminLinkId) : undefined,
        });
      }
    } catch (err: any) {
      console.error(err);
      if (String(err?.message).includes('DUPLICATE_NAME')) {
        alert('同じ名前の箱が既にあります。');
      } else {
        alert('箱の作成に失敗しました。');
      }
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (ws: Workspace) => {
    setEditId(ws.id);
    setEditName(ws.name);
    setEditNote(ws.note || '');
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusyId(editId);
    try {
      await db.updateWorkspace({
        id: editId,
        name: editName.trim(),
        note: editNote,
      });
      setEditId(null);
      await refresh();
      showNotice('箱を更新しました');
    } catch (err: any) {
      console.error(err);
      if (String(err?.message).includes('DUPLICATE_NAME')) {
        alert('同じ名前の箱が既にあります。');
      } else {
        alert('更新に失敗しました。');
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusyId(deleteId);
    try {
      await db.deleteWorkspace(deleteId);
      setDeleteId(null);
      await refresh();
      showNotice('箱を削除しました');
    } catch (err: any) {
      console.error(err);
      if (String(err?.message).includes('LAST_WORKSPACE')) {
        alert('最後の1箱は削除できません。');
      } else {
        alert('削除に失敗しました。');
      }
    } finally {
      setBusyId(null);
    }
  };

  const copyAdminUrl = async (ws: Workspace) => {
    if (!ws.adminLinkId) {
      alert('管理者URLがまだありません。再読み込みしてください。');
      return;
    }
    const url = buildAccessUrl(ws.adminLinkId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(ws.id);
      window.setTimeout(() => setCopiedId((c) => (c === ws.id ? null : c)), 2000);
    } catch {
      alert(`コピーに失敗しました。\n${url}`);
    }
  };

  const deleteTarget = items.find((w) => w.id === deleteId);

  return (
    <Layout title="箱一覧（ポータル）" onLogout={onLogout}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-800">予定管理の箱</h2>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              シーズンや拠点ごとに箱を分けます。中身の管理は各箱の管理者URLから行います。
            </p>
          </div>
          {notice && (
            <p className="text-sm font-bold text-emerald-600">
              <i className="fas fa-check-circle mr-1.5"></i>
              {notice}
            </p>
          )}
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-800">新しい箱を作成（空）</h3>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="箱の名前（例: 2027冬 / 拠点B）"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <textarea
              value={createNote}
              onChange={(e) => setCreateNote(e.target.value.slice(0, WORKSPACE_NOTE_MAX_LENGTH))}
              placeholder="備考（任意）例: 管理者の教育用"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-y"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              className="self-start px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black rounded-xl transition"
            >
              {creating ? '作成中…' : '空の箱を作成'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-400 font-bold">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              読み込み中…
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold">箱がありません</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((ws) => (
                <li key={ws.id} className="p-4 sm:p-5 space-y-3">
                  {editId === ws.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                      />
                      <textarea
                        value={editNote}
                        onChange={(e) =>
                          setEditNote(e.target.value.slice(0, WORKSPACE_NOTE_MAX_LENGTH))
                        }
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={busyId === ws.id || !editName.trim()}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-black rounded-lg"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-lg font-black text-slate-800 truncate">{ws.name}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            期間 {ws.seasonStartDate || '—'} 〜 {ws.seasonEndDate || '—'}
                            <span className="mx-1.5 text-slate-300">|</span>
                            グループ {ws.groupCount ?? 0}
                            <span className="mx-1.5 text-slate-300">|</span>
                            利用者 {ws.userCount ?? 0}
                          </p>
                          {ws.note ? (
                            <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap break-words">
                              {ws.note}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-2">備考なし</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(ws)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
                          >
                            編集
                          </button>
                          {ws.adminLinkId && (
                            <a
                              href={buildAccessUrl(ws.adminLinkId)}
                              className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100"
                            >
                              開く
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteId(ws.id)}
                            className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <span className="text-[11px] font-black text-slate-500 shrink-0">管理者URL</span>
                        <code className="text-[11px] sm:text-xs text-slate-700 break-all flex-1 font-mono">
                          {ws.adminLinkId ? buildAccessUrl(ws.adminLinkId) : '（未発行）'}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyAdminUrl(ws)}
                          disabled={!ws.adminLinkId}
                          className="shrink-0 px-3 py-1.5 text-xs font-black text-white bg-slate-800 rounded-lg disabled:bg-slate-300"
                        >
                          {copiedId === ws.id ? 'コピー済み' : 'コピー'}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {createdSecrets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-emerald-800">箱を作成しました</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              「{createdSecrets.name}」の入場URL再発行用パスワードです。<strong>この画面でしか表示されません</strong>。必ず控えてください。
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[11px] font-bold text-slate-500 mb-1">再発行用パスワード</p>
              <code className="text-sm font-mono font-black text-slate-800 break-all">
                {createdSecrets.reissuePassword}
              </code>
            </div>
            {createdSecrets.adminUrl && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-[11px] font-bold text-slate-500 mb-1">管理者URL</p>
                <a href={createdSecrets.adminUrl} className="text-xs font-bold text-indigo-700 break-all underline">
                  {createdSecrets.adminUrl}
                </a>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCreatedSecrets(null)}
              className="w-full py-3 rounded-xl bg-slate-800 text-white font-black"
            >
              控えました
            </button>
          </div>
        </div>
      )}

      {deleteId && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">箱を削除しますか？</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              「{deleteTarget.name}」とその中のグループ・利用者・予定・履歴・入場URLがすべて削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 bg-slate-100"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busyId === deleteId}
                className="px-4 py-2 rounded-xl font-black text-white bg-rose-600 hover:bg-rose-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default WorkspacePortal;
