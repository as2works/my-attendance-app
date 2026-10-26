import React from 'react';

interface AccessGateProps {
  mode: 'not_found' | 'logged_out';
  /** 開発時のみ: ensureSeed が返した入場URL */
  devLinks?: {
    ownerUrl?: string;
    adminUrl?: string;
  };
}

const AccessGate: React.FC<AccessGateProps> = ({ mode, devLinks }) => {
  const isLoggedOut = mode === 'logged_out';
  const showDev =
    import.meta.env.DEV &&
    mode === 'not_found' &&
    !!(devLinks?.ownerUrl || devLinks?.adminUrl);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full border border-slate-100 text-center">
        <i className={`fas ${isLoggedOut ? 'fa-sign-out-alt text-slate-400' : 'fa-link text-slate-300'} text-5xl mb-6`}></i>
        <h2 className="text-2xl font-black text-slate-800 mb-4">
          {isLoggedOut ? 'ログアウトしました' : 'ページが見つかりません'}
        </h2>
        <p className="text-slate-600 leading-relaxed font-medium">
          {isLoggedOut
            ? 'もう一度利用するには、配布された長いURLから開いてください。'
            : 'ページが見つかりません。'}
        </p>

        {showDev && (
          <div className="mt-8 text-left rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-xs font-black text-amber-800">開発用・入場URL（本番画面には出ません）</p>
            {devLinks?.ownerUrl && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1">箱一覧ポータル（OWNER）</p>
                <a
                  href={devLinks.ownerUrl}
                  className="block text-sm font-bold text-indigo-700 break-all underline"
                >
                  {devLinks.ownerUrl}
                </a>
              </div>
            )}
            {devLinks?.adminUrl && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1">既定箱の管理者（ADMIN）</p>
                <a
                  href={devLinks.adminUrl}
                  className="block text-sm font-bold text-indigo-700 break-all underline"
                >
                  {devLinks.adminUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessGate;
