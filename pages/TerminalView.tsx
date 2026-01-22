
import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { apiGenerateTerminalToken } from '../services/mockBackend';
import { RefreshCw, Clock, ShieldCheck, LogOut, Wifi, Lock, AlertTriangle } from 'lucide-react';

interface TerminalViewProps {
  onLogout: () => void;
}

const TerminalView: React.FC<TerminalViewProps> = ({ onLogout }) => {
  const [terminalToken, setTerminalToken] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshToken = async () => {
    try {
        setError(null);
        const res = await apiGenerateTerminalToken();
        if (res.success && res.data) {
          setTerminalToken(res.data);
          // Sync countdown to server time window if possible, otherwise just reset
          const secondsInWindow = Math.floor((Date.now() % 30000) / 1000);
          setTimeLeft(30 - secondsInWindow);
        } else {
            setError("Token Error");
        }
    } catch (e) {
        setError("Network Error");
    } finally {
        setLoading(false);
    }
  };

  // Token Cycle
  useEffect(() => {
    refreshToken();
    const interval = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                refreshToken();
                return 30;
            }
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden font-sans select-none touch-none" style={{ height: '100dvh' }}>
      {/* Safe Area Spacer for Notch */}
      <div className="h-[env(safe-area-inset-top)] bg-black w-full" />

      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-900/30 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center px-6 py-4 md:px-10 md:py-6 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-4">
          <img 
            src="https://sitrem.de/wp-content/uploads/2023/02/cropped-sitrem_color_logo-3-1536x367.png" 
            alt="Sitrem" 
            className="h-6 md:h-10 brightness-0 invert object-contain"
          />
          <div className="hidden md:block h-6 w-[1px] bg-white/20"></div>
          <div className="hidden md:block">
            <h1 className="text-sm font-black uppercase tracking-tighter">Terminal Point</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Online
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xl md:text-3xl font-black tracking-tighter tabular-nums">
            {currentTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {currentTime.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      {/* Main Content Area - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        
        {/* QR Card */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col items-center gap-6 w-full max-w-sm md:max-w-md animate-in zoom-in-95 duration-500">
          <div className="text-center">
            <h2 className="text-gray-900 text-lg md:text-xl font-black uppercase tracking-tight">Scan to Check-in</h2>
            <div className="flex items-center justify-center gap-1.5 text-indigo-600 mt-1">
                <Lock size={12} />
                <p className="text-[10px] font-black uppercase tracking-widest">Secure Entry</p>
            </div>
          </div>

          <div className="relative p-4 bg-white rounded-[2rem] border-4 border-gray-50 shadow-inner w-full aspect-square flex items-center justify-center">
            {loading ? (
                 <RefreshCw className="animate-spin text-indigo-600" size={40} />
            ) : error ? (
                <div className="flex flex-col items-center text-rose-500 gap-2">
                    <AlertTriangle size={32} />
                    <span className="text-xs font-bold uppercase">Connection Lost</span>
                    <button onClick={refreshToken} className="mt-2 bg-rose-100 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-rose-200">Retry</button>
                </div>
            ) : terminalToken ? (
              <QRCode 
                value={terminalToken} 
                size={256} 
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            ) : null}
            
            {/* Visual Corners */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl"></div>
          </div>

          <div className="w-full space-y-2">
              <div className="flex justify-between items-end px-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Refresh in</div>
                  <div className="text-xs font-black text-indigo-600 tabular-nums">{timeLeft}s</div>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                  />
              </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-4 mt-8 md:mt-12">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                <ShieldCheck size={14} className="text-green-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Verified</span>
            </div>
             <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                <Wifi size={14} className="text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Live</span>
            </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-6 md:p-10 flex justify-center pb-[env(safe-area-inset-bottom)]">
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-rose-600/20 active:bg-rose-600/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 text-gray-400 hover:text-white"
        >
          <LogOut size={14} /> Close Terminal
        </button>
      </div>
    </div>
  );
};

export default TerminalView;
