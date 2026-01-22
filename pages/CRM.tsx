
import React, { useState, useEffect, useMemo } from 'react';
import { User, CRMContact, CRMActivity, CRMStatus, ApiResponse } from '../types';
import { apiGetCRMContacts, apiUpdateCRMStatus, apiGetCRMActivities, apiAddCRMActivity, apiUpsertCRMContact } from '../services/crmService';
import { apiSendEmail } from '../services/mailService';
import { Users, Filter, Search, Plus, Mail, Phone, Building2, Calendar, Clock, MessageSquare, Tag, ChevronRight, UserPlus, Save, X, MoreVertical, CheckCircle2, History, Send, Globe, ShieldCheck, AlertCircle, RefreshCw, Briefcase, TrendingUp, PenTool } from 'lucide-react';

interface CRMProps {
    user: User;
}

const STATUS_CONFIG: Record<CRMStatus, { label: string, color: string, icon: any }> = {
    'new': { label: 'Новий лід', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: AlertCircle },
    'contacted': { label: 'Зв\'язалися', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: MessageSquare },
    'negotiating': { label: 'Переговори', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Briefcase },
    'waiting_device': { label: 'Чекаємо пристрій', color: 'bg-sky-50 text-sky-700 border-sky-100', icon: Clock },
    'inspecting': { label: 'Перевірка', color: 'bg-violet-50 text-violet-700 border-violet-100', icon: ShieldCheck },
    'won': { label: 'Успішно', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
    'lost': { label: 'Втрачено', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: X }
};

const CRM: React.FC<CRMProps> = ({ user }) => {
    const [contacts, setContacts] = useState<CRMContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
    const [activities, setActivities] = useState<CRMActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
    
    // Drawer Interaction State
    const [drawerTab, setDrawerTab] = useState<'notes' | 'email'>('notes');
    
    // Note state
    const [newNote, setNewNote] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // Email state
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        const res = await apiGetCRMContacts();
        if (res.success && res.data) setContacts(res.data);
        setLoading(false);
    };

    const fetchActivities = async (contactId: string) => {
        setLoadingActivities(true);
        const res = await apiGetCRMActivities(contactId);
        if (res.success && res.data) setActivities(res.data);
        setLoadingActivities(false);
    };

    const handleSelectContact = (contact: CRMContact) => {
        setSelectedContact(contact);
        setDrawerTab('notes'); // Reset tab
        setEmailSubject(`Sitrem: Питання щодо ${contact.company_name || 'вашого запиту'}`);
        fetchActivities(contact.id);
    };

    const handleUpdateStatus = async (contactId: string, status: CRMStatus) => {
        const res = await apiUpdateCRMStatus(contactId, status, user.id);
        if (res.success) {
            setContacts(prev => prev.map(c => c.id === contactId ? { ...c, status, last_activity: new Date().toISOString() } : c));
            if (selectedContact?.id === contactId) {
                setSelectedContact(prev => prev ? { ...prev, status } : null);
                fetchActivities(contactId);
            }
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContact || !newNote.trim()) return;

        setIsSubmittingNote(true);
        const res = await apiAddCRMActivity({
            contact_id: selectedContact.id,
            user_id: user.id,
            type: 'note',
            content: newNote
        });
        setIsSubmittingNote(false);

        if (res.success && res.data) {
            setActivities([res.data, ...activities]);
            setNewNote('');
        }
    };

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContact || !emailSubject.trim() || !emailBody.trim()) return;

        setIsSendingEmail(true);
        
        // 1. Send Email via Edge Function
        const mailRes = await apiSendEmail(selectedContact.email, emailSubject, emailBody.replace(/\n/g, '<br>'));
        
        if (mailRes.success) {
            // 2. Log Activity
            const logRes = await apiAddCRMActivity({
                contact_id: selectedContact.id,
                user_id: user.id,
                type: 'email',
                content: `Email Sent: ${emailSubject}`
            });
            
            if (logRes.success && logRes.data) {
                setActivities([logRes.data, ...activities]);
            }
            
            alert(`Лист успішно відправлено на ${selectedContact.email}`);
            setEmailBody('');
            setDrawerTab('notes'); // Switch back to history
        } else {
            alert("Помилка відправки: " + mailRes.error + "\nПеревірте налаштування Supabase Edge Function.");
        }
        
        setIsSendingEmail(false);
    };

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, searchTerm]);

    const pipelineData = useMemo(() => {
        const columns: Record<CRMStatus, CRMContact[]> = {
            'new': [], 'contacted': [], 'negotiating': [], 'waiting_device': [], 'inspecting': [], 'won': [], 'lost': []
        };
        filteredContacts.forEach(c => columns[c.status].push(c));
        return columns;
    }, [filteredContacts]);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <TrendingUp className="text-indigo-600" size={32} /> 
                        Sitrem CRM
                    </h1>
                    <p className="text-gray-500 font-medium tracking-tight">Керування лідами та клієнтами</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="bg-gray-100 p-1 rounded-xl flex">
                        <button onClick={() => setViewMode('pipeline')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'pipeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Воронка</button>
                        <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Список</button>
                    </div>
                    <div className="relative flex-1 md:flex-none">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Пошук клієнта..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold w-full md:w-64 shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"/>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-250px)]">
                {/* PIPELINE VIEW */}
                <div className={`lg:col-span-12 flex gap-4 overflow-x-auto pb-4 no-scrollbar ${selectedContact && 'hidden lg:flex'}`}>
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                        const colContacts = pipelineData[status as CRMStatus];
                        return (
                            <div key={status} className="flex-shrink-0 w-80 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className={`flex items-center gap-2 font-black uppercase text-[11px] tracking-widest ${config.color.split(' ')[1]}`}>
                                        <config.icon size={16} /> {config.label}
                                    </div>
                                    <span className="bg-white px-2.5 py-1 rounded-lg text-[10px] font-black text-gray-400 border border-gray-100 shadow-sm">{colContacts.length}</span>
                                </div>
                                
                                <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-3 space-y-3 overflow-y-auto no-scrollbar shadow-inner">
                                    {colContacts.map(contact => (
                                        <div 
                                            key={contact.id} 
                                            onClick={() => handleSelectContact(contact)}
                                            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${contact.source.includes('business') ? 'bg-emerald-500' : 'bg-indigo-400'}`}></div>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{contact.source.replace('_', ' ')}</span>
                                                </div>
                                                <button className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100"><MoreVertical size={14}/></button>
                                            </div>
                                            <h4 className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{contact.name}</h4>
                                            {contact.company_name && <p className="text-[10px] font-bold text-gray-500 mt-0.5">{contact.company_name}</p>}
                                            
                                            <div className="mt-4 flex items-center justify-between text-[9px] font-bold text-gray-400">
                                                <div className="flex items-center gap-1"><Clock size={10}/> {new Date(contact.last_activity || contact.created_at).toLocaleDateString()}</div>
                                                {contact.privacy_accepted && <ShieldCheck size={12} className="text-green-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CONTACT DETAIL MODAL / DRAWER */}
            {selectedContact && (
                <div className="fixed inset-0 z-[110] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        {/* Drawer Header */}
                        <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-slate-50/50">
                            <div className="space-y-4 w-full">
                                <button onClick={() => setSelectedContact(null)} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 text-xs font-black uppercase tracking-widest mb-4">
                                    <X size={16} /> Закрити
                                </button>
                                
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-white rounded-3xl border border-gray-100 flex items-center justify-center text-indigo-600 shadow-sm text-2xl font-black">
                                            {selectedContact.name[0]}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedContact.name}</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_CONFIG[selectedContact.status].color}`}>
                                                    {STATUS_CONFIG[selectedContact.status].label}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Globe size={12}/> {selectedContact.source}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedContact.email && (
                                            <a href={`mailto:${selectedContact.email}`} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all"><Mail size={20}/></a>
                                        )}
                                        {selectedContact.phone && (
                                            <a href={`tel:${selectedContact.phone}`} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 shadow-sm transition-all"><Phone size={20}/></a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* Stats/Info Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Компанія</div>
                                    <div className="font-bold text-gray-900 flex items-center gap-2"><Building2 size={14} className="text-gray-400"/> {selectedContact.company_name || 'Приватна особа'}</div>
                                </div>
                                <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">DSGVO Статус</div>
                                    <div className="font-bold text-green-600 flex items-center gap-2"><ShieldCheck size={14}/> Акцептовано</div>
                                </div>
                            </div>

                            {/* Status Change Bar */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Змінити етап воронки</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(STATUS_CONFIG) as CRMStatus[]).map(status => (
                                        <button 
                                            key={status}
                                            onClick={() => handleUpdateStatus(selectedContact.id, status)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                selectedContact.status === status 
                                                ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-200' 
                                                : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'
                                            }`}
                                        >
                                            {STATUS_CONFIG[status].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Log / Tabs */}
                            <div className="space-y-6">
                                <div className="flex bg-gray-100 p-1 rounded-2xl">
                                    <button 
                                        onClick={() => setDrawerTab('notes')}
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${drawerTab === 'notes' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Активність & Нотатки
                                    </button>
                                    <button 
                                        onClick={() => setDrawerTab('email')}
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${drawerTab === 'email' ? 'bg-white shadow text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Відправити Email
                                    </button>
                                </div>

                                {drawerTab === 'notes' ? (
                                    <>
                                        <form onSubmit={handleAddNote} className="relative">
                                            <textarea 
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Додати нотатку або коментар..."
                                                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] p-5 text-sm font-medium outline-none transition-all resize-none h-24"
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={!newNote.trim() || isSubmittingNote}
                                                className="absolute bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-50"
                                            >
                                                {isSubmittingNote ? <RefreshCw className="animate-spin" size={18}/> : <Send size={18}/>}
                                            </button>
                                        </form>

                                        <div className="space-y-4">
                                            {loadingActivities ? (
                                                <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-gray-300"/></div>
                                            ) : activities.length === 0 ? (
                                                <div className="text-center py-10 text-gray-300 italic text-sm">Жодної активності ще не зафіксовано</div>
                                            ) : (
                                                activities.map(act => (
                                                    <div key={act.id} className="p-5 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-4 animate-in slide-in-from-top-2">
                                                        <div className="mt-1">
                                                            {act.type === 'status_change' ? <Tag size={16} className="text-indigo-500"/> : 
                                                             act.type === 'email' ? <Mail size={16} className="text-rose-500"/> :
                                                             <MessageSquare size={16} className="text-slate-400"/>}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className={`text-sm ${act.type === 'status_change' ? 'font-black uppercase text-[10px] tracking-widest text-indigo-600' : 'font-medium text-slate-700'}`}>{act.content}</p>
                                                            <div className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                                                                {new Date(act.created_at).toLocaleString('uk-UA')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <form onSubmit={handleSendEmail} className="space-y-4 animate-in slide-in-from-right-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Отримувач</label>
                                            <div className="bg-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-700">{selectedContact.email}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Тема</label>
                                            <input 
                                                type="text" 
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-2xl px-5 py-3 text-sm font-bold outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Повідомлення</label>
                                            <textarea 
                                                value={emailBody}
                                                onChange={(e) => setEmailBody(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-[2rem] p-5 text-sm font-medium outline-none resize-none h-48"
                                                placeholder="Текст листа..."
                                            />
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={isSendingEmail || !emailBody || !emailSubject}
                                            className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSendingEmail ? <RefreshCw className="animate-spin" size={16}/> : <Send size={16}/>}
                                            Відправити лист
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRM;
