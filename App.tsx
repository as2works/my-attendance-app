import React, { useState, useEffect } from 'react';
import { ViewState, User, SystemConfig, GroupId, Group, AccessSession, DEFAULT_GROUP_IDS } from './types';
import MainList from './views/MainList';
import EditSchedule from './views/EditSchedule';
import AdminDashboard from './views/AdminDashboard';
import AccessGate from './views/AccessGate';
import { db, setAccessToken } from './services/database';
import { getAccessTokenFromPath, buildAccessUrl } from './services/accessPath';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('MAIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [session, setSession] = useState<AccessSession | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<GroupId>(DEFAULT_GROUP_IDS.DORM);
  const [bootError, setBootError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const isAdminUser = session?.role === 'ADMIN';

  const refreshGroups = async () => {
    const next = await db.listGroups();
    setGroups(next);
    return next;
  };

  useEffect(() => {
    const init = async () => {
      try {
        await db.ensureSeed();

        const token = getAccessTokenFromPath();
        if (!token) {
          setAccessToken(null);
          setSession(null);
          setView('NOT_FOUND');
          return;
        }

        setAccessToken(token);
        const link = await db.resolveAccessLink(token);
        if (!link) {
          setAccessToken(null);
          setSession(null);
          setView('NOT_FOUND');
          return;
        }

        const nextSession: AccessSession = {
          linkId: link.id,
          role: link.role,
          groupId: link.groupId,
        };
        setSession(nextSession);

        // listGroups は認証トークン必須のため、入場URL確定後に読む
        const loadedGroups = await db.listGroups();
        setGroups(loadedGroups);
        const fallbackGroupId = loadedGroups[0]?.id || DEFAULT_GROUP_IDS.DORM;

        if (link.role === 'ADMIN') {
          setSelectedGroupId(fallbackGroupId);
          setView('ADMIN');
        } else {
          setSelectedGroupId(link.groupId || fallbackGroupId);
          setView('MAIN');
        }

        const initialConfig = await db.getConfig();
        setConfig(initialConfig);

        if (import.meta.env.DEV && link.role === 'ADMIN') {
          const links = await db.listAccessLinks();
          console.info(
            '[入場URL（開発用）]',
            links.map((item) => ({
              role: item.role,
              groupId: item.groupId ?? '(admin)',
              url: buildAccessUrl(item.id),
            }))
          );
        }
      } catch (err: any) {
        console.error('Backend initialization failed:', err);
        setBootError('バックエンドとの接続に失敗しました。Amplify sandbox のデプロイが完了しているか確認してください。');
      } finally {
        setIsBooting(false);
      }
    };
    init();
  }, []);

  const handleLogout = () => {
    setAccessToken(null);
    setCurrentUser(null);
    setSession(null);
    setSelectedGroupId(groups[0]?.id || DEFAULT_GROUP_IDS.DORM);
    setView('LOGGED_OUT');
    window.history.replaceState(null, '', '/');
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setView('EDIT');
  };

  const handleConfigUpdate = async () => {
    try {
      const updatedConfig = await db.getConfig();
      setConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to refresh config:', err);
    }
  };

  const handleGroupsChange = async (next?: Group[]) => {
    if (next) {
      setGroups(next);
    } else {
      next = await refreshGroups();
    }
    if (!next.find((g) => g.id === selectedGroupId) && next[0]) {
      setSelectedGroupId(next[0].id);
    }
  };

  const handleGroupChange = (groupId: GroupId) => {
    if (!isAdminUser) return;
    setSelectedGroupId(groupId);
  };

  if (bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-rose-100 text-center">
          <i className="fas fa-exclamation-triangle text-5xl text-rose-500 mb-6"></i>
          <h2 className="text-2xl font-black text-slate-800 mb-4">接続エラー</h2>
          <p className="text-slate-600 mb-8 leading-relaxed font-medium">{bootError}</p>
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

  if (isBooting || (!config && view !== 'NOT_FOUND' && view !== 'LOGGED_OUT')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
          <p className="text-slate-500 font-bold">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (view === 'NOT_FOUND') {
    return <AccessGate mode="not_found" />;
  }

  if (view === 'LOGGED_OUT' || !session || !config) {
    return <AccessGate mode="logged_out" />;
  }

  return (
    <div className="min-h-screen">
      {view === 'MAIN' && (
        <MainList
          onLogout={handleLogout}
          onEditUser={handleEditUser}
          config={config}
          groups={groups}
          onNavigateAdmin={() => setView('ADMIN')}
          isAdmin={isAdminUser}
          groupId={selectedGroupId}
          onGroupChange={handleGroupChange}
        />
      )}

      {view === 'EDIT' && currentUser && (
        <EditSchedule
          user={currentUser}
          config={config}
          groups={groups}
          onBack={() => setView('MAIN')}
          onLogout={handleLogout}
        />
      )}

      {view === 'ADMIN' && isAdminUser && (
        <AdminDashboard
          onLogout={handleLogout}
          onConfigUpdate={handleConfigUpdate}
          onNavigateGeneral={() => setView('MAIN')}
          groups={groups}
          onGroupsChange={handleGroupsChange}
          groupId={selectedGroupId}
          onGroupChange={handleGroupChange}
          currentLinkId={session.linkId}
        />
      )}
    </div>
  );
};

export default App;
