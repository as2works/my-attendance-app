import React, { useState, useEffect } from 'react';
import { ViewState, User, SystemConfig } from './types';
import Login from './views/Login';
import MainList from './views/MainList';
import EditSchedule from './views/EditSchedule';
import AdminDashboard from './views/AdminDashboard';
import { db } from './services/database';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const initialConfig = await db.getConfig();
        setConfig(initialConfig);
      } catch (err: any) {
        console.error("Backend initialization failed:", err);
        setError("バックエンドとの接続に失敗しました。amplify_outputs.json が正しく生成されているか、バックエンドのデプロイが完了しているか確認してください。");
      }
    };
    init();
  }, []);

  // Handle logout
  const handleLogout = () => {
    setView('LOGIN');
    setCurrentUser(null);
    setIsAdminUser(false);
  };

  // Handle successful login
  const handleLoginSuccess = (isAdmin: boolean) => {
    setIsAdminUser(isAdmin);
    if (isAdmin) {
      setView('ADMIN');
    } else {
      setView('MAIN');
    }
  };

  // Switch to edit mode for a user
  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setView('EDIT');
  };

  // Refresh config after admin update
  const handleConfigUpdate = async () => {
    try {
      const updatedConfig = await db.getConfig();
      setConfig(updatedConfig);
    } catch (err) {
      console.error("Failed to refresh config:", err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-rose-100 text-center">
          <i className="fas fa-exclamation-triangle text-5xl text-rose-500 mb-6"></i>
          <h2 className="text-2xl font-black text-slate-800 mb-4">接続エラー</h2>
          <p className="text-slate-600 mb-8 leading-relaxed font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 transition"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
          <p className="text-slate-500 font-bold">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {view === 'LOGIN' && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}

      {view === 'MAIN' && (
        <MainList 
          onLogout={handleLogout} 
          onEditUser={handleEditUser} 
          config={config}
          onNavigateAdmin={() => setView('ADMIN')}
          isAdmin={isAdminUser}
        />
      )}

      {view === 'EDIT' && currentUser && (
        <EditSchedule 
          user={currentUser} 
          config={config}
          onBack={() => setView('MAIN')} 
          onLogout={handleLogout}
        />
      )}

      {view === 'ADMIN' && (
        <AdminDashboard 
          onLogout={handleLogout}
          onConfigUpdate={handleConfigUpdate}
          onNavigateGeneral={() => setView('MAIN')}
        />
      )}
    </div>
  );
};

export default App;