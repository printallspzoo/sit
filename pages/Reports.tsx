
import React, { useState, useEffect } from 'react';
import { User, Project, ReportEntry, Report } from '../types';
import { apiSubmitReport, apiGetProjects, apiGetUserReports } from '../services/mockBackend';
import { generateReportSummary } from '../services/geminiService';
// Added RefreshCw to imports
import { Plus, X, Sparkles, Send, FileText, Briefcase, Clock, ChevronRight, Trash2, PieChart, AlertCircle, History, Package, Laptop, Wrench, Settings, Box, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { formatDate } from '../utils/timeUtils';

interface ReportsProps {
  user: User;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [currentTask, setCurrentTask] = useState('');
  const [currentDuration, setCurrentDuration] = useState<string>('30');
  
  const [partsListed, setPartsListed] = useState<string>('');
  const [laptopsListed, setLaptopsListed] = useState<string>('');
  const [laptopsRepaired, setLaptopsRepaired] = useState<string>('');
  const [laptopsDisassembled, setLaptopsDisassembled] = useState<string>('');
  const [parcelsPacked, setParcelsPacked] = useState<string>('');
  const [partsReceived, setPartsReceived] = useState<string>('');

  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dept = user.department?.toUpperCase();
  const isIT = dept === 'IT';
  const isKontent = dept === 'KONTENT';
  const isService = dept === 'SERVICE';
  const isBase = dept === 'BASE';

  useEffect(() => {
    const loadData = async () => {
        setLoadingProjects(true);
        const [projRes, histRes] = await Promise.all([apiGetProjects(), apiGetUserReports(user.id)]);
        if (projRes.success && projRes.data) {
            setProjects(projRes.data);
            if (projRes.data.length > 0) setSelectedProjectId(projRes.data[0].id);
        }
        if (histRes.success && histRes.data) setMyReports(histRes.data);
        setLoadingProjects(false);
    };
    loadData();
  }, [user.id]);

  const addEntry = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentTask.trim() || !selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);
    const newEntry: ReportEntry = {
        projectId: selectedProjectId,
        projectName: project?.name || 'Unknown',
        projectColor: project?.color || '#ccc',
        task: currentTask.trim(),
        duration: parseInt(currentDuration) || 0,
        partsListed: isKontent ? (parseInt(partsListed) || 0) : undefined,
        laptopsListed: isKontent ? (parseInt(laptopsListed) || 0) : undefined,
        laptopsRepaired: isService ? (parseInt(laptopsRepaired) || 0) : undefined,
        laptopsDisassembled: isService ? (parseInt(laptopsDisassembled) || 0) : undefined,
        parcelsPacked: isBase ? (parseInt(parcelsPacked) || 0) : undefined,
        partsReceived: isBase ? (parseInt(partsReceived) || 0) : undefined,
    };
    setEntries([...entries, newEntry]);
    setCurrentTask(''); setPartsListed(''); setLaptopsListed(''); setLaptopsRepaired(''); setLaptopsDisassembled(''); setParcelsPacked(''); setPartsReceived('');
  };

  const removeEntry = (index: number) => setEntries(entries.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!summary || entries.length === 0) return;
    setIsSubmitting(true);
    const res = await apiSubmitReport({ userId: user.id, date: new Date().toISOString().split('T')[0], summary, entries });
    setIsSubmitting(false);
    if (res.success) {
        setEntries([]); setSummary(''); alert("Звіт успішно відправлено!");
        const histRes = await apiGetUserReports(user.id);
        if (histRes.success && histRes.data) setMyReports(histRes.data);
    } else { setErrorMsg(res.error || "Помилка відправки"); }
  };

  const totalHours = (entries.reduce((acc, curr) => acc + curr.duration, 0) / 60).toFixed(1);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-24 px-2 md:px-0">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Daily Report</h1>
                <p className="text-gray-500 text-xs md:text-sm font-medium">Сьогодні: {new Date().toLocaleDateString('uk-UA')}</p>
            </div>
            <div className="bg-indigo-50 px-4 md:px-5 py-3 rounded-2xl border border-indigo-100 flex items-center gap-3">
                <Clock className="text-indigo-600" size={20} />
                <div>
                    <div className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Разом за зміну</div>
                    <div className="text-xl font-black text-indigo-900 leading-none">{totalHours} <span className="text-xs text-indigo-400 uppercase font-bold">год</span></div>
                </div>
            </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-900/5 border border-gray-100 p-6 md:p-8">
                    <h2 className="text-base md:text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                        <Plus className="bg-[#16BBF8] text-white rounded-lg p-1" size={24} /> Новий запис
                    </h2>
                    
                    <form onSubmit={addEntry} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Проект</label>
                            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-4 py-4 text-base font-bold text-gray-900 outline-none appearance-none">
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {/* Metrics Grouped for Mobile */}
                        {(isKontent || isService || isBase) && (
                            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                {isKontent && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase px-1">Запчастини</label>
                                            <input type="number" inputMode="numeric" value={partsListed} onChange={(e) => setPartsListed(e.target.value)} placeholder="0" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-black outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase px-1">Ноутбуки</label>
                                            <input type="number" inputMode="numeric" value={laptopsListed} onChange={(e) => setLaptopsListed(e.target.value)} placeholder="0" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-black outline-none" />
                                        </div>
                                    </>
                                )}
                                {isService && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase px-1">Зремонтовано</label>
                                            <input type="number" inputMode="numeric" value={laptopsRepaired} onChange={(e) => setLaptopsRepaired(e.target.value)} placeholder="0" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-black outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase px-1">Розібрано</label>
                                            <input type="number" inputMode="numeric" value={laptopsDisassembled} onChange={(e) => setLaptopsDisassembled(e.target.value)} placeholder="0" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-black outline-none" />
                                        </div>
                                    </>
                                )}
                                {isBase && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase px-1">Посилки</label>
                                            <input type="number" inputMode="numeric" value={parcelsPacked} onChange={(e) => setParcelsPacked(e.target.value)} placeholder="0" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-black outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase px-1">Деталі IN</label>
                                            <input type="number" inputMode="numeric" value={partsReceived} onChange={(e) => setPartsReceived(e.target.value)} placeholder="0" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-black outline-none" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Опис</label>
                            <textarea value={currentTask} onChange={(e) => setCurrentTask(e.target.value)} placeholder="Короткий опис..." className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-4 py-4 text-base font-medium text-gray-900 outline-none h-32 resize-none transition-all shadow-inner" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Тривалість (хв)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" inputMode="numeric" step="5" value={currentDuration} onChange={(e) => setCurrentDuration(e.target.value)} className="w-24 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-4 py-4 text-base font-black text-gray-900 outline-none" />
                                <div className="flex gap-1 flex-1 overflow-x-auto no-scrollbar">
                                    {[15, 30, 45, 60].map(val => (
                                        <button key={val} type="button" onClick={() => setCurrentDuration(val.toString())} className={`px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${currentDuration === val.toString() ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>{val}m</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-indigo-600 active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2">Додати в список <ChevronRight size={18} /></button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
                 <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 min-h-[200px]">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex justify-between items-center"><span>Список справ за день</span><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{entries.length}</span></h3>

                    {entries.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-300 gap-4 opacity-50"><Briefcase size={64}/><p className="text-[10px] font-black uppercase tracking-widest">Список порожній</p></div>
                    ) : (
                        <div className="space-y-3">
                            {entries.map((entry, idx) => (
                                <div key={idx} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-start justify-between group">
                                    <div className="flex gap-4">
                                        <div className="mt-1.5 w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.projectColor }} />
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black uppercase text-slate-400 leading-none">{entry.projectName} • {entry.duration} хв</div>
                                            <div className="text-sm font-bold text-slate-900 leading-tight">{entry.task}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeEntry(idx)} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>

                 <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px]" />
                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-tight"><Sparkles className="text-amber-400" size={20}/> AI Підсумок</h3>
                            {isIT && (
                                <button onClick={async () => { setIsGenerating(true); setSummary(await generateReportSummary(entries)); setIsGenerating(false); }} disabled={entries.length === 0 || isGenerating} className="bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all border border-white/10">{isGenerating ? 'Think...' : 'Auto'}</button>
                            )}
                        </div>
                        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="Підсумок дня..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-base text-white placeholder-white/20 focus:bg-white/10 outline-none resize-none transition-all" />
                        <button onClick={handleSubmit} disabled={isSubmitting || !summary} className="w-full bg-[#16BBF8] text-white py-5 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2">{isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <Send size={16}/>} Надіслати звіт адміністратору</button>
                    </div>
                 </div>
            </div>
       </div>
    </div>
  );
};

export default Reports;
