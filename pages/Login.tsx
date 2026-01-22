
import React, { useState } from 'react';
import { Lock, Mail, User, AlertCircle, Monitor } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  onAdminLogin: (u: string, p: string) => Promise<boolean>;
  loading: boolean;
}

const Login: React.FC<LoginProps> = ({ onAdminLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isTerminalMode, setIsTerminalMode] = useState(false);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
        setError('Будь ласка, введіть email та пароль');
        return;
    }

    const result = await onAdminLogin(email, password);
    if (!result) {
        setError('Помилка входу. Перевірте облікові дані.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-10 space-y-8 text-center">
          <div className="flex flex-col items-center">
             <img 
                src="https://sitrem.de/wp-content/uploads/2023/02/cropped-sitrem_color_logo-3-1536x367.png" 
                alt="Sitrem Logo" 
                className="h-16 md:h-20 w-auto object-contain mb-6 drop-shadow-sm"
             />
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                {isTerminalMode ? 'Terminal System Login' : 'Employee Portal Login'}
             </p>
          </div>
          
          <form onSubmit={handleCredentialSubmit} className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Електронна пошта</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-indigo-600 transition-colors">
                        <Mail size={18} />
                    </div>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-14 pr-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none text-gray-900"
                        placeholder={isTerminalMode ? "terminal@sitrem.de" : "your@company.com"}
                        autoFocus
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Пароль</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-indigo-600 transition-colors">
                        <Lock size={18} />
                    </div>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-14 pr-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none text-gray-900"
                        placeholder="••••••••"
                    />
                </div>
            </div>
            
            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-3 border border-rose-100 animate-in shake duration-500">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className={`w-full text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs ${isTerminalMode ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-gray-900 hover:bg-indigo-600 shadow-indigo-100'}`}
            >
                {loading ? 'ВХІД...' : isTerminalMode ? 'УВІЙТИ ЯК ТЕРМІНАЛ' : 'УВІЙТИ В ПОРТАЛ'}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-50">
            <button 
                onClick={() => setIsTerminalMode(!isTerminalMode)}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center justify-center gap-2 mx-auto"
            >
                <Monitor size={14} />
                {isTerminalMode ? 'Повернутися до порталу працівника' : 'Увійти в режимі терміналу входу'}
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            © 2025 SITREM • SECURE ACCESS
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
