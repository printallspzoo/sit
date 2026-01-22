
import React from 'react';
import { ShieldCheck, RefreshCw, Truck, Zap, ArrowRight, Laptop, Wrench, ShoppingCart, ShoppingBag as BagIcon } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface PublicHomeProps {
  onNavigate: (page: string) => void;
}

const PublicHome: React.FC<PublicHomeProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-slate-50 overflow-hidden py-24 md:py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl animate-in fade-in slide-in-from-left duration-700">
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-10">
              {t('home.heroTitle').split(' ').map((word, i) => (
                i === 2 ? <span key={i} className="text-[#16BBF8] block">{word} </span> : <span key={i}>{word} </span>
              ))}
            </h1>
            <p className="text-xl text-slate-500 font-medium mb-12 max-w-xl leading-relaxed">
              {t('home.heroSub')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => onNavigate('ankauf')}
                className="px-10 py-6 bg-[#16BBF8] text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl shadow-sky-500/30 hover:bg-[#14a3da] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {t('home.sellBtn')} <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => onNavigate('repair-public')}
                className="px-10 py-6 bg-white text-slate-900 border-2 border-slate-200 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:border-[#16BBF8] hover:text-[#16BBF8] transition-all flex items-center justify-center gap-3"
              >
                {t('home.repairBtn')} <Wrench size={18} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Abstract sitrem logo decoration */}
        <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-1/2 h-full opacity-5 pointer-events-none">
            <Laptop size={1000} className="text-[#16BBF8]" />
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-14 border-b border-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between gap-10">
            <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-[#16BBF8]"><ShieldCheck size={20} className="text-[#16BBF8]"/> {t('home.trust.secure')}</div>
            <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-[#16BBF8]"><RefreshCw size={20} className="text-[#18D2A5]"/> {t('home.trust.eco')}</div>
            <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-[#16BBF8]"><Truck size={20} className="text-[#16BBF8]"/> {t('home.trust.fast')}</div>
            <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-[#16BBF8]"><Zap size={20} className="text-[#18D2A5]"/> {t('home.trust.express')}</div>
        </div>
      </section>

      {/* Quick Services Grid */}
      <section className="py-32 bg-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{t('home.servicesTitle')}</h2>
            <div className="h-1.5 w-24 bg-[#16BBF8] mx-auto mt-4 rounded-full shadow-lg shadow-sky-500/20"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* ANKAUF CARD */}
            <div className="group bg-slate-50 rounded-[3rem] p-12 transition-all hover:bg-white hover:shadow-2xl hover:shadow-sky-500/5 border border-transparent hover:border-sky-100">
                <div className="w-16 h-16 bg-white text-[#16BBF8] rounded-2xl flex items-center justify-center mb-10 shadow-sm group-hover:bg-[#16BBF8] group-hover:text-white transition-all transform group-hover:rotate-6">
                    <ShoppingCart size={32} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-6">{t('nav.ankauf')}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-10">
                    {t('home.ankaufDesc')}
                </p>
                <button onClick={() => onNavigate('ankauf')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 group-hover:bg-[#16BBF8] transition-colors">
                    Get Price <ArrowRight size={14} />
                </button>
            </div>

            {/* REPAIR CARD */}
            <div className="group bg-slate-50 rounded-[3rem] p-12 transition-all hover:bg-white hover:shadow-2xl hover:shadow-sky-500/5 border border-transparent hover:border-sky-100">
                <div className="w-16 h-16 bg-white text-slate-900 rounded-2xl flex items-center justify-center mb-10 shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:-rotate-6">
                    <Wrench size={32} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-6">{t('nav.repair')}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-10">
                    {t('home.repairDesc')}
                </p>
                <button onClick={() => onNavigate('repair-public')} className="w-full py-4 bg-slate-200 text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all">
                    Service <ArrowRight size={14} />
                </button>
            </div>

            {/* SHOP CARD */}
            <div className="group bg-slate-50 rounded-[3rem] p-12 transition-all hover:bg-white hover:shadow-2xl hover:shadow-sky-500/5 border border-transparent hover:border-sky-100">
                <div className="w-16 h-16 bg-white text-[#18D2A5] rounded-2xl flex items-center justify-center mb-10 shadow-sm group-hover:bg-[#18D2A5] group-hover:text-white transition-all transform group-hover:rotate-6">
                    <BagIcon size={32} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-6">{t('nav.shop')}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-10">
                    {t('home.shopDesc')}
                </p>
                <button onClick={() => onNavigate('shop')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 group-hover:bg-[#18D2A5] transition-colors">
                    Catalog <ArrowRight size={14} />
                </button>
            </div>
        </div>
      </section>

      {/* Modern CTA */}
      <section className="bg-slate-900 py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#16BBF8]/10 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-16 relative z-10">
            <div className="space-y-8 text-center md:text-left">
                <h2 className="text-5xl font-black text-white tracking-tight leading-none uppercase">
                   {t('home.ctaTitle').split('?')[0]}? <br /> <span className="text-[#16BBF8]">{t('home.ctaTitle').split('?')[1] || ''}</span>
                </h2>
                <p className="text-slate-400 text-lg max-w-md font-medium">{t('home.ctaSub')}</p>
            </div>
            <button 
                onClick={() => onNavigate('ankauf')}
                className="px-16 py-8 bg-white text-slate-900 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-sm hover:bg-[#16BBF8] hover:text-white transition-all transform hover:scale-105 shadow-2xl"
            >
                {t('home.ctaBtn')}
            </button>
        </div>
      </section>
    </div>
  );
};

export default PublicHome;
