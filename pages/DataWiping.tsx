
import React, { useState, useEffect } from 'react';
import { HardDrive, Upload, Plus, FileText, CheckCircle2, AlertTriangle, RefreshCw, ShoppingCart, Trash2, ShieldCheck, Download } from 'lucide-react';
import { ErasureJob, DiskInfo, User } from '../types';
import { apiGetErasureJobs, apiCreateErasureJob, apiGetDisksForJob, apiParseKillDiskReport, apiSyncToBaselinker } from '../services/mockBackend';

interface DataWipingProps {
    user: User;
}

const DataWiping: React.FC<DataWipingProps> = ({ user }) => {
    const [jobs, setJobs] = useState<ErasureJob[]>([]);
    const [selectedJob, setSelectedJob] = useState<ErasureJob | null>(null);
    const [disks, setDisks] = useState<DiskInfo[]>([]);
    
    // UI States
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [isParsing, setIsParsing] = useState(false);
    const [isSyncing, setIsSyncing] = useState<string | null>(null); // Disk ID being synced
    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const [newClientName, setNewClientName] = useState('');

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        setLoadingJobs(true);
        const res = await apiGetErasureJobs();
        if (res.success && res.data) setJobs(res.data);
        setLoadingJobs(false);
    };

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newClientName.trim()) return;
        
        const res = await apiCreateErasureJob(newClientName);
        if (res.success && res.data) {
            setJobs([res.data, ...jobs]);
            setSelectedJob(res.data);
            setDisks([]);
            setShowNewJobModal(false);
            setNewClientName('');
        }
    };

    const handleSelectJob = async (job: ErasureJob) => {
        setSelectedJob(job);
        const res = await apiGetDisksForJob(job.id);
        if(res.success && res.data) setDisks(res.data);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedJob || !e.target.files?.[0]) return;
        
        const file = e.target.files[0];
        setIsParsing(true);
        
        // Mock reading file as text
        // In real app: const text = await file.text();
        const text = "mock-xml-content"; 
        
        const res = await apiParseKillDiskReport(selectedJob.id, text);
        setIsParsing(false);
        
        if (res.success && res.data) {
            setDisks([...disks, ...res.data]);
        } else {
            alert("Parsing Failed: " + res.error);
        }
    };

    const sendToBaselinker = async (disk: DiskInfo) => {
        setIsSyncing(disk.id);
        const res = await apiSyncToBaselinker(disk);
        setIsSyncing(null);
        
        if (res.success && res.data) {
            // Update local state to reflect change
            setDisks(prev => prev.map(d => d.id === disk.id ? { ...d, baselinkerId: res.data } : d));
        } else {
            alert("API Error: " + res.error);
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <HardDrive className="text-rose-600" size={32} /> 
                        Знищення Даних
                    </h1>
                    <p className="text-gray-500 font-medium tracking-tight">KillDisk Integration & Baselinker Workflow</p>
                </div>
                <button 
                    onClick={() => setShowNewJobModal(true)}
                    className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                    <Plus size={16} /> Нове Замовлення
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Job List (Left) */}
                <div className="lg:col-span-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden h-[600px] flex flex-col">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Активні Замовлення</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loadingJobs ? (
                            <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-gray-300" /></div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center p-10 text-gray-400 text-xs font-bold uppercase">Список порожній</div>
                        ) : (
                            jobs.map(job => (
                                <button 
                                    key={job.id} 
                                    onClick={() => handleSelectJob(job)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedJob?.id === job.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-900">{job.clientName}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${job.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium flex justify-between">
                                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><HardDrive size={10} /> {job.diskCount || disks.length} дисків</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Job View (Right) */}
                <div className="lg:col-span-8 space-y-6">
                    {selectedJob ? (
                        <>
                            {/* Actions Bar */}
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">{selectedJob.clientName}</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">ID: {selectedJob.id}</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <label className="flex-1 md:flex-none cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                        {isParsing ? <RefreshCw className="animate-spin" size={16}/> : <Upload size={16} />}
                                        {isParsing ? 'Парсинг...' : 'Завантажити XML'}
                                        <input type="file" accept=".xml" className="hidden" onChange={handleFileUpload} disabled={isParsing} />
                                    </label>
                                    <button className="px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 font-bold transition-colors">
                                        <FileText size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Disk Table */}
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                                {disks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-300 gap-4">
                                        <Upload size={48} className="opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest">Завантажте звіт KillDisk (XML)</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50/50 border-b border-gray-50">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Диск / S/N</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Сертифікат</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Дія</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {disks.map(disk => (
                                                    <tr key={disk.id} className="hover:bg-indigo-50/5 group">
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-black text-gray-900">{disk.model}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 font-mono">{disk.serialNumber} • {disk.capacity}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                                disk.wipingStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                                                            }`}>
                                                                {disk.wipingStatus === 'success' ? <ShieldCheck size={12}/> : <AlertTriangle size={12}/>}
                                                                {disk.wipingStatus}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <button className="text-indigo-600 hover:underline text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                                                <Download size={12} /> PDF Cert
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {disk.baselinkerId ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                                                    <ShoppingCart size={12} /> Baselinker: {disk.baselinkerId}
                                                                </span>
                                                            ) : disk.wipingStatus === 'success' ? (
                                                                <button 
                                                                    onClick={() => sendToBaselinker(disk)}
                                                                    disabled={!!isSyncing}
                                                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center gap-1"
                                                                >
                                                                    {isSyncing === disk.id ? <RefreshCw size={10} className="animate-spin" /> : <ShoppingCart size={10} />}
                                                                    Продати
                                                                </button>
                                                            ) : (
                                                                <button className="text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ml-auto">
                                                                    <Trash2 size={10} /> Recycle
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-white rounded-[2rem] border border-gray-100 shadow-sm text-gray-300">
                             <p className="font-black uppercase tracking-widest text-xs">Оберіть замовлення зліва</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for New Job */}
            {showNewJobModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full">
                        <h3 className="text-xl font-black text-gray-900 mb-6">Нова партія</h3>
                        <form onSubmit={handleCreateJob} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Назва клієнта</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none text-gray-900 transition-all"
                                    placeholder="Enter Client Name..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowNewJobModal(false)} className="flex-1 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Cancel</button>
                                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataWiping;
