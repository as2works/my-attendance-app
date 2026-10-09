
import React, { useMemo, useState } from 'react';
import { Group } from '../types';
import { db } from '../services/database';

interface GroupsPanelProps {
  groups: Group[];
  onGroupsChange: (groups: Group[]) => void;
}

const GroupsPanel: React.FC<GroupsPanelProps> = ({ groups, onGroupsChange }) => {
  const [name, setName] = useState('');
  const [hasLodging, setHasLodging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLodging, setEditLodging] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  const deleteSource = useMemo(
    () => groups.find((g) => g.id === deleteId) || null,
    [groups, deleteId]
  );
  const deleteTargets = useMemo(
    () => groups.filter((g) => g.id !== deleteId),
    [groups, deleteId]
  );

  const refresh = async () => {
    onGroupsChange(await db.listGroups());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await db.createGroup({ name: name.trim(), hasLodgingStatuses: hasLodging });
      setName('');
      setHasLodging(false);
      await refresh();
      alert('グループを追加しました。入場URLも自動で作成されています。');
    } catch (err: any) {
      console.error(err);
      alert(err?.message === 'DUPLICATE_NAME' ? '同じ名前のグループがあります' : '追加に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (g: Group) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditLodging(g.hasLodgingStatuses);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || busy) return;
    setBusy(true);
    try {
      await db.updateGroup({
        id: editingId,
        name: editName.trim(),
        hasLodgingStatuses: editLodging,
      });
      setEditingId(null);
      await refresh();
    } catch (err: any) {
      console.error(err);
      alert(err?.message === 'DUPLICATE_NAME' ? '同じ名前のグループがあります' : '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const moveOrder = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= groups.length || busy) return;
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      onGroupsChange(await db.reorderGroups(next.map((g) => g.id)));
    } catch (err) {
      console.error(err);
      alert('並び替えに失敗しました');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const openDelete = (g: Group) => {
    const targets = groups.filter((x) => x.id !== g.id);
    if (!targets.length) {
      alert('最後の1グループは削除できません');
      return;
    }
    setDeleteId(g.id);
    setDeleteTargetId(targets[0].id);
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteTargetId || busy) return;
    setBusy(true);
    try {
      const result = await db.deleteGroup({ id: deleteId, targetGroupId: deleteTargetId });
      setDeleteId(null);
      await refresh();
      alert(
        `グループを削除しました。\n所属 ${result.movedUsers} 人と履歴を移動先へ移し、入場URLも無効にしました。`
      );
    } catch (err: any) {
      console.error(err);
      if (err?.message === 'LAST_GROUP') alert('最後の1グループは削除できません');
      else alert('削除に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-y-auto pr-2 pb-8">
      <div>
        <h3 className="text-xl font-black text-slate-800">グループ管理</h3>
        <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">
          追加すると一般用入場URLが自動作成されます。削除すると所属者と履歴は移動先へ移り、URLは使えなくなります。
        </p>
      </div>

      <form onSubmit={handleCreate} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-black text-slate-800">グループを追加</h4>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="グループ名（例: 第2寮）"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
        <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={hasLodging}
            onChange={(e) => setHasLodging(e.target.checked)}
            className="w-5 h-5 rounded text-indigo-600"
          />
          寮用記号あり（入寮・退寮）
        </label>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black disabled:opacity-40"
        >
          追加する
        </button>
      </form>

      <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
        {groups.map((g, index) => (
          <div key={g.id} className="p-5 space-y-3">
            {editingId === g.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                />
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editLodging}
                    onChange={(e) => setEditLodging(e.target.checked)}
                    className="w-5 h-5 rounded text-indigo-600"
                  />
                  寮用記号あり（入寮・退寮）
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl bg-slate-100 font-bold">
                    やめる
                  </button>
                  <button type="button" onClick={saveEdit} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-black">
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black text-slate-800 text-lg">{g.name}</div>
                  <div className="text-xs font-bold text-slate-400 mt-0.5">
                    {g.hasLodgingStatuses ? '寮用記号あり' : '通常記号のみ'}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => moveOrder(index, -1)}
                    disabled={index === 0 || busy}
                    className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 disabled:opacity-30"
                    title="上へ"
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOrder(index, 1)}
                    disabled={index === groups.length - 1 || busy}
                    className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 disabled:opacity-30"
                    title="下へ"
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(g)}
                    className="px-3 h-9 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => openDelete(g)}
                    className="px-3 h-9 rounded-lg text-xs font-bold text-rose-600 bg-rose-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {deleteSource && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100">
            <h4 className="text-lg font-black text-slate-800">このグループを本当に削除してよいですか？</h4>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              「{deleteSource.name}」を削除します。<br />
              ・所属している人は消しません（下で選ぶグループへ移動）<br />
              ・その人たちの履歴も一緒に移動します<br />
              ・このグループの入場URLはすぐに使えなくなります
            </p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">移動先グループ</label>
              <select
                value={deleteTargetId}
                onChange={(e) => setDeleteTargetId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
              >
                {deleteTargets.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy || !deleteTargetId}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black disabled:opacity-40"
              >
                {busy ? '処理中…' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPanel;
