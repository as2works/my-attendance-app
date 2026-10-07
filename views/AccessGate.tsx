
import React from 'react';

interface AccessGateProps {
  mode: 'not_found' | 'logged_out';
}

const AccessGate: React.FC<AccessGateProps> = ({ mode }) => {
  const isLoggedOut = mode === 'logged_out';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 text-center">
        <i className={`fas ${isLoggedOut ? 'fa-sign-out-alt text-slate-400' : 'fa-link text-slate-300'} text-5xl mb-6`}></i>
        <h2 className="text-2xl font-black text-slate-800 mb-4">
          {isLoggedOut ? 'ログアウトしました' : 'ページが見つかりません'}
        </h2>
        <p className="text-slate-600 leading-relaxed font-medium">
          {isLoggedOut
            ? 'もう一度利用するには、配布された長いURLから開いてください。'
            : 'ページが見つかりません。'}
        </p>
      </div>
    </div>
  );
};

export default AccessGate;
