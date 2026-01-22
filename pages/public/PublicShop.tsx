
import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Filter, Euro, Box, Tag, Laptop, Cpu, HardDrive } from 'lucide-react';
import { searchInventoryLocal } from '../../services/inventoryService';
import { useTranslation } from '../../context/LanguageContext';

interface PublicShopProps {
  onNavigate: (page: string) => void;
}

const PublicShop: React.FC<PublicShopProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async (q: string) => {
    setLoading(true);
    const res = await searchInventoryLocal(q || 'laptop');
    setItems(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems('');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(query);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
            <div className="animate-in fade-in slide-in-from-left duration-500">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{t('shop.title')}</h1>
                <p className="text-slate-500 font-medium mt-2">{t('shop.sub')}</p>
            </div>
            
            <form onSubmit={handleSearch} className="w-full md:w-96 relative animate-in fade-in slide-in-from-right duration-500">
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('shop.searchPlaceholder')}
                    className="w-full pl-6 pr-14 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#16BBF8] text-white rounded-xl hover:bg-[#14a3da] transition-colors shadow-lg shadow-sky-500/20">
                    <Search size={20} />
                </button>
            </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8 hidden lg:block">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                        <Filter size={14} className="text-[#16BBF8]" /> {t('shop.categories')}
                    </h3>
                    <div className="space-y-3">
                        {[t('shop.all'), 'Matrix', 'Keyboards', 'Motherboards', 'Batteries', 'Cases'].map(cat => (
                            <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-200 text-[#16BBF8] focus:ring-[#16BBF8]" />
                                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{cat}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden shadow-xl">
                    <div className="relative z-10">
                        <h4 className="font-black text-xl mb-2">{t('shop.helpTitle')}</h4>
                        <p className="text-slate-400 text-xs leading-relaxed mb-6">{t('shop.helpSub')}</p>
                        <button className="w-full bg-[#16BBF8] text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">{t('shop.helpBtn')}</button>
                    </div>
                    <Cpu size={120} className="absolute -bottom-10 -right-10 opacity-10 text-[#16BBF8]" />
                </div>
            </div>

            {/* Product Grid */}
            <div className="lg:col-span-3">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white aspect-[3/4] rounded-3xl animate-pulse border border-slate-100" />)}
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-sm">
                        <Box size={64} className="mx-auto text-slate-200 mb-6" />
                        <h3 className="text-xl font-black text-slate-900">{t('shop.noResults')}</h3>
                        <p className="text-slate-400 mt-2">{t('shop.noResultsSub')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {items.map(item => (
                            <div key={item.id} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all hover:-translate-y-1">
                                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                                    {item.images && item.images[0] ? (
                                        <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <Laptop size={64} />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-white/20">
                                        SKU: {item.sku}
                                    </div>
                                    {item.stock > 0 ? (
                                        <div className="absolute top-4 right-4 bg-[#18D2A5] text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">{t('shop.inStock')}</div>
                                    ) : (
                                        <div className="absolute top-4 right-4 bg-slate-400 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{t('shop.outOfStock')}</div>
                                    )}
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-[#16BBF8] uppercase tracking-widest">{item.category || 'Component'}</div>
                                        <h3 className="font-black text-slate-900 line-clamp-2 leading-tight h-10 group-hover:text-[#16BBF8] transition-colors">{item.name}</h3>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                        <div className="text-xl font-black text-slate-900 flex items-start gap-1">
                                            <Euro size={16} className="mt-1 text-slate-400" />
                                            {item.price?.toFixed(2)}
                                        </div>
                                        <button className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-[#16BBF8] transition-all active:scale-90 shadow-xl shadow-slate-900/10">
                                            <ShoppingCart size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PublicShop;
