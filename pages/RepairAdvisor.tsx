
import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Search, RefreshCw, Package, MapPin, AlertCircle, CheckCircle2, Terminal, Filter, Database, Zap, Clock, Loader2, Upload, FileSpreadsheet, Copy, Check, ShoppingCart, Globe, Euro, ExternalLink, X, ChevronLeft, ChevronRight, Info, Image as ImageIcon, Wrench, Settings, Stethoscope, ClipboardCheck, Siren, UserCog, Truck } from 'lucide-react';
import { extractSearchAnchor, smartFilterParts, getProfessionalRepairAdvice } from '../services/geminiService';
import { searchInventoryLocal, uploadInventoryCSV, getLastSyncTime } from '../services/inventoryService';
import { apiCreateRepairJob, apiGetAdvisorAnalysis, apiSaveAdvisorAnalysis, apiUpdateIncomingStatus } from '../services/mockBackend';
import { RepairJob, AdvisorAnalysis } from '../types';
import TaskTimer from '../components/TaskTimer';

// ... (Existing Interfaces) ...
interface ExternalPart {
    partName: string;
    priceEur: number;
    source: string;
    link?: string;
}

interface GroupedResult {
    category: string;
    parts: any[];
    externalParts?: ExternalPart[];
    isRecommended?: boolean;
}

interface ExpertAdvice {
    diagnosis: string;
    steps: string[];
    warnings: string[];
}

interface RepairAdvisorProps {
    onNavigate: (page: string, params?: any) => void;
    prefilledQuery?: string;
    prefilledJob?: RepairJob;
    incomingId?: string;
}

const RepairAdvisor: React.FC<RepairAdvisorProps> = ({ onNavigate, prefilledQuery, prefilledJob, incomingId }) => {
    const [input, setInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [searchAnchor, setSearchAnchor] = useState('');
    const [detectedModel, setDetectedModel] = useState('');
    const [results, setResults] = useState<GroupedResult[]>([]);
    const [advice, setAdvice] = useState<ExpertAdvice | null>(null);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [noResults, setNoResults] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [existingAnalysis, setExistingAnalysis] = useState<AdvisorAnalysis | null>(null);
    
    // New State for Pricing
    const [totalCost, setTotalCost] = useState<{local: number, external: number}>({ local: 0, external: 0 });
    
    // Modals State
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [viewingImages, setViewingImages] = useState<string[] | null>(null);
    const [currentImgIdx, setCurrentImgIdx] = useState(0);
    const [viewingSpecs, setViewingSpecs] = useState<any | null>(null);

    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchLastSync();
        
        if (prefilledJob) {
            loadFromRepairJob(prefilledJob);
        } else if (incomingId) {
            // Prioritize loading existing analysis from DB
            loadExistingAnalysis(); 
        } else if (prefilledQuery) {
            // Only run new search if we have no ID to check against
            setInput(prefilledQuery);
            handleSearch(undefined, prefilledQuery);
        }
    }, [prefilledQuery, prefilledJob, incomingId]);

    const loadFromRepairJob = (job: RepairJob) => {
        setDetectedModel(job.model);
        setSearchAnchor(job.model); 
        setInput(job.model);
        
        getProfessionalRepairAdvice(job.model, "General repair").then(res => setAdvice(res));

        const groups: GroupedResult[] = [];
        const local = job.local_parts || [];
        const external = job.external_parts || [];

        if (local.length > 0) {
            groups.push({
                category: "Всі запчастини ремонту",
                parts: local,
                isRecommended: true
            });
        }

        if (external.length > 0) {
            groups.push({
                category: "Купити (Дефіцит)",
                parts: [],
                externalParts: external
            });
        }

        setResults(groups);
        calculateCosts(local, external);
    };

    const loadExistingAnalysis = async () => {
        if (!incomingId) return;
        
        setStatusMessage('Перевірка історії...');
        
        // Fix: Use a safer fetch method in mockBackend or handle error gracefully here
        // If duplicates exist, supabase 'maybeSingle' might error. We should handle that.
        const res = await apiGetAdvisorAnalysis(incomingId);
        
        if (res.success && res.data) {
            // FOUND IN DB - LOAD IT
            const data = res.data;
            setExistingAnalysis(data);
            
            // Set Input for UI context
            setInput(prefilledQuery || 'Loaded from History');
            setDetectedModel('Model from History'); // Simple placeholder or save model in DB

            // Restore Advice
            if (data.diagnosis) {
                setAdvice({
                    diagnosis: data.diagnosis,
                    steps: data.steps || [],
                    warnings: data.warnings || []
                });
            }

            // Restore Results Groups
            const groups: GroupedResult[] = [];
            
            if (data.recommended_parts && data.recommended_parts.length > 0) {
                groups.push({
                    category: "✅ Рекомендовано (Збережено)",
                    parts: data.recommended_parts,
                    isRecommended: true
                });
            }

            if (data.other_parts && data.other_parts.length > 0) {
                groups.push({
                    category: "📦 Інші сумісні (Збережено)",
                    parts: data.other_parts,
                    isRecommended: false
                });
            }

            if (data.missing_parts && data.missing_parts.length > 0) {
                groups.push({
                    category: "🛒 Купити (Збережено)",
                    parts: [],
                    externalParts: data.missing_parts
                });
            }

            setResults(groups);
            calculateCosts(data.recommended_parts || [], data.missing_parts || []);
            setStatusMessage(''); 

        } else {
            // NOT FOUND IN DB - ONLY THEN RUN FRESH SEARCH
            if (prefilledQuery) {
                setInput(prefilledQuery);
                handleSearch(undefined, prefilledQuery);
            }
        }
    };

    const calculateCosts = (localParts: any[], externalParts: any[]) => {
        let localC = 0; 
        const uniquePartIds = new Set<string>();
        localParts.forEach((p:any) => {
            if (!uniquePartIds.has(p.id.toString())) {
                uniquePartIds.add(p.id.toString());
                localC += Number(p.price) || 0;
            }
        });
        
        const extC = externalParts.reduce((acc: number, p: any) => acc + (Number(p.priceEur) || 0), 0);
        setTotalCost({ local: localC, external: extC });
    };

    const fetchLastSync = async () => {
        const time = await getLastSyncTime();
        setLastSync(time);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSyncing(true);
        setSyncProgress(0);
        setStatusMessage('Аналіз CSV файлу...');

        try {
            const res = await uploadInventoryCSV(file, (percent, msg) => {
                setSyncProgress(percent);
                setStatusMessage(msg);
            });

            if (res.success) {
                fetchLastSync();
                const { processed, skipped, errors, delimiterUsed } = res.data;
                
                let resultMsg = `Імпорт завершено!\n\n✅ Оновлено: ${processed}\n⚠️ Пропущено: ${skipped}\n📊 Роздільник: "${delimiterUsed}"`;
                if (errors && errors.length > 0) {
                    resultMsg += `\n❌ Помилок запису: ${errors.length}\n(Див. консоль)`;
                }
                
                alert(resultMsg);
                setStatusMessage(processed > 0 ? 'Успішно!' : 'Завершено з попередженнями');
                setTimeout(() => setStatusMessage(''), 5000);
            } else {
                if (res.error?.includes("SCHEMA_ERROR") || res.error?.includes("CONSTRAINT_ERROR") || res.error?.includes("PERMISSION_ERROR") || res.error?.includes("DATA_ERROR")) {
                    setShowSqlModal(true);
                    setStatusMessage('Помилка структури БД');
                    alert(res.error); 
                } else {
                    alert("Критична помилка імпорту:\n" + res.error);
                    setStatusMessage('Помилка');
                }
            }
        } catch (err: any) {
            alert("Системна помилка: " + err.message);
        } finally {
            setIsSyncing(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };

    const handleSearch = async (manualAnchor?: string, rawQuery?: string) => {
        const query = manualAnchor || rawQuery || input;
        if (!query.trim()) return;

        setIsAnalyzing(true);
        setResults([]);
        setAdvice(null);
        setNoResults(false);
        setTotalCost({ local: 0, external: 0 });
        setExistingAnalysis(null); 
        
        try {
            let anchor = manualAnchor;
            let model = detectedModel;

            if (!manualAnchor) {
                setStatusMessage('AI визначає модель...');
                const analysis = await extractSearchAnchor(query);
                anchor = analysis.anchor;
                model = analysis.model;
                setSearchAnchor(anchor);
                setDetectedModel(model);
            }

            getProfessionalRepairAdvice(model || anchor || "", query).then(res => setAdvice(res));

            setStatusMessage(`Миттєвий пошук у базі...`);
            const localItems = await searchInventoryLocal(anchor || "");
            
            setStatusMessage(localItems.length > 0 ? `AI аналізує запчастини...` : `Шукаємо деталі...`);
            
            const aiAnalysis = await smartFilterParts(query, model || anchor || "", localItems);
            
            const recommendedPartIds = new Set(aiAnalysis.recommendedIds || []);
            
            const recommendedParts = localItems.filter(item => recommendedPartIds.has(item.id.toString()));
            const otherParts = localItems.filter(item => !recommendedPartIds.has(item.id.toString()));

            const finalGroups: GroupedResult[] = [];

            if (recommendedParts.length > 0) {
                finalGroups.push({
                    category: "✅ Рекомендовано для ремонту",
                    parts: recommendedParts,
                    isRecommended: true
                });
            }

            if (otherParts.length > 0) {
                finalGroups.push({
                    category: "📦 Інші сумісні запчастини",
                    parts: otherParts,
                    isRecommended: false
                });
            }

            let externalSumEUR = 0;
            if (aiAnalysis.missingParts && aiAnalysis.missingParts.length > 0) {
                const missingItems: ExternalPart[] = aiAnalysis.missingParts.map(partName => ({
                    partName,
                    priceEur: 0,
                    source: 'Немає на складі',
                    link: ''
                }));

                finalGroups.push({
                    category: "🛒 Купити (Дефіцит)",
                    parts: [],
                    externalParts: missingItems
                });
            }

            setResults(finalGroups);
            
            // Calc Cost
            let localSumEUR = 0;
            const uniquePartIds = new Set<string>();
            recommendedParts.forEach(part => {
                if (!uniquePartIds.has(part.id.toString())) {
                    uniquePartIds.add(part.id.toString());
                    localSumEUR += Number(part.price) || 0;
                }
            });
            setTotalCost({ local: localSumEUR, external: externalSumEUR });

            if (finalGroups.length === 0) {
                if (localItems.length > 0) {
                     setResults([{
                        category: "📦 Всі знайдені запчастини",
                        parts: localItems.slice(0, 10)
                    }]);
                } else {
                    setNoResults(true);
                }
            }

        } catch (error: any) {
            console.error("Advisor failed:", error);
            setStatusMessage(`Помилка: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
            if (!isSyncing) setStatusMessage('');
        }
    };

    const handleDecision = async (action: 'repair' | 'teardown' | 'wholesale') => {
        if (!incomingId) {
            alert("Помилка: Немає прив'язки до пристрою (Incoming ID missing).");
            return;
        }

        setIsSaving(true);

        try {
            const recommendedGroup = results.find(g => g.isRecommended);
            const otherGroup = results.find(g => !g.isRecommended && !g.externalParts);
            const externalGroup = results.find(g => g.externalParts && g.externalParts.length > 0);

            const recommendedParts = recommendedGroup ? recommendedGroup.parts : [];
            const otherParts = otherGroup ? otherGroup.parts : [];
            const missingParts = externalGroup ? externalGroup.externalParts : [];

            // Save Analysis to DB
            await apiSaveAdvisorAnalysis({
                incoming_id: incomingId,
                diagnosis: advice?.diagnosis,
                steps: advice?.steps,
                warnings: advice?.warnings,
                recommended_parts: recommendedParts,
                other_parts: otherParts,
                missing_parts: missingParts,
                total_cost_eur: totalEstimatedEUR,
                chosen_action: action
            });

            // Update Incoming Laptop Status
            let newStatus = '';
            if (action === 'repair') newStatus = 'repair_queue'; 
            if (action === 'teardown') newStatus = 'teardown';
            if (action === 'wholesale') newStatus = 'wholesale';

            await apiUpdateIncomingStatus(incomingId, newStatus);

            // If Repair, also create RepairJob
            if (action === 'repair') {
                const repairData: Partial<RepairJob> = {
                    model: detectedModel || 'Unknown Model',
                    local_parts: recommendedParts,
                    external_parts: missingParts || [],
                    total_cost_eur: totalEstimatedEUR,
                    incoming_id: incomingId
                };
                await apiCreateRepairJob(repairData);
            }

            alert(`Статус оновлено: ${action.toUpperCase()}`);
            onNavigate('incoming');

        } catch (e: any) {
            alert(`Помилка збереження: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ... (Helper functions like handleCopySql, modal handlers remain same) ...
    // --- Modal Handlers ---
    const handleCopySql = () => {
        const sql = `
-- Fix Duplicates & Constraints
DELETE FROM public.advisor_analysis a USING (
      SELECT min(ctid) as ctid, incoming_id
        FROM public.advisor_analysis 
        GROUP BY incoming_id HAVING COUNT(*) > 1
      ) b
      WHERE a.incoming_id = b.incoming_id 
      AND a.ctid <> b.ctid;

ALTER TABLE public.advisor_analysis ADD CONSTRAINT advisor_analysis_incoming_id_key UNIQUE (incoming_id);
        `;
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openImageGallery = (images: string[]) => {
        if (!images || images.length === 0) return;
        setViewingImages(images);
        setCurrentImgIdx(0);
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewingImages) {
            setCurrentImgIdx((prev) => (prev + 1) % viewingImages.length);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewingImages) {
            setCurrentImgIdx((prev) => (prev - 1 + viewingImages.length) % viewingImages.length);
        }
    };

    const openSpecs = (part: any) => {
        setViewingSpecs(part);
    };

    const hasAnyStock = results.some(r => r.parts.some(m => m.stock > 0));
    const totalEstimatedEUR = totalCost.local + totalCost.external;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Lightbulb className="text-amber-500" size={32} /> 
                        Repair Advisor
                    </h1>
                    <p className="text-gray-500 font-medium tracking-tight">Розумний підбір • Локальна база Supabase</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block mr-2">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">База оновлена</div>
                        <div className="text-[11px] font-bold text-gray-600 flex items-center gap-1 justify-end">
                            <Clock size={12}/> {lastSync ? new Date(lastSync).toLocaleString('uk-UA') : 'Ніколи'}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setShowSqlModal(true)}
                        className="bg-white border border-gray-200 text-gray-500 p-3 rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                        title="Налаштування бази даних (SQL)"
                    >
                        <Database size={16} />
                    </button>

                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSyncing}
                        className="bg-gray-900 text-white border border-gray-900 px-4 py-3 rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 group relative flex items-center gap-2"
                        title="Завантажити CSV з BaseLinker"
                    >
                        {isSyncing ? (
                            <Loader2 size={16} className="animate-spin text-white" />
                        ) : (
                            <FileSpreadsheet size={16} className="text-white" />
                        )}
                        <span className="text-xs font-black uppercase tracking-widest">
                            {isSyncing ? `${syncProgress}%` : 'Імпорт CSV'}
                        </span>
                    </button>
                </div>
            </header>

            {/* TASK TIMER INTEGRATION */}
            {incomingId && (
                <div className="mb-4">
                    {/* We guess taskType based on where user usually comes from, or make it dynamic if needed. 
                        Since we are in Repair Advisor, usually 'diagnostics' or 'repair'.
                        We can try to fetch both or pass it in props. For now, default to 'diagnostics' as initial step.
                    */}
                    <TaskTimer 
                        laptopId={incomingId} 
                        taskType="diagnostics" // Or 'repair' - simplified for now
                        userId="current-user" // In real app, pass user ID
                    />
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-gray-100 p-8 space-y-6 relative overflow-hidden">
                {/* ... existing search UI ... */}
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Zap size={120} className="text-amber-500" />
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Опишіть проблему та модель ноутбука</label>
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Наприклад: Dell 5520 розбитий екран"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-medium text-gray-900 outline-none transition-all h-28 resize-none shadow-inner"
                    />
                </div>

                {statusMessage && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        {statusMessage}
                    </div>
                )}

                {existingAnalysis && (
                    <div className="flex items-center justify-between bg-green-50 text-green-800 px-5 py-3 rounded-2xl border border-green-100 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full shadow-sm"><CheckCircle2 size={16} className="text-green-500" /></div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest">Завантажено з історії</div>
                                {existingAnalysis.chosen_action && (
                                    <div className="text-[10px] font-bold opacity-70 mt-0.5 flex items-center gap-1">
                                        Попереднє рішення: 
                                        <span className={`px-2 py-0.5 rounded text-white text-[9px] uppercase ${existingAnalysis.chosen_action === 'wholesale' ? 'bg-purple-500' : 'bg-green-500'}`}>
                                            {existingAnalysis.chosen_action}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={() => { setExistingAnalysis(null); handleSearch(undefined, input); }} className="text-[9px] font-black uppercase underline hover:text-green-900 bg-white/50 px-3 py-1.5 rounded-lg">
                            Оновити аналіз
                        </button>
                    </div>
                )}

                {searchAnchor && (
                    <div className="flex flex-col md:flex-row items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-1">Якір пошуку</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={searchAnchor}
                                    onChange={(e) => setSearchAnchor(e.target.value)}
                                    className="bg-white border border-indigo-100 rounded-xl px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100 w-full"
                                />
                                <button 
                                    onClick={() => handleSearch(searchAnchor)}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all uppercase"
                                >
                                    Пошук
                                </button>
                            </div>
                        </div>
                        <div className="h-10 w-[1px] bg-indigo-100 hidden md:block"></div>
                        <div className="flex-1">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-1">Визначена модель</label>
                            <div className="text-sm font-black text-gray-700 px-1 truncate">{detectedModel || 'Невідомо'}</div>
                        </div>
                    </div>
                )}

                <button 
                    onClick={() => handleSearch()}
                    disabled={isAnalyzing || isSyncing || !input.trim()}
                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                    {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                    {isAnalyzing ? statusMessage || 'Аналіз...' : 'Знайти запчастини'}
                </button>
            </div>

            {(results.length > 0 || noResults || advice) && !isAnalyzing && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* COST SUMMARY CARD & ACTIONS */}
                    {(results.length > 0 || advice) && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-[2.5rem] p-8 text-white flex justify-between items-center shadow-xl">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Орієнтовна вартість ремонту</h3>
                                    <div className="flex flex-col gap-1 text-[10px] font-medium text-gray-400">
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Локально: {totalCost.local.toFixed(2)} €</span>
                                        {totalCost.external > 0 && (
                                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Докупка: {totalCost.external.toFixed(2)} €</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black tracking-tighter flex items-start gap-1 justify-end">
                                        <span className="text-lg mt-1">€</span>
                                        {totalEstimatedEUR.toFixed(2)}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        Total Estimate
                                    </div>
                                </div>
                            </div>

                            {/* DECISION BUTTONS */}
                            <div className="grid grid-cols-3 gap-4">
                                <button 
                                    onClick={() => handleDecision('repair')}
                                    disabled={isSaving}
                                    className={`py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex flex-col md:flex-row items-center justify-center gap-2 transition-all active:scale-95 border-2 shadow-sm ${existingAnalysis?.chosen_action === 'repair' ? 'bg-green-600 text-white border-green-600 shadow-green-200' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'}`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Wrench size={16} />}
                                    В РЕМОНТ
                                </button>
                                <button 
                                    onClick={() => handleDecision('teardown')}
                                    disabled={isSaving}
                                    className={`py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex flex-col md:flex-row items-center justify-center gap-2 transition-all active:scale-95 border-2 shadow-sm ${existingAnalysis?.chosen_action === 'teardown' ? 'bg-amber-600 text-white border-amber-600 shadow-amber-200' : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'}`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Settings size={16} />}
                                    НА РОЗБІРКУ
                                </button>
                                <button 
                                    onClick={() => handleDecision('wholesale')}
                                    disabled={isSaving}
                                    className={`py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex flex-col md:flex-row items-center justify-center gap-2 transition-all active:scale-95 border-2 shadow-sm ${existingAnalysis?.chosen_action === 'wholesale' ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200' : 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'}`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                                    НА ОПТ
                                </button>
                            </div>
                        </div>
                    )}

                    {/* EXPERT ADVICE CARD */}
                    {advice && (
                        <div className="bg-slate-800 text-slate-100 rounded-[2.5rem] p-8 shadow-xl border border-slate-700 relative overflow-hidden">
                            {/* ... same advice UI as before ... */}
                            <div className="absolute top-0 right-0 p-10 opacity-5">
                                <UserCog size={150} />
                            </div>
                            
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                                    <div className="bg-indigo-500 p-2 rounded-xl">
                                        <UserCog size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-white">Вердикт Майстра</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Досвід 20 років • {detectedModel}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest">
                                            <Stethoscope size={14} /> Діагноз
                                        </div>
                                        <p className="text-sm font-medium text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                                            {advice.diagnosis}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-green-400 font-black text-xs uppercase tracking-widest">
                                            <ClipboardCheck size={14} /> План Дій
                                        </div>
                                        <ul className="text-sm font-medium text-slate-300 space-y-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                                            {advice.steps.map((step, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="text-green-500 font-bold">{i+1}.</span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-widest">
                                            <Siren size={14} /> Увага (Нюанси)
                                        </div>
                                        <ul className="text-sm font-medium text-slate-300 space-y-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                                            {advice.warnings.map((warn, i) => (
                                                <li key={i} className="flex gap-2 text-rose-200">
                                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                    {warn}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RESULTS */}
                    {noResults ? (
                        <div className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-12 text-center space-y-4">
                             <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                <AlertCircle size={32} />
                             </div>
                             <div>
                                <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Нічого не знайдено в базі</h3>
                                <p className="text-sm text-amber-700 font-medium">Можливо, товар ще не завантажено через CSV або AI не знайшов нічого в інтернеті.</p>
                             </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {results.map((group, idx) => (
                                <div key={idx} className={`rounded-[2rem] border p-6 md:p-8 shadow-sm space-y-6 ${group.isRecommended ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
                                    <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b pb-4 ${group.isRecommended ? 'text-indigo-600 border-indigo-200' : 'text-gray-400 border-gray-50'}`}>
                                        <Filter size={16} /> {group.category}
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {/* RENDER EXTERNAL PARTS (Missing from DB) */}
                                        {group.externalParts?.map((ep, i) => (
                                            <div key={`ext-${i}`} className="p-5 bg-white rounded-2xl border border-dashed border-rose-200 flex items-center justify-between group">
                                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                                    <div className="w-16 h-16 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-300">
                                                        <ShoppingCart size={24} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-black text-gray-900 truncate">{ep.partName}</div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                            <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter"><Globe size={10}/> Market: DE</span>
                                                            <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter truncate max-w-[200px]">{ep.source}</span>
                                                        </div>
                                                        <div className="flex gap-2 mt-2">
                                                            {ep.link && ep.link.startsWith('http') && (
                                                                <a 
                                                                    href={ep.link} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest"
                                                                >
                                                                    <ExternalLink size={10} /> View Listing
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                                    <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-rose-100 text-rose-800">
                                                        TO BUY
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* RENDER LOCAL PARTS (In DB) */}
                                        {group.parts.map(p => (
                                            <div key={p.id} className="p-5 bg-white rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                                    <div 
                                                        className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => openImageGallery(p.images)}
                                                    >
                                                        {p.images && p.images[0] ? (
                                                            <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <ImageIcon size={20} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div 
                                                            onClick={() => openSpecs(p)}
                                                            className="text-sm font-black text-gray-900 truncate cursor-pointer hover:text-indigo-600 hover:underline decoration-dotted transition-colors flex items-center gap-2"
                                                        >
                                                            {p.name}
                                                            <Info size={12} className="text-gray-400" />
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                            <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">SKU: {p.sku}</span>
                                                            <span className="text-[9px] font-bold text-green-600 flex items-center gap-1 uppercase tracking-tighter">
                                                                <Euro size={10}/> {p.price.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                                    <div className="flex items-center gap-1 text-indigo-600">
                                                        <MapPin size={16} />
                                                        <span className="text-xl font-black uppercase tracking-tight">{p.location || 'N/A'}</span>
                                                    </div>
                                                    <div className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase border shadow-sm ${p.stock > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                                        {p.stock} шт
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SQL Helper Modal & Other Modals... (Same as before) */}
            {/* ... keeping the rest of the existing modal code ... */}
            {showSqlModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
                    {/* ... modal content ... */}
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 md:p-10 border border-gray-100 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Налаштування бази даних</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Скопіюйте та виконайте в Supabase SQL Editor</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSqlModal(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-colors">
                                <AlertCircle size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="bg-gray-900 rounded-2xl p-6 relative group overflow-hidden flex-1 min-h-[200px]">
                            <button 
                                onClick={handleCopySql} 
                                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-sm transition-all"
                            >
                                {copied ? <Check size={12}/> : <Copy size={12}/>}
                                {copied ? 'Скопійовано' : 'Копіювати SQL'}
                            </button>
                            <pre className="text-xs font-mono text-green-400 overflow-auto h-full pr-4 custom-scrollbar leading-relaxed">
{`-- =============================================
-- FIX DUPLICATE ENTRIES & CONSTRAINTS
-- =============================================

DELETE FROM public.advisor_analysis a USING (
      SELECT min(ctid) as ctid, incoming_id
        FROM public.advisor_analysis 
        GROUP BY incoming_id HAVING COUNT(*) > 1
      ) b
      WHERE a.incoming_id = b.incoming_id 
      AND a.ctid <> b.ctid;

ALTER TABLE public.advisor_analysis ADD CONSTRAINT advisor_analysis_incoming_id_key UNIQUE (incoming_id);

CREATE TABLE IF NOT EXISTS public.advisor_analysis (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    incoming_id uuid REFERENCES public.incoming_laptops(id) ON DELETE CASCADE,
    diagnosis text,
    steps jsonb,
    warnings jsonb,
    recommended_parts jsonb,
    other_parts jsonb,
    missing_parts jsonb,
    total_cost_eur numeric,
    chosen_action text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(incoming_id)
);

ALTER TABLE public.advisor_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for advisor_analysis" ON public.advisor_analysis FOR ALL USING (true) WITH CHECK (true);
`}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Modals (Images, Specs) */}
            {viewingImages && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-in fade-in">
                    <button 
                        onClick={() => setViewingImages(null)} 
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-20"
                    >
                        <X size={24} />
                    </button>

                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                        <img 
                            src={viewingImages[currentImgIdx]} 
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                            alt="Full view"
                        />
                        
                        <div className="absolute bottom-10 flex gap-4 items-center">
                            <button 
                                onClick={prevImage} 
                                className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all disabled:opacity-30"
                                disabled={viewingImages.length <= 1}
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <span className="text-white font-mono font-bold text-lg bg-black/50 px-4 py-2 rounded-xl">
                                {currentImgIdx + 1} / {viewingImages.length}
                            </span>
                            <button 
                                onClick={nextImage} 
                                className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all disabled:opacity-30"
                                disabled={viewingImages.length <= 1}
                            >
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingSpecs && (
                <div className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{viewingSpecs.name}</h3>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="bg-gray-200 px-2 py-0.5 rounded text-gray-600">SKU: {viewingSpecs.sku}</span>
                                    <span className="text-indigo-600">{viewingSpecs.category}</span>
                                </div>
                            </div>
                            <button onClick={() => setViewingSpecs(null)} className="p-2 bg-white hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                            {viewingSpecs.specifications && Object.keys(viewingSpecs.specifications).length > 0 ? (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Технічні параметри</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.entries(viewingSpecs.specifications).map(([key, val]: [string, any]) => (
                                            <div key={key} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 group">
                                                <span className="text-xs font-bold text-gray-500 uppercase">{key.replace(/_/g, ' ')}</span>
                                                <span className="text-sm font-black text-gray-800 text-right">{val.toString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <Info size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Параметри відсутні</p>
                                </div>
                            )}

                            {(viewingSpecs.description_de || viewingSpecs.description_en) && (
                                <div className="space-y-2 pt-4 border-t border-gray-100">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Опис</h4>
                                    <div className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-xl" dangerouslySetInnerHTML={{ __html: viewingSpecs.description_de || viewingSpecs.description_en }} />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button onClick={() => setViewingSpecs(null)} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                                Закрити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepairAdvisor;
