
import React, { useState } from 'react';
import { Smartphone, ShieldAlert, Copy, Check, LogOut } from 'lucide-react';
import { User } from '../types';

interface DeviceRegistrationScreenProps {
  user: User;
  deviceId: string;
  onLogout: () => void;
}

const DeviceRegistrationScreen: React.FC<DeviceRegistrationScreenProps> = ({ user, deviceId, onLogout }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full space-y-10 text-center">
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <div className="absolute inset-0 bg-rose-500 blur-3xl opacity-20 animate-pulse"></div>
                <div className="bg-rose-500/10 border-2 border-rose-500/50 p-6 rounded-[2.5rem] relative">
                    <ShieldAlert size={64} className="text-rose-500" />
                </div>
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight uppercase">Доступ заблоковано</h1>
                <p className="text-gray-400 text-sm font-medium">Ваш пристрій не зареєстрований у системі Sitrem</p>
            </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Ваш унікальний Sitrem ID пристрою:</p>
            
            <div className="relative group">
                <div className="bg-black/40 border border-white/10 p-5 rounded-2xl font-mono text-xs font-black tracking-wider text-indigo-400 break-all select-all">
                    {deviceId}
                </div>
                <button 
                    onClick={handleCopy}
                    className="absolute -top-3 -right-3 bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl shadow-xl transition-all active:scale-90"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
            </div>

            <div className="space-y-4 text-left">
                <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                    <p className="text-xs font-bold text-gray-300">Скопіюйте ID вище</p>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                    <p className="text-xs font-bold text-gray-300">Надішліть його адміністратору Sitrem через Telegram/Email</p>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                    <p className="text-xs font-bold text-gray-300">Очікуйте на підтвердження реєстрації</p>
                </div>
            </div>
        </div>

        <div className="pt-6">
            <button 
                onClick={onLogout}
                className="flex items-center gap-2 mx-auto text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
                <LogOut size={14} /> Вийти з акаунта
            </button>
        </div>
        
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
            © 2025 SITREM SECURITY • DEVICE_LOCK_v1.0
        </p>
      </div>
    </div>
  );
};

export default DeviceRegistrationScreen;
