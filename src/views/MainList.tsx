
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db } from '../services/database';
import { User, Schedule, SystemConfig, AttendanceStatus } from '../types';
import { STATUS_COLORS } from '../constants.tsx';

interface MainListProps {
  onLogout: () => void;
  onEditUser: (user: User) => void;
  config: SystemConfig;
  onNavigateAdmin: () => void;
  isAdmin: boolean;
}

const MainList: React.FC<MainListProps> = ({ onLogout, onEditUser, config, onNavigateAdmin, isAdmin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Calculate initial month/year based on today vs system config
  const getInitialPeriod = () => {
    const today = new Date();
    const start = new Date(config.seasonStartDate);
    const end = new Date(config.seasonEndDate);
    
    if (today >= start && today <= end) return { month: today.getMonth(), year: today.getFullYear() };
    if (today < start) return { month: start.getMonth(), year: start.getFullYear() };
    return { month: end.getMonth(), year: end.getFullYear() };
  };

  const initialPeriod = getInitialPeriod();
  const [currentMonth, setCurrentMonth] = useState(initialPeriod.month);
  const [currentYear, setCurrentYear] = useState(initialPeriod.year);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [u, s] = await Promise.all([db.getUsers(), db.getSchedules()]);
      setUsers(u);
      setSchedules(s);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const numDays = daysInMonth(currentYear, currentMonth);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  const getStatus = (userId: string, day: number): AttendanceStatus => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.find(s => s.userId === userId && s.date === dateStr)?.status || '-';
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() === currentMonth && now.getDate() === day;
  };

  const getDayOfWeek = (day: number) => new Date(currentYear, currentMonth, day).getDay();
  const getDayName = (dayOfWeek: number) => ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];

  return (
    <Layout title="出勤予定一覧" onLogout={onLogout} isAdmin={isAdmin} onNavigate={onNavigateAdmin}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => handleMonthChange(-1)}
              className="p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-sm transition"
              aria-label="前月"
            >
              <i className="fas fa-chevron-left text-slate-400"></i>
            </button>
            <h2 className="text-xl font-bold text-slate-800 min-w-[140px] text-center">
              {currentYear}年 {currentMonth + 1}月
            </h2>
            <button 
              onClick={() => handleMonthChange(1)}
              className="p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-sm transition"
              aria-label="翌月"
            >
              <i className="fas fa-chevron-right text-slate-400"></i>
            </button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
             {isAdmin && (
               <button 
                onClick={onNavigateAdmin}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-indigo-600 bg-white border-2 border-indigo-100 rounded-xl hover:bg-indigo-50 transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <i className="fas fa-tools"></i>
                <span>管理者メニュー</span>
              </button>
             )}
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto relative min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center backdrop-blur-[1px]">
               <div className="flex flex-col items-center gap-3">
                <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-600"></i>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading...</span>
               </div>
            </div>
          )}
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 min-w-[150px] sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">氏名</th>
                {days.map(day => {
                  const dow = getDayOfWeek(day);
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  return (
                    <th key={day} className={`px-2 py-3 text-center min-w-[45px] border-r border-slate-100 last:border-r-0 ${isSun ? 'bg-rose-100 text-rose-700' : isSat ? 'bg-blue-100 text-blue-700' : ''} ${isToday(day) ? 'ring-2 ring-inset ring-indigo-400 z-10' : ''}`}>
                      <div className="text-[10px] opacity-70 mb-1">{getDayName(dow)}</div>
                      <div className="text-sm font-bold">{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition group">
                  <td className="px-4 py-4 font-medium text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{user.name}</span>
                      <button 
                        onClick={() => onEditUser(user)}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition whitespace-nowrap shadow-sm shadow-indigo-100"
                      >
                        編集
                      </button>
                    </div>
                  </td>
                  {days.map(day => {
                    const status = getStatus(user.id, day);
                    const dow = getDayOfWeek(day);
                    const isSun = dow === 0;
                    const isSat = dow === 6;
                    return (
                      <td key={day} className={`px-1 py-4 text-center border-r border-slate-100 last:border-r-0 ${isSun ? 'bg-rose-50' : isSat ? 'bg-blue-50' : ''} ${isToday(day) ? 'bg-indigo-50/50' : ''}`}>
                        <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center border-2 font-black text-xs transition-all group-hover:scale-110 ${STATUS_COLORS[status]}`}>
                          {status === '-' ? '' : status}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={days.length + 1} className="px-4 py-12 text-center text-slate-400 font-medium">
                    利用者が登録されていません。管理画面から追加してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 flex flex-wrap gap-6 items-center text-sm text-slate-600 shadow-sm">
        <span className="font-bold text-slate-800 border-b-2 border-indigo-500 pb-1">凡例:</span>
        <div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold ${STATUS_COLORS['〇']}`}>〇</span> 出勤可能</div>
        <div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold ${STATUS_COLORS['×']}`}>×</span> 休み希望</div>
        <div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold ${STATUS_COLORS['△']}`}>△</span> 未定</div>
        <div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold ${STATUS_COLORS['in']}`}>IN</span> 出勤確定</div>
        <div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold ${STATUS_COLORS['out']}`}>OUT</span> 休み確定</div>
      </div>
    </Layout>
  );
};

export default MainList;
