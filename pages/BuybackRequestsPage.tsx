
import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageSquare, CheckCircle2, RefreshCw, Loader2, Euro, Calendar, Mail, Laptop, Filter, Search, Trash2, ShieldAlert, FileText, ShieldCheck, User } from 'lucide-react';
import { BuybackRequest } from '../types';
import { apiGetBuybackRequests, apiUpdateBuybackRequestStatus } from '../services/buybackService';

const BuybackRequestsPage: React.FC = () => {
    const [requests, setRequests] = useState<BuybackRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const res = await apiGetBuybackRequests();
        if (res.success && res.data) {
            setRequests(res.data);
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        const res = await apiUpdateBuybackRequestStatus(id, status);
        if (res.success) {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             req.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (req.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <ShoppingCart className="text-[#16BBF8]" size={32} /> 
                        Заявки Ankauf
                    </h1>
                    <p className="text-gray-500 font-medium tracking-tight">Керування зверненнями клієнтів з сайту</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={fetchData} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#16BBF8] transition-all shadow-sm">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="relative flex-1 md:flex-none">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Пошук..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-sky-500/10 outline-none w-full md:w-64 shadow-sm text-gray-900"
                        />
                    </div>
                </div>
            </header>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {['all', 'pending', 'contacted', 'completed'].map(status => (
                    <button 
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            filterStatus === status 
                            ? 'bg-[#16BBF8] text-white border-transparent shadow-lg shadow-sky-500/20' 
                            : 'bg-white text-gray-400 border-gray-100 hover:border-sky-200'
                        }`}
                    >
                        {status === 'all' ? 'Всі' : status}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 size={40} className="animate-spin text-[#16BBF8]" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Завантаження заявок...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
                    <ShoppingCart size={64} className="mx-auto text-gray-100 mb-6" />
                    <h3 className="text-xl font-black text-gray-900 uppercase">Заявок не знайдено</h3>
                    <p className="text-gray-400 mt-2 font-medium">Спробуйте змінити фільтри або дочекайтеся нових клієнтів.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredRequests.map(req => (
                        <div key={req.id} className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex gap-4 items-start flex-1 min-w-0">
                                <div className={`p-4 rounded-3xl shrink-0 ${req.is_manual ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-[#16BBF8]'}`}>
                                    <Laptop size={24}/>
                                </div>
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            <User size={12} className="text-slate-500" />
                                            <span className="text-sm font-black text-gray-900">{req.name || 'Анонім'}</span>
                                        </div>
                                        <span className="text-xs font-medium text-gray-400">•</span>
                                        <span className="text-sm font-bold text-gray-600 truncate">{req.email}</span>
                                        
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            req.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                                            req.status === 'contacted' ? 'bg-blue-100 text-blue-600' :
                                            'bg-green-100 text-green-600'
                                        }`}>{req.status}</span>
                                        {req.is_manual && (
                                            <span className="bg-rose-100 text-rose-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <ShieldAlert size={8} /> Ручна оцінка
                                            </span>
                                        )}
                                        {req.data_destruction && (
                                            <span className="bg-green-100 text-green-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <ShieldCheck size={8} /> Потрібне знищення
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs font-bold text-gray-700">{req.brand} {req.model}</div>
                                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest truncate">{req.specs}</div>
                                    
                                    {req.description && (
                                        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 italic">
                                            "{req.description}"
                                        </div>
                                    )}

                                    <div className="text-[10px] text-indigo-500 font-black uppercase flex items-center gap-1 mt-1">
                                        Стан: {req.condition}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                <div className="text-right">
                                    <div className="text-2xl font-black text-gray-900 flex items-start gap-1 justify-end">
                                        {req.offered_price > 0 ? (
                                            <><span className="text-sm mt-1 text-[#16BBF8]">€</span>{req.offered_price.toFixed(2)}</>
                                        ) : (
                                            <span className="text-xs text-amber-500 uppercase tracking-widest font-black">Очікує ціни</span>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1 justify-end">
                                        <Calendar size={10} /> {new Date(req.created_at).toLocaleString('uk-UA')}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a href={`mailto:${req.email}`} className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-500 rounded-2xl transition-all" title="Написати Email"><Mail size={18}/></a>
                                    <button 
                                        onClick={() => handleUpdateStatus(req.id, 'contacted')} 
                                        className={`p-3 rounded-2xl transition-all ${req.status === 'contacted' ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 hover:text-blue-500'}`}
                                        title="Позначити як 'Зв'язалися'"
                                    >
                                        <MessageSquare size={18}/>
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus(req.id, 'completed')} 
                                        className={`p-3 rounded-2xl transition-all ${req.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-400 hover:text-green-500'}`}
                                        title="Завершено"
                                    >
                                        <CheckCircle2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BuybackRequestsPage;
