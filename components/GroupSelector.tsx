
import React from 'react';
import { GROUP_IDS, GROUP_LABELS, GroupId } from '../types';

interface GroupSelectorProps {
  value: GroupId;
  onChange: (groupId: GroupId) => void;
  className?: string;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ value, onChange, className = '' }) => {
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">グループ</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as GroupId)}
        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
      >
        <option value={GROUP_IDS.DORM}>{GROUP_LABELS.dorm}</option>
        <option value={GROUP_IDS.HOME}>{GROUP_LABELS.home}</option>
      </select>
    </label>
  );
};

export default GroupSelector;
