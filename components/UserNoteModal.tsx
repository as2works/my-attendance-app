import React, { useEffect, useState } from 'react';
import { USER_NOTE_MAX_LENGTH } from '../types';
import { db } from '../services/database';
import type { GroupId } from '../types';

interface UserNoteModalProps {
  userId: string;
  userName: string;
  groupId: GroupId;
  initialNote?: string;
  onClose: () => void;
  onSaved: (note: string) => void;
}

const UserNoteModal: React.FC<UserNoteModalProps> = ({
  userId,
  userName,
  groupId,
  initialNote = '',
  onClose,
  onSaved,
}) => {
  const [draft, setDraft] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(initialNote);
    setError('');
  }, [initialNote, userId]);

  const trimmed = draft.replace(/\r\n/g, '\n').trim();
  const initialTrimmed = (initialNote || '').replace(/\r\n/g, '\n').trim();
  const dirty = trimmed !== initialTrimmed;
  const overLimit = draft.length > USER_NOTE_MAX_LENGTH;

  const handleSave = async () => {
    if (overLimit || !dirty) return;
    setSaving(true);
    setError('');
    try {
      const result = await db.saveUserNote(userId, draft, groupId);
      onSaved(result.note);
      onClose();
    } catch (e) {
      console.error(e);
      setError('保存に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-note-title"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 id="user-note-title" className="text-lg font-black text-slate-800">
              備考
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            aria-label="閉じる"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, USER_NOTE_MAX_LENGTH))}
            rows={6}
            placeholder="記号で表せない連絡事項（例: 1/15は残業できません）"
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-800 font-medium leading-relaxed focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none resize-y min-h-[140px]"
          />
          <div className="flex justify-between items-center text-xs font-bold">
            <span className={overLimit ? 'text-rose-500' : 'text-slate-400'}>
              {draft.length} / {USER_NOTE_MAX_LENGTH}
            </span>
            {error && <span className="text-rose-500">{error}</span>}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
          >
            閉じる
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || overLimit || saving}
            className={`flex-1 py-3 rounded-xl font-black transition ${
              dirty && !overLimit && !saving
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNoteModal;
