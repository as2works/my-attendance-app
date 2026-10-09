import React from 'react';

interface UserNoteButtonProps {
  hasNote: boolean;
  /** 備考なしでも出す（編集画面用）。一覧では false 推奨 */
  alwaysShow?: boolean;
  onClick: () => void;
  className?: string;
}

const UserNoteButton: React.FC<UserNoteButtonProps> = ({
  hasNote,
  alwaysShow = false,
  onClick,
  className = '',
}) => {
  if (!hasNote && !alwaysShow) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={hasNote ? '備考を見る' : '備考を追加'}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-[11px] font-black transition shrink-0 ${
        hasNote
          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
      } ${className}`}
      aria-label={hasNote ? '備考を見る' : '備考を追加'}
    >
      <i className="fas fa-sticky-note"></i>
    </button>
  );
};

export function hasUserNote(note?: string | null): boolean {
  return !!(note && note.trim());
}

export default UserNoteButton;
