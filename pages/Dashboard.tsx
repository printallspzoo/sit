
import React, { useEffect, useState } from 'react';
import { User, TimeLog, DayOffRequest } from '../types';
import { apiGetLogs, apiGetDayOffRequests, apiSubmitDayOffRequest } from '../services/mockBackend';
import { getGreeting, calculateDuration, formatTime, formatDate } from '../utils/timeUtils';
import TimeControls from '../components/TimeControls';
import { Activity, Clock, CalendarDays, Coffee, Plus, Loader2, AlertTriangle, Radio, MonitorOff } from 'lucide-react';

interface DashboardProps {
  user: User;
  onNavigate: (page: string) => void;
  isDesktop?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, isDesktop }) => {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [dayOffRequests, setDayOffRequests] = useState<DayOffRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestDate, setRequestDate] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setError(null);
    try {
        const [logsRes, requestsRes] = await Promise.all([
          apiGetLogs(user.id),
          apiGetDayOffRequests(user.id)
        ]);
        
        if (logsRes.success) {
          setLogs(logsRes.data || []);
          setActiveLog(logsRes.data?.find(l => l.status === 'active') || null);
        }
        
        if (requestsRes.success) {
          setDayOffRequests(requestsRes.data || []);
        }
    } catch (e: any) {
        setError("Error loading data. Check console.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDate) return;
    setSubmitting(true);
    const res = await apiSubmitDayOffRequest(user.id, requestDate, requestReason);
    setSubmitting(false);
    if (res.success) {
      setIsModalOpen(false);
      setRequestDate('');
      setRequestReason('');
      fetchData();
      alert("Заявку надіслано!");
    } else {
        alert("Помилка: " + res.error);
    }
  };

  const weeklyHours = logs.reduce((acc, log) => {
    const isThisWeek = new Date(log.checkIn).getTime() > new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
    return isThisWeek ? acc + (log.durationMinutes || 0) : acc;
  }, 0);

  const availableDays = (user.freeDaysAllowance ?? 15) - (user.freeDaysUsed ?? 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{getGreeting()}, {user.name.split(' ')[0]}</h1>
            <div className="flex items-center gap-2">
                <p className="text-gray-500 font-medium">{user.department} Department</p>
                {activeLog && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse border border-green-200">
                        <Radio size={10} /> Live Session
                    </span>
                )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-white px-5 py-2.5 rounded-2xl shadow-sm text-sm text-gray-600 border border-gray-100">
            <CalendarDays size={18} className="text-indigo-500"/>
            <span className="font-bold">{new Date().toLocaleDateString('uk-UA', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            {/* 
              ПЕРЕВІРКА: Приховуємо TimeControls на десктопі, 
              якщо користувач не адмін (адмінам можна все) 
            */}
            {!isDesktop || user.role === 'admin' ? (
                <TimeControls user={user} activeLog={activeLog} onUpdate={fetchData} onNavigate={onNavigate} />
            ) : (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex items-center gap-6">
                    <div className="bg-amber-100 p-4 rounded-3xl text-amber-600">
                        <MonitorOff size={32} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Трекінг лише з мобільного</h3>
                        <p className="text-xs text-gray-400 font-medium">Для позначки входу/виходу використовуйте ваш зареєстрований телефон та QR-код на терміналі.</p>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-2 text-gray-400 mb-4">
                            <Clock size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Тижневі години</span>
                        </div>
                        <div className="text-3xl font-black text-gray-900">{(weeklyHours / 60).toFixed(1)} <span className="text-sm font-bold text-gray-300">/ 40h</span></div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-6 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (weeklyHours / 40 / 60) * 100)}%` }}></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2 text-gray-400">
                            <Coffee size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Вихідні дні</span>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-black text-gray-900">{availableDays}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase">доступно</div>
                    </div>
                    <div className="mt-4 space-y-2">
                        {dayOffRequests.length === 0 && <div className="text-[10px] text-gray-300 italic">Немає заявок</div>}
                        {dayOffRequests.slice(0, 3).map(req => (
                            <div key={req.id} className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <span>{req.date}</span>
                                <span className={req.status === 'approved' ? 'text-green-500' : req.status === 'rejected' ? 'text-rose-500' : 'text-indigo-500'}>{req.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                Остання активність
            </h3>
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
                {logs.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Немає записів</p>}
                {logs.map((log) => (
                    <div key={log.id} className="group p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-100 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase">{formatDate(log.checkIn)}</span>
                            <div className="relative h-2 w-2">
                                <div className={`absolute inset-0 rounded-full ${log.status === 'active' ? 'bg-green-500 animate-ping' : 'bg-transparent'}`} />
                                <div className={`relative h-2 w-2 rounded-full ${log.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 font-mono text-sm">
                                <span className="font-black text-indigo-600">{formatTime(log.checkIn)}</span>
                                <span className="text-gray-300">→</span>
                                <span className="text-gray-600">{log.checkOut ? formatTime(log.checkOut) : '...'}</span>
                            </div>
                            <span className="text-xs font-black text-gray-900">
                                {log.status === 'active' ? calculateDuration(log.checkIn, null) : `${Math.floor(log.durationMinutes / 60)}г ${log.durationMinutes % 60}хв`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {error && (
          <div className="fixed bottom-10 left-10 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-3 shadow-2xl animate-bounce">
              <AlertTriangle size={20} />
              <div className="text-xs font-bold uppercase tracking-widest">{error}</div>
          </div>
      )}

      {/* Day Off Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 border border-gray-100">
                <div className="flex justify-between items-start mb-8">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Заявка на Day Off</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><Plus className="rotate-45" size={24} /></button>
                </div>
                <form onSubmit={handleSubmitRequest} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Дата</label>
                        <input type="date" required value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all"/>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Причина (опціонально)</label>
                        <textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Особисті справи..." className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all h-24 resize-none"/>
                    </div>
                    <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Надіслати запит'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
