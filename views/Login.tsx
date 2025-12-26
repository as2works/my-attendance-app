
import React, { useState } from 'react';
import { ADMIN_PASSWORD, SHARED_USER_PASSWORD } from '../constants';

interface LoginProps {
  onLoginSuccess: (isAdmin: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLoginSuccess(true);
    } else if (password === SHARED_USER_PASSWORD) {
      onLoginSuccess(false);
    } else {
      setError('パスワードが正しくありません');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 px-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="text-center mb-10">
          <div className="inline-block p-5 bg-indigo-50 rounded-2xl mb-6 shadow-sm">
            <i className="fas fa-calendar-alt text-4xl text-indigo-600"></i>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">予定管理システム</h2>
          <p className="text-slate-500 mt-3 font-medium">システムを利用するにはログインしてください</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className={`w-full px-5 py-4 rounded-2xl border-2 bg-white text-slate-900 font-bold text-lg ${error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100 focus:border-indigo-500'} focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm placeholder-slate-300`}
              placeholder="パスワードを入力"
            />
            {error && <p className="text-rose-500 text-sm mt-3 ml-1 font-bold flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </p>}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.97] flex items-center justify-center space-x-3"
          >
            <span>ログイン</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-xs font-semibold leading-relaxed">
            ※一般用、管理者用それぞれのパスワードを入力してください。<br/>
            (一般: user / 管理: admin)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
