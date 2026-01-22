
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ShieldCheck, CheckCircle2, Laptop, AlertCircle, RefreshCw, Send, DollarSign, Euro, ArrowRight, ShieldAlert, Cpu, Box, HardDrive, List, Printer, Smartphone, Package, Shield, Recycle, HelpCircle, ChevronDown, ChevronUp, Wrench, Camera, Trash2, Upload, FileText, Info, User, Scale, Sparkles, Building2, UserCircle, Phone, Award, Truck, MapPin } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { calculateBuybackOffer, apiGetModelsByBrand, apiGetSpecsForModel, apiSubmitBuybackRequest } from '../../services/buybackService';

const Ankauf: React.FC = () => {
    const { t, lang } = useTranslation();
    const [userType, setUserType] = useState<'private' | 'business' | null>(null);
    const [step, setStep] = useState(1);
    const formRef = useRef<HTMLDivElement>(null);
    
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    const [isManualMode, setIsManualMode] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        phone: '',
        brand: 'Apple',
        manualBrand: '',
        model: '',
        manualModel: '',
        quantity: '1',
        condition: 'good',
        dataDestruction: true,
        description: '',
        email: '',
        desiredPrice: '',
        photos: [] as string[]
    });

    const [calculating, setCalculating] = useState(false);
    const [offer, setOffer] = useState<{ price: number, matchedModel: string, matchedSpecs: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Scroll to top of the form when step or type changes
    useEffect(() => {
        if (formRef.current && (step > 1 || userType)) {
            const headerHeight = 100;
            const elementPosition = formRef.current.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }, [step, userType]);

    useEffect(() => {
        if (userType !== 'private' || formData.brand === 'Other') {
            setIsManualMode(true);
            setAvailableModels([]);
            return;
        }
        setIsManualMode(false);
        const loadModels = async () => {
            setIsLoadingModels(true);
            const res = await apiGetModelsByBrand(formData.brand);
            if (res.success && res.data) {
                setAvailableModels(res.data);
                if (res.data.length > 0 && !res.data.includes(formData.model)) {
                    setFormData(prev => ({ ...prev, model: '' }));
                }
            }
            setIsLoadingModels(false);
        };
        loadModels();
    }, [formData.brand, userType]);

    const handleNext = async () => {
        if (formData.model === 'Other' && step === 1) {
            setIsManualMode(true);
            setStep(2);
            return;
        }

        if (step === 2) {
            if (isManualMode) {
                setOffer(null);
                setStep(3);
            } else {
                setCalculating(true);
                // Simplified calculation (no specs)
                const res = await calculateBuybackOffer(formData.brand, formData.model, formData.condition, {
                    ram: 0,
                    disk: 0,
                    cpu: ''
                });
                setOffer(res);
                setCalculating(false);
                setStep(3);
            }
        } else {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (step === 1) {
            setUserType(null);
            return;
        }
        setStep(prev => prev - 1);
    }

    const switchToManual = () => {
        setFormData(prev => ({ ...prev, brand: 'Other', model: 'Other' }));
        setIsManualMode(true);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setFormData(prev => ({
                        ...prev,
                        photos: [...prev.photos, ev.target!.result as string].slice(0, 4)
                    }));
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== idx)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!privacyAccepted) return;
        
        setSubmitting(true);
        
        const finalDescription = userType === 'business' 
            ? `B2B Request from ${formData.companyName}. Qty: ${formData.quantity}. Desired Price: ${formData.desiredPrice} EUR. Notes: ${formData.description}. Tel: ${formData.phone}` 
            : `${formData.description} | Desired Price: ${formData.desiredPrice} EUR`;

        const res = await apiSubmitBuybackRequest({
            name: formData.name,
            email: formData.email,
            brand: userType === 'business' ? 'B2B' : (isManualMode ? formData.manualBrand : formData.brand),
            model: userType === 'business' ? `Bulk (Qty: ${formData.quantity})` : (isManualMode ? formData.manualModel : formData.model),
            specs: userType === 'business' ? `B2B: ${formData.companyName}` : (isManualMode ? 'Individual check' : (offer?.matchedSpecs || 'Standard')),
            condition: formData.condition,
            offered_price: offer?.price || 0,
            data_destruction: formData.dataDestruction,
            is_manual: isManualMode || userType === 'business',
            description: finalDescription,
            photos: formData.photos
        });
        
        setSubmitting(false);
        if (res.success) {
            setSuccess(true);
        } else {
            alert(t('ankauf.errorSubmit') + res.error);
        }
    };

    const isStep1Valid = isManualMode 
        ? (formData.manualBrand && formData.manualModel) 
        : (formData.brand && formData.model);

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4 md:px-0">
            <div className="max-w-6xl mx-auto space-y-24">
                
                {/* 1. CALCULATOR HERO SECTION */}
                <div className="max-w-3xl mx-auto" ref={formRef}>
                    {!success && (
                        <div className="text-center mb-16 space-y-4">
                            <div className="inline-flex items-center gap-2 bg-sky-100 text-[#16BBF8] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-sky-200">
                                <Euro size={14} /> Ankauf Matrix
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">{t('ankauf.title')}</h1>
                            {userType && (
                                <div className="flex justify-center gap-3 mt-10">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= i ? 'bg-[#16BBF8]' : 'bg-slate-200'}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-8 md:p-16 relative overflow-hidden">
                        {success ? (
                            <div className="text-center py-12 animate-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-emerald-50 text-[#18D2A5] rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-lg shadow-emerald-500/10">
                                    <CheckCircle2 size={48} />
                                </div>
                                <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase">{t('ankauf.successTitle')}</h2>
                                <p className="text-slate-500 font-medium text-lg mb-12">{t('ankauf.successSub')}</p>
                                <button onClick={() => window.location.reload()} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em]">OK</button>
                            </div>
                        ) : !userType ? (
                            <div className="space-y-12 animate-in fade-in duration-500">
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('ankauf.userTypeTitle')}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button 
                                        onClick={() => setUserType('private')}
                                        className="group p-8 rounded-[2.5rem] border-2 border-slate-100 bg-slate-50 hover:border-[#16BBF8] hover:bg-white transition-all text-left space-y-6"
                                    >
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#16BBF8] group-hover:scale-110 transition-all shadow-sm border border-slate-100 group-hover:border-sky-100">
                                            <UserCircle size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 uppercase">{t('ankauf.privateType')}</h4>
                                            <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{t('ankauf.privateDesc')}</p>
                                        </div>
                                        <div className="pt-4 flex items-center gap-2 text-[#16BBF8] font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            Weiter <ArrowRight size={14} />
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => setUserType('business')}
                                        className="group p-8 rounded-[2.5rem] border-2 border-slate-100 bg-slate-50 hover:border-[#18D2A5] hover:bg-white transition-all text-left space-y-6"
                                    >
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#18D2A5] group-hover:scale-110 transition-all shadow-sm border border-slate-100 group-hover:border-emerald-100">
                                            <Building2 size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 uppercase">{t('ankauf.businessType')}</h4>
                                            <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{t('ankauf.businessDesc')}</p>
                                        </div>
                                        <div className="pt-4 flex items-center gap-2 text-[#18D2A5] font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            Anfragen <ArrowRight size={14} />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ) : userType === 'business' ? (
                            <form onSubmit={handleSubmit} className="space-y-10 animate-in slide-in-from-bottom-4">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-6">
                                        <div className="p-3 bg-emerald-50 text-[#18D2A5] rounded-2xl"><Building2 size={24}/></div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('ankauf.b2bFormTitle')}</h3>
                                            <p className="text-sm text-slate-400 font-medium">{t('ankauf.b2bFormSub')}</p>
                                        </div>
                                    </div>

                                    {/* KillDisk Industrial Highlight */}
                                    <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <ShieldCheck size={80} />
                                        </div>
                                        <div className="relative z-10 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-[#18D2A5] text-white p-2 rounded-xl">
                                                    <Award size={20} />
                                                </div>
                                                <h4 className="font-black uppercase tracking-widest text-xs">{t('ankauf.killDiskTitle')}</h4>
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                                {t('ankauf.killDiskDesc').split('**').map((part, i) => i % 2 === 1 ? <span key={i} className="text-[#18D2A5] font-black">{part}</span> : part)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Logistics Options Block */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">{t('ankauf.logisticsTitle')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><Package size={20}/></div>
                                                <div>
                                                    <div className="text-xs font-black uppercase text-slate-900">{t('ankauf.logisticsShipping')}</div>
                                                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed mt-1">{t('ankauf.logisticsShippingDesc')}</p>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#16BBF8] shadow-sm"><MapPin size={20}/></div>
                                                <div>
                                                    <div className="text-xs font-black uppercase text-slate-900">{t('ankauf.logisticsInPerson')}</div>
                                                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed mt-1">{t('ankauf.logisticsInPersonDesc')}</p>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#18D2A5] shadow-sm"><Truck size={20}/></div>
                                                <div>
                                                    <div className="text-xs font-black uppercase text-slate-900">{t('ankauf.logisticsPickup')}</div>
                                                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed mt-1">{t('ankauf.logisticsPickupDesc')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.companyName')}</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input type="text" required value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#18D2A5] rounded-2xl pl-14 pr-6 py-5 font-black text-slate-900 outline-none" placeholder="Sitrem GmbH" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.nameLabel')}</label>
                                            <div className="relative">
                                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#18D2A5] rounded-2xl pl-14 pr-6 py-5 font-black text-slate-900 outline-none" placeholder="Max Mustermann" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.emailLabel')}</label>
                                            <div className="relative">
                                                <Send className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#18D2A5] rounded-2xl pl-14 pr-6 py-5 font-black text-slate-900 outline-none" placeholder="mail@firma.de" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.phone')}</label>
                                            <div className="relative">
                                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#18D2A5] rounded-2xl pl-14 pr-6 py-5 font-black text-slate-900 outline-none" placeholder="+49..." />
                                            </div>
                                        </div>
                                    </div>

                                    {/* B2B Specific Price & Quantity */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.desiredPriceB2B')}</label>
                                            <div className="relative">
                                                <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input 
                                                    type="number" 
                                                    value={formData.desiredPrice} 
                                                    onChange={(e) => setFormData({...formData, desiredPrice: e.target.value})} 
                                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-[#18D2A5] rounded-2xl pl-14 pr-6 py-5 font-black text-slate-900 outline-none" 
                                                    placeholder="0.00" 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.quantity')}</label>
                                            <select value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#18D2A5] rounded-2xl px-6 py-5 font-black text-slate-900 outline-none">
                                                <option>1-5</option>
                                                <option>5-20</option>
                                                <option>20-50</option>
                                                <option>50+</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.descriptionLabel')}</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#18D2A5] rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none h-[100px] resize-none" placeholder="z.B. mix aus Lenovo T14 und Dell Latitude..." />
                                    </div>
                                    
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <label className="flex items-start gap-4 cursor-pointer group">
                                            <div className="relative flex items-center mt-1">
                                                <input 
                                                    type="checkbox" 
                                                    checked={privacyAccepted}
                                                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                                    className="w-6 h-6 rounded-lg border-2 border-slate-300 text-[#18D2A5] focus:ring-[#18D2A5] transition-all cursor-pointer appearance-none checked:bg-[#18D2A5] checked:border-transparent"
                                                />
                                                {privacyAccepted && <CheckCircle2 className="absolute text-white left-0.5 top-0.5" size={20} />}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                                                {t('ankauf.privacyLabel')}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setUserType(null)} className="flex-1 py-6 text-slate-400 font-black uppercase text-[10px] tracking-widest">{t('ankauf.back')}</button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting || !privacyAccepted} 
                                        className={`flex-[3] py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all ${
                                            privacyAccepted 
                                            ? 'bg-[#18D2A5] text-white shadow-emerald-500/20 active:scale-95' 
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        }`}
                                    >
                                        {submitting ? <RefreshCw className="animate-spin" size={18} /> : t('ankauf.confirm')}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-12">
                                {step === 1 && (
                                    <div className="space-y-10 animate-in slide-in-from-right-4">
                                        <div className="space-y-6">
                                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                                <Laptop className="text-[#16BBF8]" /> {t('ankauf.step1')}
                                            </h3>
                                            
                                            <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-4">
                                                <Info className="text-indigo-600 shrink-0" size={20} />
                                                <p className="text-xs font-bold text-indigo-900 leading-relaxed">{t('ankauf.manualNotice')}</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('ankauf.brand')}</label>
                                                    <select 
                                                        value={formData.brand} 
                                                        onChange={(e) => setFormData({...formData, brand: e.target.value})} 
                                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] focus:bg-white rounded-2xl px-6 py-5 font-black text-slate-900 outline-none shadow-inner"
                                                    >
                                                        <option>Apple</option><option>Dell</option><option>Lenovo</option><option>HP</option><option>Asus</option>
                                                        <option value="Other">{t('ankauf.other')}</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('ankauf.model')}</label>
                                                    <div className="relative">
                                                        <select 
                                                            disabled={isLoadingModels || formData.brand === 'Other'}
                                                            value={formData.model} 
                                                            onChange={(e) => setFormData({...formData, model: e.target.value})} 
                                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] focus:bg-white rounded-2xl px-6 py-5 font-black text-slate-900 outline-none shadow-inner appearance-none disabled:opacity-50"
                                                        >
                                                            <option value="">{isLoadingModels ? t('ankauf.loading') : t('ankauf.selectModel')}</option>
                                                            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                                            <option value="Other">{t('ankauf.other')}</option>
                                                        </select>
                                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><List size={18} /></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {isManualMode ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('ankauf.manualBrand')}</label>
                                                        <input type="text" value={formData.manualBrand} onChange={(e) => setFormData({...formData, manualBrand: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl px-6 py-5 font-black text-slate-900 outline-none shadow-inner" placeholder="z.B. Acer, MSI..."/>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('ankauf.manualModel')}</label>
                                                        <input type="text" value={formData.manualModel} onChange={(e) => setFormData({...formData, manualModel: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl px-6 py-5 font-black text-slate-900 outline-none shadow-inner" placeholder="z.B. Nitro 5..."/>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-4 border-t border-slate-50">
                                                    <div className="bg-slate-50 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                                                                <HelpCircle size={24} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('ankauf.noModelFound')}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'ua' ? 'Ми купимо ваш ноутбук навіть якщо його немає у базі' : 'Wir kaufen Ihr Gerät auch wenn es nicht gelistet ist'}</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={switchToManual}
                                                            className="w-full md:w-auto px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-[#16BBF8] hover:text-[#16BBF8] transition-all flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <Sparkles size={14} className="text-amber-500" /> {t('ankauf.individualOffer')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4">
                                            <button type="button" onClick={handleBack} className="flex-1 py-6 text-slate-400 font-black uppercase text-[10px] tracking-widest">{t('ankauf.back')}</button>
                                            <button type="button" onClick={handleNext} disabled={!isStep1Valid || isLoadingModels} className="flex-[3] bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all">{t('ankauf.next')} <ChevronRight size={20} /></button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-10 animate-in slide-in-from-right-4">
                                        <div className="space-y-8">
                                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><ShieldCheck className="text-[#16BBF8]" /> {t('ankauf.step2')}</h3>
                                            
                                            {isManualMode && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.descriptionLabel')}</label>
                                                    <textarea 
                                                        value={formData.description} 
                                                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none h-32 resize-none" 
                                                        placeholder={t('ankauf.descriptionLabel')}
                                                    />
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { id: 'perfect', label: t('ankauf.conditionLabels.perfect'), sub: t('ankauf.conditionLabels.perfectSub'), color: 'text-green-500' },
                                                    { id: 'good', label: t('ankauf.conditionLabels.good'), sub: t('ankauf.conditionLabels.goodSub'), color: 'text-blue-500' },
                                                    { id: 'defective', label: t('ankauf.conditionLabels.defective'), sub: t('ankauf.conditionLabels.defectiveSub'), color: 'text-amber-500' },
                                                    { id: 'broken', label: t('ankauf.conditionLabels.broken'), sub: t('ankauf.conditionLabels.brokenSub'), color: 'text-rose-500' },
                                                ].map(opt => (
                                                    <button key={opt.id} type="button" onClick={() => setFormData({...formData, condition: opt.id})} className={`w-full text-left p-6 rounded-3xl border-2 transition-all flex justify-between items-center ${formData.condition === opt.id ? 'border-[#16BBF8] bg-sky-50 shadow-lg' : 'border-slate-50 bg-slate-50'}`}>
                                                        <div>
                                                            <div className={`font-black uppercase tracking-tight text-md ${opt.color}`}>{opt.label}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">{opt.sub}</div>
                                                        </div>
                                                        {formData.condition === opt.id && <CheckCircle2 className="text-[#16BBF8]" size={20} />}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Data Destruction Focus */}
                                            <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-[#16BBF8]/20 p-3 rounded-2xl text-[#16BBF8]">
                                                        <ShieldCheck size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black uppercase tracking-tight">{t('ankauf.dataWipe')}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('ankauf.dataWipeSub')}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => setFormData({...formData, dataDestruction: !formData.dataDestruction})}
                                                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.dataDestruction ? t('ankauf.activated') : t('ankauf.deactivated')}`}
                                                >
                                                    {formData.dataDestruction ? t('ankauf.activated') : t('ankauf.deactivated')}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button type="button" onClick={handleBack} className="flex-1 py-6 text-slate-400 font-black uppercase text-[10px] tracking-widest">{t('ankauf.back')}</button>
                                            <button type="button" onClick={handleNext} disabled={calculating} className="flex-[3] bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2">{calculating ? <RefreshCw className="animate-spin" size={18} /> : t('ankauf.next')}</button>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-10 animate-in slide-in-from-right-4">
                                        <div className="space-y-6">
                                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Camera className="text-[#16BBF8]" /> {t('ankauf.step3')}</h3>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{t('ankauf.step3Desc')}</p>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {formData.photos.map((p, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden group border-2 border-slate-100 shadow-sm">
                                                        <img src={p} className="w-full h-full object-cover" alt={`device-${idx}`} />
                                                        <button type="button" onClick={() => removePhoto(idx)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                                    </div>
                                                ))}
                                                {formData.photos.length < 4 && (
                                                    <label className="aspect-square rounded-3xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 hover:text-[#16BBF8] hover:border-[#16BBF8]/30 hover:bg-sky-50 transition-all cursor-pointer">
                                                        <Upload size={32} />
                                                        <span className="text-[10px] font-black uppercase mt-2">{t('ankauf.addPhoto')}</span>
                                                        <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button type="button" onClick={handleBack} className="flex-1 py-6 text-slate-400 font-black uppercase text-[10px] tracking-widest">{t('ankauf.back')}</button>
                                            <button type="button" onClick={() => setStep(4)} className="flex-[3] bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                                {formData.photos.length > 0 ? `${t('ankauf.continueWithPhotos')} (${formData.photos.length}/4)` : t('ankauf.continueWithoutPhotos')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-10 animate-in slide-in-from-right-4">
                                        <div className="space-y-8">
                                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#16BBF8] rounded-full blur-[120px] opacity-10"></div>
                                                <div className="relative z-10 text-center space-y-6">
                                                    <h3 className="text-[10px] font-black text-[#16BBF8] uppercase tracking-[0.3em]">{t('ankauf.priceOffer')}</h3>
                                                    {offer ? (
                                                        <>
                                                            <div className="text-7xl font-black tracking-tighter flex items-start justify-center gap-2"><span className="text-2xl mt-2 text-[#16BBF8]">€</span>{offer.price.toFixed(2)}</div>
                                                            <div className="space-y-1">
                                                                <p className="text-white font-black uppercase tracking-tight text-sm">{offer.matchedModel}</p>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="mx-auto w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-amber-400"><ShieldAlert size={32} /></div>
                                                            <div className="text-xl font-black">{t('ankauf.manualCheck')}</div>
                                                            <p className="text-slate-400 text-xs">{t('ankauf.manualCheckSub')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="p-8 bg-sky-50 rounded-[2.5rem] border border-sky-100 shadow-inner">
                                                    <label className="block text-[10px] font-black text-sky-600 uppercase tracking-widest px-1 mb-3">{t('ankauf.desiredPrice')}</label>
                                                    <div className="relative">
                                                        <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-sky-400" size={24} />
                                                        <input 
                                                            type="number" 
                                                            required 
                                                            value={formData.desiredPrice} 
                                                            onChange={(e) => setFormData({...formData, desiredPrice: e.target.value})} 
                                                            placeholder="0.00" 
                                                            className="w-full bg-white border-2 border-transparent focus:border-[#16BBF8] rounded-2xl pl-16 pr-6 py-6 text-2xl font-black text-slate-900 outline-none shadow-sm transition-all" 
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-sky-400 uppercase mt-3 px-1">{t('ankauf.desiredPriceSub')}</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.nameLabel')}</label>
                                                        <div className="relative">
                                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={t('ankauf.namePlaceholder')} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl pl-14 pr-6 py-5 font-black text-slate-900 outline-none shadow-inner" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('ankauf.emailLabel')}</label>
                                                        <div className="relative">
                                                            <Send className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                            <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder={t('ankauf.emailPlaceholder')} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#16BBF8] rounded-2xl pl-14 pr-6 py-5 font-black text-slate-900 outline-none shadow-inner" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                    <label className="flex items-start gap-4 cursor-pointer group">
                                                        <div className="relative flex items-center mt-1">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={privacyAccepted}
                                                                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                                                className="w-6 h-6 rounded-lg border-2 border-slate-300 text-[#16BBF8] focus:ring-[#16BBF8] transition-all cursor-pointer appearance-none checked:bg-[#16BBF8] checked:border-transparent"
                                                            />
                                                            {privacyAccepted && <CheckCircle2 className="absolute text-white left-0.5 top-0.5" size={20} />}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                                                            {t('ankauf.privacyLabel')}
                                                        </span>
                                                    </label>
                                                </div>

                                                <div className="p-6 bg-sky-50 rounded-3xl border border-sky-100 flex items-start gap-4"><CheckCircle2 className="text-[#16BBF8] shrink-0" size={20} /><p className="text-[11px] text-sky-800 font-bold leading-relaxed">{t('ankauf.guarantee')}</p></div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <button type="button" onClick={() => setStep(3)} className="flex-1 py-6 text-slate-400 font-black uppercase text-[10px] tracking-widest">{t('ankauf.back')}</button>
                                            <button 
                                                type="submit" 
                                                disabled={submitting || !formData.email || !formData.name || !privacyAccepted} 
                                                className={`flex-[3] py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all ${
                                                    privacyAccepted 
                                                    ? 'bg-[#16BBF8] text-white shadow-sky-500/20 active:scale-95' 
                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                }`}
                                            >
                                                {submitting ? <RefreshCw className="animate-spin" size={18} /> : t('ankauf.confirm')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>

                {/* 2. NO PRINTER SECTION */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#16BBF8] rounded-full blur-[150px] opacity-10"></div>
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                                <Smartphone size={14} className="text-[#16BBF8]" /> {t('ankauf.noPrinter.sub')}
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{t('ankauf.noPrinter.title')}</h2>
                            <p className="text-slate-400 text-lg leading-relaxed">{t('ankauf.noPrinter.desc')}</p>
                            
                            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 flex items-center gap-6">
                                <div className="p-4 bg-[#16BBF8] rounded-2xl shadow-lg">
                                    <Smartphone size={32} />
                                </div>
                                <p className="text-sm font-bold text-slate-300">
                                    <span className="text-white block mb-1">{lang === 'de' ? 'Empfohlen: Variante B' : 'Recommended: Version B'}</span>
                                    {lang === 'de' ? 'Nur Ihr Smartphone und das verpackte Gerät. DPD druckt das Label für Sie.' : 'Only your smartphone and the packed device. DPD prints the label for you.'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="aspect-square bg-white/5 rounded-[2.5rem] border border-white/10 p-8 flex flex-col justify-center text-center gap-4 hover:bg-white/10 transition-all group">
                                <Printer size={40} className="mx-auto text-slate-500 group-hover:text-rose-500 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{lang === 'de' ? 'Kein Drucker nötig' : 'No printer needed'}</span>
                            </div>
                            <div className="aspect-square bg-white/5 rounded-[2.5rem] border border-white/10 p-8 flex flex-col justify-center text-center gap-4 hover:bg-white/10 transition-all group">
                                <Package size={40} className="mx-auto text-slate-500 group-hover:text-[#16BBF8] transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{lang === 'de' ? 'Einfach Abgeben' : 'Easy drop-off'}</span>
                            </div>
                            <div className="aspect-square bg-white/5 rounded-[2.5rem] border border-white/10 p-8 flex flex-col justify-center text-center gap-4 hover:bg-white/10 transition-all group">
                                <Shield size={40} className="mx-auto text-slate-500 group-hover:text-[#18D2A5] transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{lang === 'de' ? 'Sicherer Versand' : 'Secure shipping'}</span>
                            </div>
                            <div className="aspect-square bg-[#16BBF8] rounded-[2.5rem] p-8 flex flex-col justify-center text-center gap-4 shadow-xl shadow-sky-500/20 transform hover:scale-105 transition-all">
                                <Smartphone size={40} className="mx-auto text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">QR-Code Ready</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. PROCESS STEPS */}
                <section className="space-y-16">
                    <div className="text-center">
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{t('ankauf.process.title')}</h2>
                        <div className="h-1.5 w-24 bg-[#16BBF8] mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        {[
                            { id: 1, icon: List, title: t('ankauf.process.s1'), desc: t('ankauf.process.s1d') },
                            { id: 2, icon: Smartphone, title: t('ankauf.process.s2'), desc: t('ankauf.process.s2d') },
                            { id: 3, icon: Package, title: t('ankauf.process.s3'), desc: t('ankauf.process.s3d') },
                            { id: 4, icon: Wrench, title: t('ankauf.process.s4'), desc: t('ankauf.process.s4d') },
                            { id: 5, icon: Euro, title: t('ankauf.process.s5'), desc: t('ankauf.process.s5d') },
                        ].map((item, i) => (
                            <div key={item.id} className="relative group">
                                {i < 4 && <div className="hidden md:block absolute top-10 left-full w-full h-[2px] bg-slate-100 z-0" />}
                                <div className="relative z-10 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group-hover:shadow-xl group-hover:border-sky-100 transition-all h-full text-center">
                                    <div className="w-16 h-16 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#16BBF8] group-hover:text-white transition-all transform group-hover:-translate-y-1">
                                        <item.icon size={28} />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 mb-3 uppercase">{item.title}</h4>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. DATA & ECO SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-emerald-50 rounded-[3rem] p-12 border border-emerald-100 flex items-start gap-8">
                        <div className="w-16 h-16 bg-white text-[#18D2A5] rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Shield size={32}/></div>
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-emerald-900 uppercase">{t('ankauf.security.title')}</h3>
                            <p className="text-emerald-700 text-sm font-medium leading-relaxed">{t('ankauf.security.desc')}</p>
                        </div>
                    </div>
                    <div className="bg-sky-50 rounded-[3rem] p-12 border border-sky-100 flex items-start gap-8">
                        <div className="w-16 h-16 bg-white text-[#16BBF8] rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Recycle size={32}/></div>
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-sky-900 uppercase">{t('ankauf.broken.title')}</h3>
                            <p className="text-sky-700 text-sm font-medium leading-relaxed">{t('ankauf.broken.desc')}</p>
                        </div>
                    </div>
                </div>

                {/* 5. FAQ SECTION */}
                <section className="max-w-4xl mx-auto space-y-12">
                    <div className="text-center">
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{t('ankauf.faq.title')}</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(num => (
                            <div key={num} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                                <button 
                                    type="button"
                                    onClick={() => setActiveFaq(activeFaq === num ? null : num)}
                                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <span className="font-black text-slate-900 text-left uppercase text-sm tracking-tight">{t(`ankauf.faq.q${num}`)}</span>
                                    {activeFaq === num ? <ChevronUp className="text-[#16BBF8]" /> : <ChevronDown className="text-slate-300" />}
                                </button>
                                {activeFaq === num && (
                                    <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
                                        <p className="text-slate-500 font-medium text-sm leading-relaxed border-t border-slate-50 pt-6">
                                            {t(`ankauf.faq.a${num}`)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* FINAL CTA */}
                <div className="text-center pb-20">
                    <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase">{t('ankauf.submit')}</h2>
                    <button 
                        onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setUserType(null); setStep(1); }} 
                        className="px-12 py-6 bg-[#16BBF8] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-sky-500/30 hover:-translate-y-1 transition-all active:scale-95"
                    >
                        {t('home.ctaBtn')} <ArrowRight size={18} className="inline ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Ankauf;
