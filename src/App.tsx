
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

  useEffect(() => {
    const init = async () => {
      const initialConfig = await db.getConfig();
      setConfig(initialConfig);
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
    const updatedConfig = await db.getConfig();
    setConfig(updatedConfig);
  };

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
