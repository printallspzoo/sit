
import React, { useState, useEffect } from 'react';
import { IncomingLaptop } from '../types';
import { apiGetIncomingLaptops } from '../services/mockBackend';
import { Search, Filter, Calendar, Tag, Package, RefreshCw, AlertCircle, ExternalLink, Euro, MapPin } from 'lucide-react';

interface GenericStatusPageProps {
    status: string;
    title: string;
    icon: any;
    colorClass: string;
    onNavigate: (page: string, params?: any) => void;
}

const GenericStatusPage: React.FC<GenericStatusPageProps> = ({ status, title, icon: Icon, colorClass, onNavigate }) => {
    const [items, setItems] = useState<IncomingLaptop[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState(''); // SKU or Name
    const [filterBrand, setFilterBrand] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        loadItems();
    }, [status]);

    const loadItems = async () => {
        setLoading(true);
        const res = await apiGetIncomingLaptops();
        if (res.success && res.data) {
            // Filter by status strictly
            setItems(res.data.filter(i => i.status === status));
        }
        setLoading(false);
    };

    // Derived filtered list
    const filteredItems = items.filter(item => {
        const matchSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchBrand = filterBrand ? item.name.toLowerCase().includes(filterBrand.toLowerCase()) : true;
        
        const matchDate = filterDate ? item.created_at.startsWith(filterDate) : true;

        return matchSearch && matchBrand && matchDate;
    });

    const totalValue = filteredItems.reduce((acc, i) => acc + (i.purchase_price || 0), 0);

    return (
        <div className="max-w-6xl mx-auto pb-24 px-4 space-y-6 animate-in fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${colorClass.replace('text-', 'bg-').replace('700', '100')} ${colorClass}`}>
                            <Icon size={28} />
                        </div>
                        {title}
                    </h1>
                    <p className="text-gray-500 font-medium tracking-tight mt-1">
                        Знайдено: {filteredItems.length} | Загальна вартість: €{totalValue.toFixed(2)}
                    </p>
                </div>
                <button onClick={loadItems} className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 transition-all shadow-sm">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Пошук по SKU або Назві..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none" 
                    />
                </div>
                <div className="relative w-full md:w-48">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Виробник (Dell...)" 
                        value={filterBrand} 
                        onChange={(e) => setFilterBrand(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none" 
                    />
                </div>
                <div className="relative w-full md:w-48">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none text-gray-600" 
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-gray-300" /></div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 text-gray-300 flex flex-col items-center gap-4">
                    <Package size={64} className="opacity-20"/>
                    <p className="font-black uppercase tracking-widest text-xs">Список порожній</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 hover:border-indigo-100 transition-all flex flex-col md:flex-row gap-6 group relative">
                            <div className="w-full md:w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-100 relative cursor-pointer" onClick={() => window.open(item.photos?.[0], '_blank')}>
                                {item.photos && item.photos[0] ? (
                                    <img 
                                        src={`${item.photos[0]}?width=200&resize=contain`} 
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" 
                                        loading="lazy" 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-[10px]">NO IMG</div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 mb-1">
                                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{item.sku}</span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><MapPin size={10}/> {item.location || 'N/A'}</span>
                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 truncate">{item.name}</h3>
                                <p className="text-xs text-gray-500 font-mono uppercase">S/N: {item.serial_number}</p>
                                
                                {item.notes && (
                                    <p className="mt-2 text-xs text-gray-600 italic truncate max-w-2xl">"{item.notes}"</p>
                                )}
                            </div>

                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 border-gray-50 pt-4 md:pt-0">
                                <div className="text-xl font-black text-gray-900 flex items-center gap-1">
                                    <Euro size={16} className="text-gray-400"/> {item.purchase_price.toFixed(2)}
                                </div>
                                <button 
                                    onClick={() => onNavigate('incoming')} // Go back to main management to edit if needed
                                    className="px-4 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Деталі
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GenericStatusPage;
