
import React from 'react';
import { Mail, MapPin, Landmark, ShieldCheck, ExternalLink, Scale } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const Impressum: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-6">
        <header className="mb-16 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
            <Scale size={14} className="text-[#16BBF8]" /> Legal Notice
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">Impressum</h1>
          <div className="h-1.5 w-20 bg-[#16BBF8] mt-6 rounded-full"></div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Main Info */}
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#16BBF8]">Angaben gemäß § 5 TMG</h2>
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-xl font-black text-slate-900 mb-2">Sitrem GmbH</p>
                <p className="text-slate-600 font-bold">Taras Popadynets</p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 text-sm text-slate-500">
                    <MapPin size={18} className="text-slate-300 mt-0.5" />
                    <span>Strausberger Str. 9<br />15378 Herzfelde<br />Deutschland</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Mail size={18} className="text-slate-300" />
                    <a href="mailto:info@sitrem.de" className="font-bold text-slate-900 hover:text-[#16BBF8] transition-colors">info@sitrem.de</a>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#16BBF8]">Register & Steuern</h2>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Handelsregister</p>
                  <p className="text-sm font-bold text-slate-700">HRB 21224 FF</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registergericht</p>
                  <p className="text-sm font-bold text-slate-700">Amtsgericht Berlin Charlottenburg</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Umsatzsteuer-ID</p>
                  <p className="text-sm font-bold text-slate-700">DE335859648</p>
                </div>
              </div>
            </section>
          </div>

          {/* Insurance & Dispute */}
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#16BBF8]">Berufshaftpflichtversicherung</h2>
              <div className="bg-sky-50 border border-sky-100 p-8 rounded-[2.5rem] flex items-start gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm text-[#16BBF8] shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="font-black text-sky-900">VHV Allgemeine Versicherung AG</p>
                  <p className="text-sm text-sky-700 mt-1">VHV Platz 1<br />30177 Hannover</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#16BBF8]">Streitbeilegung</h2>
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] space-y-4">
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die Sie hier finden:
                </p>
                <a 
                  href="https://ec.europa.eu/consumers/odr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#16BBF8] font-black text-xs uppercase tracking-widest hover:text-white transition-colors"
                >
                  Plattform відкрити <ExternalLink size={14} />
                </a>
                <div className="pt-4 border-t border-white/10 text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir nicht verpflichtet und nicht bereit.
                </div>
              </div>
            </section>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-slate-50 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">© 2025 Sitrem GmbH Legal Team</p>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
