
import React, { useState, useEffect } from 'react';
import { RepairJob } from '../types';
import { apiGetRepairJobs, apiUpdateRepairJobStatus } from '../services/mockBackend';
import { Wrench, CheckCircle2, Clock, Play, AlertCircle, ShoppingCart, Euro, Package } from 'lucide-react';

interface RepairQueueProps {
    onNavigate: (page: string, params?: any) => void;
}

const RepairQueue: React.FC<RepairQueueProps> = ({ onNavigate }) => {
    const [jobs, setJobs] = useState<RepairJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        const res = await apiGetRepairJobs();
        if (res.success && res.data) {
            setJobs(res.data);
        }
        setLoading(false);
    };

    const handleStatusChange = async (id: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
        // Optimistic update
        setJobs(prev => prev.map(job => job.id === id ? { ...job, status: newStatus } : job));
        
        const res = await apiUpdateRepairJobStatus(id, newStatus);
        if (!res.success) {
            // Revert on fail
            fetchJobs();
            alert("Помилка оновлення статусу");
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const columns = [
        { id: 'pending', title: 'В черзі', icon: Clock, color: 'text-amber-500' },
        { id: 'in_progress', title: 'В роботі', icon: Wrench, color: 'text-blue-500' },
        { id: 'completed', title: 'Готово', icon: CheckCircle2, color: 'text-green-500' }
    ];

    if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            <header>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <Wrench className="text-indigo-600" size={32} /> 
                    Черга Ремонтів
                </h1>
                <p className="text-gray-500 font-medium tracking-tight">Управління статусами ремонтних робіт</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
                {columns.map(col => {
                    const colJobs = jobs.filter(j => j.status === col.id);
                    const Icon = col.icon;
                    
                    return (
                        <div key={col.id} className="flex flex-col h-full min-w-[300px]">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className={`flex items-center gap-2 font-black uppercase tracking-widest text-sm ${col.color}`}>
                                    <Icon size={18} /> {col.title}
                                </div>
                                <span className="bg-white px-3 py-1 rounded-xl text-xs font-bold text-gray-400 border border-gray-100 shadow-sm">{colJobs.length}</span>
                            </div>

                            <div className="flex-1 bg-gray-100/50 rounded-[2rem] p-4 space-y-4 border border-gray-100 min-h-[500px]">
                                {colJobs.length === 0 && (
                                    <div className="text-center py-10 text-gray-300 font-bold uppercase text-xs">
                                        Порожньо
                                    </div>
                                )}
                                {colJobs.map(job => (
                                    <div key={job.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {job.id}</div>
                                            <div className="text-[10px] font-bold text-gray-400">{new Date(job.created_at).toLocaleDateString()}</div>
                                        </div>
                                        
                                        <h3 
                                            onClick={() => onNavigate('repair-advisor', { prefilledJob: job })}
                                            className="text-sm font-black text-gray-900 mb-3 cursor-pointer hover:text-indigo-600 hover:underline decoration-dotted transition-colors"
                                            title="Відкрити в Repair Advisor"
                                        >
                                            {job.model}
                                        </h3>
                                        
                                        {/* Parts Summary */}
                                        <div className="flex gap-2 mb-4">
                                            {job.local_parts && job.local_parts.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                                                    <Package size={10} /> {job.local_parts.length} Local
                                                </div>
                                            )}
                                            {job.external_parts && job.external_parts.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-lg">
                                                    <ShoppingCart size={10} /> {job.external_parts.length} Ext
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                                            <div className="font-black text-gray-700 flex items-center gap-1">
                                                <Euro size={12}/> {job.total_cost_eur?.toFixed(2)}
                                            </div>
                                            
                                            <div className="flex gap-1">
                                                {job.status !== 'pending' && (
                                                    <button onClick={() => handleStatusChange(job.id, 'pending')} className="p-2 rounded-xl bg-gray-50 hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors" title="Move to Pending">
                                                        <Clock size={14} />
                                                    </button>
                                                )}
                                                {job.status !== 'in_progress' && (
                                                    <button onClick={() => handleStatusChange(job.id, 'in_progress')} className="p-2 rounded-xl bg-gray-50 hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors" title="Start Repair">
                                                        <Play size={14} />
                                                    </button>
                                                )}
                                                {job.status !== 'completed' && (
                                                    <button onClick={() => handleStatusChange(job.id, 'completed')} className="p-2 rounded-xl bg-gray-50 hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors" title="Complete">
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RepairQueue;
