
import React from 'react';
import { ShoppingBag, Wrench, Laptop, User, Menu, X, ShieldCheck, Globe, Scale } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { Language } from '../../services/translations';

interface PublicLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children, currentPage, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { lang, setLang, t } = useTranslation();

  const navItems = [
    { id: 'home', label: t('nav.home'), icon: Laptop },
    { id: 'shop', label: t('nav.shop'), icon: ShoppingBag },
    { id: 'ankauf', label: t('nav.ankauf'), icon: ShieldCheck },
    { id: 'repair-public', label: t('nav.repair'), icon: Wrench },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'de', label: 'DE' },
    { code: 'en', label: 'EN' },
    { code: 'ua', label: 'UA' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center cursor-pointer group" onClick={() => onNavigate('home')}>
              <img 
                src="https://sitrem.de/wp-content/uploads/2023/02/cropped-sitrem_color_logo-3-1536x367.png" 
                alt="Sitrem" 
                className="h-9 w-auto transition-transform group-hover:scale-105"
              />
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`text-sm font-black uppercase tracking-widest transition-all relative py-2 ${
                    currentPage === item.id ? 'text-[#16BBF8]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {currentPage === item.id && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#16BBF8] rounded-full" />
                  )}
                </button>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                      lang === l.code ? 'bg-white text-[#16BBF8] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => onNavigate('login')}
                className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#16BBF8] transition-all active:scale-95 shadow-lg shadow-slate-900/10"
              >
                <User size={14} /> {t('nav.staff')}
              </button>
              
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 animate-in slide-in-from-top duration-300">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setIsMenuOpen(false); }}
                className="block w-full text-left px-4 py-4 text-sm font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="flex gap-4 px-4 py-4 border-t border-slate-50">
                {languages.map((l) => (
                  <button key={l.code} onClick={() => {setLang(l.code); setIsMenuOpen(false);}} className={`text-xs font-black px-4 py-2 rounded-xl border ${lang === l.code ? 'text-[#16BBF8] border-[#16BBF8] bg-sky-50' : 'text-slate-400 border-slate-100'}`}>{l.label}</button>
                ))}
            </div>
            <button 
              onClick={() => onNavigate('login')}
              className="w-full text-left px-4 py-4 text-sm font-black uppercase tracking-widest text-[#16BBF8] bg-sky-50 rounded-2xl"
            >
              {t('nav.staff')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-8">
            <img 
              src="https://sitrem.de/wp-content/uploads/2023/02/cropped-sitrem_color_logo-3-1536x367.png" 
              alt="Sitrem" 
              className="h-8 brightness-0 invert"
            />
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              {t('footer.about')}
            </p>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] text-[#16BBF8] mb-8">{t('footer.services')}</h4>
            <ul className="space-y-4 text-sm text-slate-300 font-bold">
              <li><button onClick={() => onNavigate('ankauf')} className="hover:text-white transition-colors">{t('nav.ankauf')}</button></li>
              <li><button onClick={() => onNavigate('repair-public')} className="hover:text-white transition-colors">{t('nav.repair')}</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-white transition-colors">{t('nav.shop')}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] text-[#16BBF8] mb-8">{t('footer.contact')}</h4>
            <ul className="space-y-4 text-sm text-slate-300 font-mono">
              <li>info@sitrem.de</li>
              <li>+49 (0) 123 456 789</li>
              <li className="text-slate-500 italic">Headquarters: Berlin</li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] text-[#16BBF8] mb-8">{t('footer.legal')}</h4>
            <ul className="space-y-4 text-sm text-slate-300 font-bold">
              <li>
                <button 
                  onClick={() => onNavigate('impressum')} 
                  className="hover:text-[#16BBF8] transition-colors flex items-center gap-2"
                >
                  <Scale size={14} /> Impressum
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('login')}
                  className="w-full mt-4 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#16BBF8] hover:text-white hover:border-transparent transition-all"
                >
                  {t('footer.partnerLogin')}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 pt-8 border-t border-white/5 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
          © 2025 SITREM GMBH • SECURE IT REMARKETING
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
