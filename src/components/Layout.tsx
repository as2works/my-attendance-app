
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onLogout: () => void;
  isAdmin?: boolean;
  onNavigate?: (view: 'MAIN' | 'ADMIN') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onLogout, isAdmin, onNavigate }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <i className="fas fa-calendar-check text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin && onNavigate && (
               <button 
                onClick={() => onNavigate('MAIN')}
                className="hidden sm:block text-sm font-medium hover:text-indigo-200 transition"
              >
                一般画面へ
              </button>
            )}
            <button 
              onClick={onLogout}
              className="bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; 2024 Seasonal Schedule Manager - Team Efficiency
        </div>
      </footer>
    </div>
  );
};

export default Layout;
