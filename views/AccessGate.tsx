import React, { useEffect } from 'react';
import { setDocumentTitle } from '../services/documentTitle';

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

  useEffect(() => {
    setDocumentTitle(isLoggedOut ? 'ログアウトしました' : 'ページが見つかりません');
  }, [isLoggedOut]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl">
          <i
            className={`fas ${isLoggedOut ? 'fa-sign-out-alt text-slate-400' : 'fa-link text-slate-300'} mb-6 text-5xl`}
          ></i>
          <h2 className="mb-4 text-2xl font-black text-slate-800">
            {isLoggedOut ? 'ログアウトしました' : 'ページが見つかりません'}
          </h2>
          <p className="font-medium leading-relaxed text-slate-600">
            {isLoggedOut
              ? 'もう一度利用するには、配布された長いURLから開いてください。'
              : 'ページが見つかりません。'}
          </p>

          {showDev && (
            <div className="mt-8 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-xs font-black text-amber-800">開発用・入場URL（本番画面には出ません）</p>
              {devLinks?.ownerUrl && (
                <div>
                  <p className="mb-1 text-[11px] font-bold text-slate-500">箱一覧ポータル（OWNER）</p>
                  <a
                    href={devLinks.ownerUrl}
                    className="block break-all text-sm font-bold text-indigo-700 underline"
                  >
                    {devLinks.ownerUrl}
                  </a>
                </div>
              )}
              {devLinks?.adminUrl && (
                <div>
                  <p className="mb-1 text-[11px] font-bold text-slate-500">既定箱の管理者（ADMIN）</p>
                  <a
                    href={devLinks.adminUrl}
                    className="block break-all text-sm font-bold text-indigo-700 underline"
                  >
                    {devLinks.adminUrl}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="pb-6 text-center text-sm text-slate-500">&copy; AS2WORKS</p>
    </div>
  );
};

export default AccessGate;
