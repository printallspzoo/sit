
import React from 'react';
import { Wrench, MapPin, Clock, ShieldCheck, ArrowRight, MessageSquare, Phone } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const PublicRepair: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white min-h-screen">
      {/* Page Header */}
      <section className="bg-slate-900 py-24 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-20 opacity-10">
            <Wrench size={400} className="text-[#16BBF8]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
            <div className="max-w-xl text-center md:text-left space-y-6 animate-in fade-in slide-in-from-left duration-700">
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none uppercase">
                  {t('repair.title').split(' ')[0]} <br /> 
                  <span className="text-[#16BBF8]">{t('repair.title').split(' ').slice(1).join(' ')}</span>
                </h1>
                <p className="text-slate-400 text-lg font-medium">{t('repair.sub')}</p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[#18D2A5]" /> {t('repair.guarantee')}
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 flex items-center gap-2">
                        <Clock size={14} className="text-[#16BBF8]" /> {t('repair.express')}
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl text-slate-900 w-full max-w-md animate-in fade-in slide-in-from-right duration-700">
                <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                    <MessageSquare className="text-[#16BBF8]" /> {t('repair.formTitle')}
                </h3>
                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                    <input type="text" placeholder={t('repair.name')} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all" />
                    <input type="tel" placeholder={t('repair.phone')} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all" />
                    <textarea placeholder={t('repair.desc')} rows={4} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl px-5 py-4 text-sm font-bold outline-none resize-none transition-all"></textarea>
                    <button className="w-full bg-[#16BBF8] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-[#14a3da] active:scale-95 transition-all shadow-sky-500/20">{t('repair.submit')} <ArrowRight size={18} className="inline ml-2" /></button>
                </form>
            </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t('repair.advantages')}</h2>
                
                <div className="space-y-8">
                {[
                    { title: t('repair.adv1Title'), desc: t('repair.adv1Desc') },
                    { title: t('repair.adv2Title'), desc: t('repair.adv2Desc') },
                    { title: t('repair.adv3Title'), desc: t('repair.adv3Desc') },
                ].map((item, i) => (
                    <div key={i} className="flex gap-6 items-start group">
                        <div className="w-14 h-14 bg-sky-50 text-[#16BBF8] rounded-2xl flex items-center justify-center shrink-0 font-black group-hover:bg-[#16BBF8] group-hover:text-white transition-colors border border-sky-100">0{i+1}</div>
                        <div>
                            <h4 className="font-black text-slate-900 text-lg group-hover:text-[#16BBF8] transition-colors">{item.title}</h4>
                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
                </div>
            </div>
            
            <div className="bg-slate-50 aspect-square rounded-[3.5rem] relative overflow-hidden flex items-center justify-center border border-slate-100 shadow-inner">
                 <Wrench size={300} className="text-slate-200" />
                 <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 to-transparent"></div>
                 <div className="absolute bottom-10 left-10 right-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('repair.contactLabel')}</div>
                        <div className="text-xl font-black text-slate-900">+49 (0) 123 456 789</div>
                    </div>
                    <div className="bg-[#16BBF8] p-4 rounded-2xl text-white shadow-lg shadow-sky-500/30">
                        <Phone size={24} />
                    </div>
                 </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default PublicRepair;
