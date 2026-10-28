import React, { useEffect } from 'react';
import { setDocumentTitle } from '../services/documentTitle';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onLogout: () => void;
  isAdmin?: boolean;
  /** ヘッダー切替ボタンの行き先（管理者セッション時のみ表示） */
  navTarget?: 'MAIN' | 'ADMIN';
  onNavigate?: () => void;
  /** hidden 保持中の画面では false（タブタイトルの上書き防止） */
  syncDocumentTitle?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  onLogout,
  isAdmin,
  navTarget,
  onNavigate,
  syncDocumentTitle = true,
}) => {
  const showNav = !!(isAdmin && onNavigate && navTarget);
  const navLabel = navTarget === 'ADMIN' ? '管理者画面へ' : '一般画面へ';

  useEffect(() => {
    if (!syncDocumentTitle) return;
    setDocumentTitle(title);
  }, [title, syncDocumentTitle]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-4 py-2 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <i className="fas fa-calendar-check text-lg sm:text-2xl shrink-0"></i>
            <h1 className="text-sm sm:text-xl font-bold tracking-tight truncate">{title}</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            {showNav && (
              <button
                type="button"
                onClick={onNavigate}
                className="text-xs sm:text-sm font-medium hover:text-indigo-200 transition whitespace-nowrap"
              >
                {navLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="bg-indigo-700 hover:bg-indigo-800 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
              title="ログアウト"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-[1800px] w-full mx-auto px-3 sm:px-4 lg:px-4 py-3 sm:py-6">
        {children}
      </main>
      <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-[1800px] mx-auto px-3 text-center text-slate-500 text-sm">
          &copy; AS2WORKS
        </div>
      </footer>
    </div>
  );
};

export default Layout;
