import React from 'react';
import { Group, GroupId } from '../types';

interface GroupSelectorProps {
  groups: Group[];
  value: GroupId;
  onChange: (groupId: GroupId) => void;
  className?: string;
  label?: string;
  /** グループID → 未消込件数。0超のとき選択肢に件数を付与 */
  unprocessedCounts?: Record<string, number>;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({
  groups,
  value,
  onChange,
  className = '',
  label = 'グループ',
  unprocessedCounts,
}) => {
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
      >
        {groups.map((g) => {
          const unprocessed = unprocessedCounts?.[g.id] ?? 0;
          const pending = unprocessed > 0 ? `（未消込 ${unprocessed}）` : '';
          return (
            <option key={g.id} value={g.id}>
              {g.name}{pending}
            </option>
          );
        })}
      </select>
    </label>
  );
};

export default GroupSelector;
