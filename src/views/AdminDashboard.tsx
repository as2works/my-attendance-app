
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db } from '../services/database';
import { User, History, SystemConfig, Schedule, AttendanceStatus } from '../types';
import { STATUS_COLORS } from '../constants.tsx';

interface AdminDashboardProps {
  onLogout: () => void;
  onConfigUpdate: () => void;
  onNavigateGeneral: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onConfigUpdate, onNavigateGeneral }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'CONFIG'>('OVERVIEW');
  const [users, setUsers] = useState<User[]>([]);
  const [histories, setHistories] = useState<History[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [showProcessedHistory, setShowProcessedHistory] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsUpdating(true);
    const [u, h, s, c] = await Promise.all([
      db.getUsers(),
      db.getHistories(),
      db.getSchedules(),
      db.getConfig()
    ]);
    setUsers(u);
    setHistories(h);
    setSchedules(s);
    setConfig(c);
    setIsUpdating(false);
  };

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    await db.saveUser({ id: '', name: newUserName.trim() });
    setNewUserName('');
    refreshData();
    alert(`利用者に「${newUserName}」を追加しました。`);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('この利用者を削除してもよろしいですか？（出勤予定も削除されます）')) {
      await db.deleteUser(id);
      refreshData();
      alert('利用者を削除しました。');
    }
  };

  const handleMoveUser = async (index: number, direction: 'up' | 'down') => {
    const newUsers = [...users];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newUsers.length) return;
    [newUsers[index], newUsers[targetIndex]] = [newUsers[targetIndex], newUsers[index]];
    setUsers(newUsers);
    await db.saveUsers(newUsers);
  };

  const handleProcessHistory = async (id: string, isProcessed: boolean) => {
    await db.updateHistoryStatus(id, isProcessed);
    setHistories(prev => prev.map(h => h.id === id ? { ...h, isProcessed } : h));
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    await db.saveConfig(config);
    onConfigUpdate();
    alert('期間設定を保存しました。');
    refreshData();
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
  };

  // Table State
  const getInitialPeriod = () => {
    if (!config) return { month: new Date().getMonth(), year: new Date().getFullYear() };
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

  // Table Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const numDays = daysInMonth(currentYear, currentMonth);
  const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);
  const getDayOfWeek = (day: number) => new Date(currentYear, currentMonth, day).getDay();
  const getDayName = (dow: number) => ['日', '月', '火', '水', '木', '金', '土'][dow];
  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() === currentMonth && now.getDate() === day;
  };
  const getStatus = (userId: string, day: number): AttendanceStatus => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.find(s => s.userId === userId && s.date === dateStr)?.status || '-';
  };

  if (!config) return null;

  return (
    <Layout title="管理者パネル" onLogout={onLogout} isAdmin onNavigate={onNavigateGeneral}>
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
        {/* Sidebar Nav */}
        <div className="lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 shrink-0">
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-th-list"></i>
            <span>確認・消込</span>
          </button>
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-users-cog"></i>
            <span>利用者管理</span>
          </button>
          <button 
            onClick={() => setActiveTab('CONFIG')}
            className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-bold flex items-center justify-center lg:justify-start space-x-3 transition ${activeTab === 'CONFIG' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 lg:border-none'}`}
          >
            <i className="fas fa-cog"></i>
            <span>期間設定</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow min-w-0 flex flex-col h-full overflow-hidden relative">
          {isUpdating && (
             <div className="absolute top-0 right-0 p-2 z-50">
               <i className="fas fa-sync fa-spin text-indigo-500"></i>
             </div>
          )}

          {activeTab === 'OVERVIEW' && (
            <div className="flex flex-col gap-4 h-full animate-in fade-in duration-500">
              
              {/* Part 1: Schedule List Table (Top Half) */}
              <section className="flex flex-col h-1/2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100 shrink-0 bg-slate-50/50">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <i className="fas fa-calendar-alt text-indigo-500"></i>
                    <span>出勤予定一覧</span>
                  </h3>
                  <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm scale-90 origin-right">
                    <button onClick={() => handleMonthChange(-1)} className="p-1 hover:text-indigo-600 transition"><i className="fas fa-chevron-left"></i></button>
                    <span className="font-bold text-xs min-w-[80px] text-center">{currentYear}年 {currentMonth + 1}月</span>
                    <button onClick={() => handleMonthChange(1)} className="p-1 hover:text-indigo-600 transition"><i className="fas fa-chevron-right"></i></button>
                  </div>
                </div>

                <div className="flex-grow overflow-auto relative">
                  <table className="w-full text-xs text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-30 bg-slate-50 text-slate-500 uppercase font-bold shadow-sm">
                      <tr>
                        <th className="px-3 py-3 min-w-[120px] sticky left-0 top-0 bg-slate-50 z-40 border-r border-b border-slate-200">氏名</th>
                        {daysArray.map(day => {
                          const dow = getDayOfWeek(day);
                          const isSun = dow === 0;
                          const isSat = dow === 6;
                          return (
                            <th key={day} className={`px-1 py-2 text-center min-w-[35px] border-r border-b border-slate-200 last:border-r-0 ${isSun ? 'bg-rose-100 text-rose-700' : isSat ? 'bg-blue-100 text-blue-700' : ''} ${isToday(day) ? 'ring-2 ring-inset ring-indigo-400' : ''}`}>
                              <div className="text-[9px] opacity-70">{getDayName(dow)}</div>
                              <div className="font-black">{day}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition group">
                          <td className="px-3 py-3 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                            {user.name}
                          </td>
                          {daysArray.map(day => {
                            const status = getStatus(user.id, day);
                            const dow = getDayOfWeek(day);
                            const isSun = dow === 0;
                            const isSat = dow === 6;
                            return (
                              <td key={day} className={`px-0 py-2 text-center border-r border-slate-100 last:border-r-0 ${isSun ? 'bg-rose-50/50' : isSat ? 'bg-blue-50/50' : ''}`}>
                                <div className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center border font-black text-[10px] ${STATUS_COLORS[status]}`}>
                                  {status === '-' ? '' : status}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!isUpdating && users.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold">
                      利用者が登録されていません
                    </div>
                  )}
                </div>
              </section>

              {/* Part 2: Change History (Bottom Half) */}
              <section className="flex flex-col h-1/2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100 shrink-0 bg-slate-50/50">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <i className="fas fa-history text-indigo-500"></i>
                    <span>変更履歴・消込</span>
                  </h3>
                  <label className="flex items-center space-x-2 text-[10px] text-slate-500 cursor-pointer hover:text-slate-700 transition">
                    <input 
                      type="checkbox" 
                      checked={showProcessedHistory}
                      onChange={(e) => setShowProcessedHistory(e.target.checked)}
                      className="w-3 h-3 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-bold">完了分も表示</span>
                  </label>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/10">
                  {histories
                    .filter(h => showProcessedHistory || !h.isProcessed)
                    .map(h => (
                      <div key={h.id} className={`bg-white p-4 rounded-xl border transition shadow-sm hover:shadow-md ${h.isProcessed ? 'opacity-50 grayscale-[0.5] border-slate-100' : 'border-indigo-100 ring-1 ring-indigo-50'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-grow">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest">Update</span>
                              <span className="font-black text-slate-800 text-sm">{h.userName}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                <i className="far fa-clock mr-1"></i>
                                {new Date(h.createdAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-600 text-xs whitespace-pre-wrap leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                              {h.message}
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                             <input 
                              type="checkbox" 
                              checked={h.isProcessed}
                              onChange={(e) => handleProcessHistory(h.id, e.target.checked)}
                              className="w-8 h-8 rounded-lg text-indigo-600 border-slate-200 focus:ring-indigo-500 cursor-pointer transition-all active:scale-90 shadow-sm"
                            />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${h.isProcessed ? 'text-emerald-500' : 'text-rose-400'}`}>
                              {h.isProcessed ? '完了' : '未消込'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  {!isUpdating && histories.length === 0 && (
                    <div className="text-center py-12 text-slate-400 font-bold">
                      <i className="fas fa-clipboard-check text-3xl mb-2 opacity-20"></i>
                      <p className="text-sm">履歴はありません</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-y-auto pr-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800">利用者名簿・並べ替え</h3>
                <p className="text-xs text-slate-400 font-bold">矢印ボタンで一覧の表示順を変更できます</p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex gap-4 shrink-0">
                <input 
                  type="text" 
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="新しい利用者名を入力"
                  className="flex-grow px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm font-bold"
                />
                <button 
                  onClick={handleAddUser}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl transition shadow-lg shadow-indigo-200 whitespace-nowrap flex items-center gap-2"
                >
                  <i className="fas fa-plus"></i>
                  <span>追加</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {users.map((u, index) => (
                  <div key={u.id} className="p-5 flex justify-between items-center hover:bg-slate-50/80 transition group">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black border border-slate-200">
                        {index + 1}
                      </div>
                      <span className="font-black text-slate-700 text-lg">{u.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1 mr-4 border-r pr-4 border-slate-100">
                        <button 
                          onClick={() => handleMoveUser(index, 'up')}
                          disabled={index === 0}
                          className={`w-10 h-10 rounded-xl transition flex items-center justify-center ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 bg-slate-50 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                          title="上に移動"
                        >
                          <i className="fas fa-arrow-up"></i>
                        </button>
                        <button 
                          onClick={() => handleMoveUser(index, 'down')}
                          disabled={index === users.length - 1}
                          className={`w-10 h-10 rounded-xl transition flex items-center justify-center ${index === users.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 bg-slate-50 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                          title="下に移動"
                        >
                          <i className="fas fa-arrow-down"></i>
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100"
                        title="削除"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {!isUpdating && users.length === 0 && (
                   <div className="text-center py-12 text-slate-400 font-bold">
                    登録されている利用者がいません
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'CONFIG' && (
            <div className="space-y-6 max-w-lg animate-in slide-in-from-right-4 duration-300 overflow-y-auto">
              <h3 className="text-xl font-black text-slate-800">システム設定</h3>
              <form onSubmit={handleConfigSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-3 ml-1">シーズン開始日</label>
                    <input 
                      type="date" 
                      value={config.seasonStartDate}
                      onChange={(e) => setConfig({...config, seasonStartDate: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 font-black focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-3 ml-1">シーズン終了日</label>
                    <input 
                      type="date" 
                      value={config.seasonEndDate}
                      onChange={(e) => setConfig({...config, seasonEndDate: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 font-black focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl transition shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <i className="fas fa-save text-xl"></i>
                  <span>設定を保存する</span>
                </button>
              </form>
              
              <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-4">
                 <i className="fas fa-info-circle text-indigo-500 text-xl pt-1"></i>
                 <p className="text-sm text-indigo-900 leading-relaxed font-bold">
                  設定された期間内のみ、一般ユーザーが「出勤予定一覧」から「編集」を行うことができます。<br/>
                  期間外でも既存のデータは保持されますが、ユーザーが新しく入力することは制限されます。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
