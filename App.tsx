import React, { useState, useEffect } from 'react';
import {
  ViewState,
  User,
  SystemConfig,
  GroupId,
  Group,
  AccessSession,
  DEFAULT_GROUP_IDS,
  Schedule,
  History,
} from './types';
import MainList from './views/MainList';
import EditSchedule from './views/EditSchedule';
import AdminDashboard from './views/AdminDashboard';
import WorkspacePortal from './views/WorkspacePortal';
import AccessGate from './views/AccessGate';
import { db, setAccessToken, type BootstrapAdminResult } from './services/database';
import { getAccessTokenFromPath, buildAccessUrl } from './services/accessPath';

type AdminInitialData = {
  users: User[];
  histories: History[];
  schedules: Schedule[];
  config: SystemConfig;
  year: number;
  month: number;
  unprocessedCounts: Record<string, number>;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('MAIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [session, setSession] = useState<AccessSession | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<GroupId>(DEFAULT_GROUP_IDS.DORM);
  const [bootError, setBootError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [mainInitialData, setMainInitialData] = useState<{
    users: User[];
    schedules: Schedule[];
    year: number;
    month: number;
  } | null>(null);
  const [editSeedSchedules, setEditSeedSchedules] = useState<Schedule[]>([]);
  const [schedulePatch, setSchedulePatch] = useState<Schedule[] | null>(null);
  const [adminInitialData, setAdminInitialData] = useState<AdminInitialData | null>(null);
  const [adminSoftRefreshToken, setAdminSoftRefreshToken] = useState(0);
  const [devBootstrapLinks, setDevBootstrapLinks] = useState<{
    ownerUrl?: string;
    adminUrl?: string;
  }>({});

  const isOwner = session?.role === 'OWNER';
  const isAdminUser = session?.role === 'ADMIN';

  const refreshGroups = async () => {
    const next = await db.listGroups();
    setGroups(next);
    return next;
  };

  const applyAdminBoot = (boot: BootstrapAdminResult) => {
    const nextSession: AccessSession = {
      linkId: boot.link.id,
      role: boot.link.role,
      workspaceId: boot.link.workspaceId,
    };
    setSession(nextSession);
    setGroups(boot.groups);
    setConfig(boot.config);
    setWorkspaceName(boot.workspace.name);
    setSelectedGroupId(boot.groupId);
    setAdminInitialData({
      users: boot.users,
      histories: boot.histories,
      schedules: boot.schedules,
      config: boot.config,
      year: boot.year,
      month: boot.month,
      unprocessedCounts: boot.unprocessedCounts || {},
    });
    setView('ADMIN');
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (import.meta.env.DEV) {
          const seed = await db.ensureSeed({ discloseBootstrapLinks: true });
          const ownerUrl = seed.ownerLinkId ? buildAccessUrl(seed.ownerLinkId) : undefined;
          const adminUrl = seed.defaultAdminLinkId
            ? buildAccessUrl(seed.defaultAdminLinkId)
            : undefined;
          setDevBootstrapLinks({ ownerUrl, adminUrl });
          if (ownerUrl) console.info('[開発用] 箱一覧ポータル（OWNER）', ownerUrl);
          if (adminUrl) console.info('[開発用] 既定箱の管理者（ADMIN）', adminUrl);
        }

        const token = getAccessTokenFromPath();
        if (!token) {
          setAccessToken(null);
          setSession(null);
          setView('NOT_FOUND');
          return;
        }

        setAccessToken(token);

        // GENERAL: 1往復
        try {
          const boot = await db.bootstrapGeneral();
          const nextSession: AccessSession = {
            linkId: boot.link.id,
            role: boot.link.role,
            workspaceId: boot.link.workspaceId,
            groupId: boot.link.groupId,
          };
          setSession(nextSession);
          setGroups(boot.groups);
          setConfig(boot.config);
          setSelectedGroupId(boot.link.groupId || boot.groups[0]?.id || DEFAULT_GROUP_IDS.DORM);
          setMainInitialData({
            users: boot.users,
            schedules: boot.schedules,
            year: boot.year,
            month: boot.month,
          });
          setView('MAIN');
          return;
        } catch (generalErr: any) {
          const code = String(generalErr?.message || '');
          if (code.includes('UNAUTHORIZED')) {
            setAccessToken(null);
            setSession(null);
            setView('NOT_FOUND');
            return;
          }
          if (code.includes('NOT_FOUND')) {
            setBootError(
              '表示に必要な設定が見つかりません。管理者に連絡するか、配布URLを確認してください。'
            );
            return;
          }
          if (!code.includes('FORBIDDEN')) {
            throw generalErr;
          }
        }

        // ADMIN: GENERAL が FORBIDDEN のあと 1往復
        try {
          const boot = await db.bootstrapAdmin();
          applyAdminBoot(boot);
          if (import.meta.env.DEV) {
            const links = await db.listAccessLinks();
            console.info(
              '[入場URL（開発用）]',
              links.map((item) => ({
                role: item.role,
                workspaceId: item.workspaceId ?? '(n/a)',
                groupId: item.groupId ?? '(admin)',
                url: buildAccessUrl(item.id),
              }))
            );
          }
          return;
        } catch (adminErr: any) {
          const code = String(adminErr?.message || '');
          if (code.includes('UNAUTHORIZED')) {
            setAccessToken(null);
            setSession(null);
            setView('NOT_FOUND');
            return;
          }
          if (code.includes('NOT_FOUND')) {
            setBootError(
              '表示に必要な設定が見つかりません。管理者に連絡するか、配布URLを確認してください。'
            );
            return;
          }
          if (!code.includes('FORBIDDEN')) {
            throw adminErr;
          }
        }

        // OWNER（またはフォールバック）
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
          workspaceId: link.workspaceId,
          groupId: link.groupId,
        };
        setSession(nextSession);

        if (link.role === 'OWNER') {
          setView('PORTAL');
          if (import.meta.env.DEV) {
            console.info('[ポータル OWNER URL]', buildAccessUrl(link.id));
          }
          return;
        }

        // 想定外ロールのフォールバック（通常到達しない）
        const loadedGroups = await db.listGroups();
        setGroups(loadedGroups);
        const fallbackGroupId = loadedGroups[0]?.id || DEFAULT_GROUP_IDS.DORM;
        try {
          const meta = await db.getWorkspaceMeta();
          setWorkspaceName(meta.name);
        } catch {
          setWorkspaceName('');
        }
        if (link.role === 'ADMIN') {
          setSelectedGroupId(fallbackGroupId);
          setView('ADMIN');
        } else {
          setSelectedGroupId(link.groupId || fallbackGroupId);
          setView('MAIN');
        }
        setConfig(await db.getConfig());
      } catch (err: any) {
        console.error('Backend initialization failed:', err);
        setBootError(
          'バックエンドとの接続に失敗しました。Amplify sandbox のデプロイが完了しているか確認してください。'
        );
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
    setMainInitialData(null);
    setEditSeedSchedules([]);
    setSchedulePatch(null);
    setAdminInitialData(null);
    setSelectedGroupId(groups[0]?.id || DEFAULT_GROUP_IDS.DORM);
    setView('LOGGED_OUT');
    window.history.replaceState(null, '', '/');
  };

  const handleEditUser = (user: User, seedSchedules: Schedule[] = []) => {
    setCurrentUser(user);
    setEditSeedSchedules(seedSchedules);
    setView('EDIT');
  };

  const handleEditSaved = (updates: Schedule[]) => {
    setSchedulePatch(updates);
  };

  const handleEditBack = () => {
    setCurrentUser(null);
    setEditSeedSchedules([]);
    setView('MAIN');
  };

  const handleConfigUpdate = async (next?: SystemConfig) => {
    if (next) {
      setConfig(next);
      return;
    }
    try {
      setConfig(await db.getConfig());
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

  const handleNavigateGeneral = () => {
    setMainInitialData(null);
    setView('MAIN');
  };

  const handleNavigateAdmin = () => {
    setAdminSoftRefreshToken((n) => n + 1);
    setView('ADMIN');
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

  if (isBooting) {
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
    return <AccessGate mode="not_found" devLinks={devBootstrapLinks} />;
  }

  if (view === 'LOGGED_OUT' || !session) {
    return <AccessGate mode="logged_out" />;
  }

  if (view === 'PORTAL' && isOwner) {
    return (
      <div className="min-h-screen">
        <WorkspacePortal onLogout={handleLogout} />
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

  const showMainShell = view === 'MAIN' || view === 'EDIT';
  const showAdminShell =
    isAdminUser && (view === 'ADMIN' || view === 'MAIN' || view === 'EDIT');

  return (
    <div className="min-h-screen">
      {showMainShell && (
        <div className={view === 'MAIN' ? undefined : 'hidden'} aria-hidden={view !== 'MAIN'}>
          <MainList
            onLogout={handleLogout}
            onEditUser={handleEditUser}
            config={config}
            groups={groups}
            onNavigateAdmin={handleNavigateAdmin}
            isAdmin={isAdminUser}
            groupId={selectedGroupId}
            onGroupChange={handleGroupChange}
            initialData={mainInitialData}
            schedulePatch={schedulePatch}
            onSchedulePatchApplied={() => setSchedulePatch(null)}
            syncDocumentTitle={view === 'MAIN'}
          />
        </div>
      )}

      {view === 'EDIT' && currentUser && (
        <EditSchedule
          key={currentUser.id}
          user={currentUser}
          config={config}
          groups={groups}
          seedSchedules={editSeedSchedules}
          onBack={handleEditBack}
          onLogout={handleLogout}
          onSaved={handleEditSaved}
        />
      )}

      {showAdminShell && (
        <div className={view === 'ADMIN' ? undefined : 'hidden'} aria-hidden={view !== 'ADMIN'}>
          <AdminDashboard
            onLogout={handleLogout}
            onConfigUpdate={handleConfigUpdate}
            onNavigateGeneral={handleNavigateGeneral}
            groups={groups}
            onGroupsChange={handleGroupsChange}
            groupId={selectedGroupId}
            onGroupChange={handleGroupChange}
            currentLinkId={session.linkId}
            workspaceName={workspaceName}
            initialData={adminInitialData}
            softRefreshToken={adminSoftRefreshToken}
            syncDocumentTitle={view === 'ADMIN'}
          />
        </div>
      )}
    </div>
  );
};

export default App;
