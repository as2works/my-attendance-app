
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { User, Schedule, SystemConfig, AttendanceStatus } from '../types';
import { db } from '../services/database';
import { STATUS_OPTIONS, STATUS_COLORS } from '../constants.tsx';
import { generateHistoryMessage } from '../services/geminiService';

interface EditScheduleProps {
  user: User;
  config: SystemConfig;
  onBack: () => void;
  onLogout: () => void;
}

const EditSchedule: React.FC<EditScheduleProps> = ({ user, config, onBack, onLogout }) => {
  const [localSchedules, setLocalSchedules] = useState<Record<string, AttendanceStatus>>({});
  const [initialSchedules, setInitialSchedules] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const savedSchedules = await db.getSchedulesForUser(user.id);
      const map: Record<string, AttendanceStatus> = {};
      savedSchedules.forEach(s => {
        map[s.date] = s.status;
      });
      setLocalSchedules(map);
      setInitialSchedules({ ...map });
      setIsLoading(false);
    };
    fetchData();
  }, [user.id]);

  const datesInRange = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(config.seasonStartDate);
    const end = new Date(config.seasonEndDate);
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [config.seasonStartDate, config.seasonEndDate]);

  const handleStatusChange = (date: string, newStatus: AttendanceStatus) => {
    setLocalSchedules(prev => ({ ...prev, [date]: newStatus }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Schedule[] = Object.entries(localSchedules).map(([date, status]) => ({
        userId: user.id,
        date,
        status: status as AttendanceStatus
      }));
      
      const changes: { date: string; oldStatus: string; newStatus: string }[] = [];
      datesInRange.forEach(date => {
        const oldVal = initialSchedules[date] || '-';
        const newVal = localSchedules[date] || '-';
        if (oldVal !== newVal) {
          changes.push({ date, oldStatus: oldVal, newStatus: newVal });
        }
      });

      if (changes.length > 0) {
        await db.updateSchedules(updates);
        const message = await generateHistoryMessage(user.name, changes);
        await db.addHistory({
          userId: user.id,
          userName: user.name,
          message,
          isProcessed: false
        });
        alert('予定を保存しました。');
      }
      onBack();
    } catch (e) {
      console.error(e);
      alert('保存中にエラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(localSchedules) !== JSON.stringify(initialSchedules);
  }, [localSchedules, initialSchedules]);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const names = ['日', '月', '火', '水', '木', '金', '土'];
    const dow = date.getDay();
    return {
      label: `${month}/${day} (${names[dow]})`,
      dow
    };
  };

  return (
    <Layout title={`${user.name} さんの予定編集`} onLogout={onLogout}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Sticky Header with Fixed Height Message Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-[72px] z-30 overflow-hidden">
          <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">各日程の予定を選択</h2>
              <p className="text-slate-500 text-sm">タップして記号を選んでください</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={onBack}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition shadow-sm"
              >
                戻る
              </button>
              <button 
                onClick={handleSave}
                disabled={!hasChanges || isSaving || isLoading}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black transition flex items-center justify-center space-x-2 ${
                  hasChanges && !isLoading
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                <span>{isSaving ? '保存中...' : '登録する'}</span>
              </button>
            </div>
          </div>
          
          <div className="px-6 pb-4 h-16 sm:h-12 flex items-center">
            {isLoading ? (
               <div className="w-full text-slate-400 text-sm flex items-center space-x-3 px-1 italic">
                 <i className="fas fa-circle-notch fa-spin"></i>
                 <span>データを読み込み中...</span>
               </div>
            ) : hasChanges ? (
              <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 p-2 sm:p-3 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <i className="fas fa-exclamation-circle text-lg shrink-0"></i>
                <span className="font-bold text-xs sm:text-sm">未保存の変更があります。最後に「登録する」を押してください。</span>
              </div>
            ) : (
              <div className="w-full text-slate-400 text-sm flex items-center space-x-3 px-1 italic">
                <i className="fas fa-info-circle shrink-0"></i>
                <span>変更を加えると保存ボタンが有効になります</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden min-h-[200px] relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <i className="fas fa-spinner fa-spin text-indigo-600 text-2xl"></i>
            </div>
          )}
          {datesInRange.map(dateStr => {
            const { label, dow } = formatDateLabel(dateStr);
            const status = localSchedules[dateStr] || '-';
            const isChanged = initialSchedules[dateStr] !== localSchedules[dateStr];
            const isWeekend = dow === 0 || dow === 6;

            return (
              <div key={dateStr} className={`p-4 sm:p-6 transition-colors ${isChanged ? 'bg-indigo-50/30' : ''} ${isWeekend ? (dow === 0 ? 'bg-rose-50/10' : 'bg-blue-50/10') : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className={`text-base font-black ${dow === 0 ? 'text-rose-600' : dow === 6 ? 'text-blue-600' : 'text-slate-700'}`}>
                      {label}
                    </span>
                    {isChanged && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-tighter shadow-sm">変更あり</span>}
                  </div>
                  
                  <div className="grid grid-cols-6 gap-1 sm:gap-2">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleStatusChange(dateStr, opt)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 font-black text-sm transition-all duration-75 active:scale-90 ${
                          status === opt 
                            ? `${STATUS_COLORS[opt]} ring-2 ring-indigo-400 scale-105 shadow-md z-10` 
                            : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {opt === '-' ? '無し' : opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {!isLoading && datesInRange.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              設定された期間がありません。管理者に確認してください。
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 mb-8">
          <h3 className="text-slate-700 font-bold mb-4 flex items-center space-x-2">
            <i className="fas fa-info-circle text-indigo-500"></i>
            <span>使い方のヒント</span>
          </h3>
          <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
            <li>日程ごとに記号ボタンをタップして予定を選択してください。</li>
            <li>「無し」を選択すると予定が未設定の状態になります。</li>
            <li>入力を終えたら、画面上部の「登録する」ボタンを必ず押して保存してください。</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default EditSchedule;
