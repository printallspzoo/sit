
import React, { useState, useRef, useEffect } from 'react';
import { User, IncomingLaptop, CRMContact, TeardownPart } from '../types';
import { apiCreateIncomingLaptop, apiGetIncomingLaptops, apiUpdateIncomingLaptop, apiGetNextSku, apiUpdateIncomingStatus, apiAssignTask, apiGetPartsForIncomingItem } from '../services/mockBackend';
import { apiGetCRMContacts } from '../services/crmService';
import { apiUploadPhotoToSupabase } from '../services/supabaseClient';
import { extractSpecsFromDescription } from '../services/geminiService';
import { PRINTERS, apiPrintLaptopLabel, generateLabelDataUrl } from '../services/printnodeService';
import { BrowserMultiFormatReader } from '@zxing/library';
import { GoogleGenAI } from "@google/genai";
import { PackagePlus, Camera, Scan, Mic, Save, MapPin, X, Check, RefreshCw, Search, Plus, ArrowLeft, Edit3, Loader2, Sparkles, Settings2, Wand2, FileText, ChevronDown, ChevronUp, Cpu, Hash, Monitor, Microscope, CheckCircle2, Printer, ChevronRight, Eye, ListFilter, Trash2, Info, ExternalLink, Euro, Barcode, Lightbulb, Wrench, Settings, Truck, Activity, Hammer, Box, Gavel, Recycle, Tag, CheckSquare, Square } from 'lucide-react';

interface IncomingGoodsProps {
    user: User;
    onNavigate: (page: string, params?: any) => void;
}

const LOCATION_OPTIONS = [
    "4.1.0.1", "4.1.0.2", "4.1.0.3",
    "4.1.1.1", "4.1.1.2", "4.1.1.3",
    "4.1.2.1", "4.1.2.2", "4.1.2.3",
    "4.2.0.1", "4.2.0.2", "4.2.0.3",
    "4.2.1.1", "4.2.1.2", "4.2.1.3",
    "4.2.2.1", "4.2.2.2", "4.2.2.3",
    "4.2.3.1", "4.2.3.2", "4.2.3.3",
    "4.2.4.1", "4.2.4.2", "4.2.4.3",
    "4.2.5.1", "4.2.5.2", "4.2.5.3",
    "4.2.6.1", "4.2.6.2", "4.2.6.3",
    "4.3.0.1", "4.3.0.2", "4.3.0.3",
    "4.3.1.1", "4.3.1.2", "4.3.1.3",
    "4.3.2.1", "4.3.2.2", "4.3.2.3",
    "4.3.3.1", "4.3.3.2", "4.3.3.3",
    "4.3.4.1", "4.3.4.2", "4.3.4.3",
    "4.3.5.1", "4.3.5.2", "4.3.5.3",
    "4.3.6.1", "4.3.6.2", "4.3.6.3",
    "4.4.0.1", "4.4.0.2", "4.4.0.3",
    "4.4.1.1", "4.4.1.2", "4.4.1.3",
    "4.4.2.1", "4.4.2.2", "4.4.2.3",
    "4.4.3.1", "4.4.3.2", "4.4.3.3",
    "4.4.4.1", "4.4.4.2", "4.4.4.3",
    "4.4.5.1", "4.4.5.2", "4.4.5.3",
    "4.4.6.1", "4.4.6.2", "4.4.6.3",
    "4.5.0.1", "4.5.0.2", "4.5.0.3",
    "4.5.1.1", "4.5.1.2", "4.5.1.3",
    "4.5.2.1", "4.5.2.2", "4.5.2.3",
    "4.5.3.1", "4.5.3.2", "4.5.3.3",
    "4.5.4.1", "4.5.4.2", "4.5.4.3",
    "4.5.5.1", "4.5.5.2", "4.5.5.3",
    "4.5.6.1", "4.5.6.2", "4.5.6.3",
    "Service Room", "Base A"
];

const STATUS_OPTIONS = [
    { value: 'received', label: 'Прийом (Advisor)', icon: PackagePlus, color: 'text-gray-500 bg-gray-50 border-gray-200' },
    { value: 'diagnostics', label: 'Діагностика', icon: Microscope, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { value: 'repair_queue', label: 'В Ремонт', icon: Wrench, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'teardown', label: 'На Розбірку', icon: Settings, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'wholesale', label: 'На Опт', icon: Truck, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { value: 'auction', label: 'Аукціон', icon: Gavel, color: 'text-amber-700 bg-amber-100 border-amber-300' },
    { value: 'recycle', label: 'Утилізація', icon: Recycle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { value: 'ready_for_sale', label: 'На Продаж', icon: Tag, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'completed', label: 'Завершено', icon: CheckCircle2, color: 'text-slate-600 bg-slate-100 border-slate-300' },
];

const IncomingGoods: React.FC<IncomingGoodsProps> = ({ user, onNavigate }) => {
    // View State
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [items, setItems] = useState<IncomingLaptop[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Bulk Actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkPrinting, setIsBulkPrinting] = useState(false);

    // Status Navigation Modal
    const [statusChangeModal, setStatusChangeModal] = useState<{ id: string, oldStatus: string, newStatus: string } | null>(null);

    const [crmContacts, setCrmContacts] = useState<CRMContact[]>([]);
    const [editingItem, setEditingItem] = useState<IncomingLaptop | null>(null);
    const [detailedItem, setDetailedItem] = useState<IncomingLaptop | null>(null);

    // Tree View State (Expanded Items)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [partsCache, setPartsCache] = useState<Record<string, TeardownPart[]>>({});
    const [loadingParts, setLoadingParts] = useState<Set<string>>(new Set());

    // Printing state
    const [printingItemId, setPrintingItemId] = useState<string | null>(null);
    const [activePrintMenu, setActivePrintMenu] = useState<string | null>(null);
    const [labelPreviewUrl, setLabelPreviewUrl] = useState<string | null>(null);
    const [currentPrinterId, setCurrentPrinterId] = useState<number | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [serial, setSerial] = useState('');
    const [price, setPrice] = useState('');
    const [location, setLocation] = useState('');
    const [source, setSource] = useState<'supplier' | 'buyback' | 'private'>('supplier');
    const [supplierName, setSupplierName] = useState('');
    const [clientName, setClientName] = useState(''); // NEW
    const [originDetails, setOriginDetails] = useState(''); // NEW
    const [notes, setNotes] = useState('');
    const [rawOcrText, setRawOcrText] = useState(''); 
    const [photoUrls, setPhotoUrls] = useState<string[]>([]); 
    const [photos, setPhotos] = useState<File[]>([]);
    
    const [specs, setSpecs] = useState<Record<string, string>>({});
    const [isParsingSpecs, setIsParsingSpecs] = useState(false);
    const [isAIOcrLoading, setIsAIOcrLoading] = useState(false); 
    const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    
    const [newSpecKey, setNewSpecKey] = useState('');
    const [newSpecVal, setNewSpecVal] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mediaModal, setMediaModal] = useState<'none' | 'photo' | 'video' | 'scan'>('none');
    const [statusMsg, setStatusMsg] = useState('');

    const mediaVideoRef = useRef<HTMLVideoElement>(null);
    const mediaCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    useEffect(() => {
        if (viewMode === 'list') {
            loadItems();
        } else {
            loadSuppliers();
            // Restore form state
            const saved = localStorage.getItem('incoming_draft');
            if (saved && !editingItem) {
                try {
                    const parsed = JSON.parse(saved);
                    setName(parsed.name || '');
                    setSerial(parsed.serial || '');
                    setPrice(parsed.price || '');
                    setLocation(parsed.location || '');
                    setSource(parsed.source || 'supplier');
                    setSupplierName(parsed.supplierName || '');
                    setClientName(parsed.clientName || '');
                    setOriginDetails(parsed.originDetails || '');
                    setNotes(parsed.notes || '');
                    setSpecs(parsed.specs || {});
                } catch(e) { console.error("Restore failed", e); }
            }
        }
    }, [viewMode]);

    // Auto-save effect
    useEffect(() => {
        if (viewMode === 'form' && !editingItem) {
            const stateToSave = { name, serial, price, location, source, supplierName, clientName, originDetails, notes, specs };
            localStorage.setItem('incoming_draft', JSON.stringify(stateToSave));
        }
    }, [name, serial, price, location, source, supplierName, clientName, originDetails, notes, specs, viewMode]);

    const loadItems = async () => {
        setLoadingList(true);
        const itemsRes = await apiGetIncomingLaptops();
        if (itemsRes.success && itemsRes.data) setItems(itemsRes.data);
        setLoadingList(false);
    };

    const loadSuppliers = async () => {
        const res = await apiGetCRMContacts();
        if (res.success && res.data) setCrmContacts(res.data);
    };

    const handleEdit = (item: IncomingLaptop) => {
        setEditingItem(item);
        setName(item.name);
        setSerial(item.serial_number);
        setPrice(item.purchase_price.toString());
        setLocation(item.location || '');
        setSource(item.source);
        setSupplierName(item.supplier_name || '');
        setClientName(item.client_name || '');
        setOriginDetails(item.origin_details || '');
        setNotes(item.notes || '');
        setPhotoUrls(item.photos || []);
        setSpecs(item.specifications || {});
        setViewMode('form');
    };

    const resetForm = () => {
        setEditingItem(null);
        setName(''); setSerial(''); setPrice(''); setLocation(''); setNotes(''); 
        setSupplierName(''); setClientName(''); setOriginDetails('');
        setPhotos([]); setPhotoUrls([]); setSpecs({});
        setRawOcrText('');
        setNewSpecKey('');
        setNewSpecVal('');
        localStorage.removeItem('incoming_draft');
    };

    const handleAIParseFromNotes = async () => {
        if (!notes.trim()) return alert("Будь ласка, спочатку введіть опис.");
        setIsParsingSpecs(true);
        try {
            const result = await extractSpecsFromDescription(notes);
            setSpecs(prev => ({ ...prev, ...result }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsParsingSpecs(false);
        }
    };

    const addManualSpec = () => {
        if (!newSpecKey.trim() || !newSpecVal.trim()) return;
        setSpecs(prev => ({ ...prev, [newSpecKey.trim()]: newSpecVal.trim() }));
        setNewSpecKey('');
        setNewSpecVal('');
    };

    const removeSpec = (key: string) => {
        setSpecs(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const startMedia = async (mode: 'photo' | 'scan') => {
        setMediaModal(mode);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 4096 }, height: { ideal: 2160 } }
            });
            streamRef.current = stream;
            if (mediaVideoRef.current) {
                mediaVideoRef.current.srcObject = stream;
                await mediaVideoRef.current.play();
                if (mode === 'scan') {
                    codeReaderRef.current = new BrowserMultiFormatReader();
                    codeReaderRef.current.decodeFromStream(stream, mediaVideoRef.current, (result: any) => {
                        if (result) setSerial(result.getText().toUpperCase());
                    });
                }
            }
        } catch (err) { alert("Камера недоступна"); setMediaModal('none'); }
    };

    const stopMedia = () => {
        if (codeReaderRef.current) codeReaderRef.current.reset();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setMediaModal('none');
    };

    const takePhoto = () => {
        if (mediaVideoRef.current && mediaCanvasRef.current) {
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 100);
            const canvas = mediaCanvasRef.current;
            canvas.width = mediaVideoRef.current.videoWidth;
            canvas.height = mediaVideoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(mediaVideoRef.current, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setPhotos(prev => [...prev, file]);
                    setPhotoUrls(prev => [...prev, URL.createObjectURL(blob)]);
                }
            }, 'image/jpeg', 0.85);
        }
    };

    const performAIOcr = async () => {
        if (!mediaVideoRef.current || !mediaCanvasRef.current) return;
        setIsAIOcrLoading(true);
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 150);
        try {
            const canvas = mediaCanvasRef.current;
            canvas.width = mediaVideoRef.current.videoWidth;
            canvas.height = mediaVideoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(mediaVideoRef.current, 0, 0);
            const base64Data = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: "READ ALL TEXT. Return JSON: { 'full_text': '...' }" }] }],
                config: { responseMimeType: "application/json" }
            });
            const result = JSON.parse(response.text || "{}");
            if (result.full_text) setRawOcrText(prev => prev ? prev + '\n' + result.full_text : result.full_text);
            stopMedia();
        } catch (e) { alert("OCR Fail"); } finally { setIsAIOcrLoading(false); }
    };

    const handleDeepAnalysis = async () => {
        if (!rawOcrText.trim()) return;
        setIsDeepAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analyze text: "${rawOcrText}". Extract Model, Serial, Specs. JSON: { "model": "...", "serial": "...", "specs": { "Key": "Val" } }`,
                config: { responseMimeType: "application/json" }
            });
            const result = JSON.parse(response.text || "{}");
            if (result.model) setName(result.model);
            if (result.serial) setSerial(result.serial.toUpperCase());
            if (result.specs) setSpecs(prev => ({ ...prev, ...result.specs }));
        } catch (e) { alert("AI Error"); } finally { setIsDeepAnalyzing(false); }
    };

    const toggleListening = (target: 'name' | 'notes') => {
        if (!('webkitSpeechRecognition' in window)) return alert("Not supported");
        const rec = new (window as any).webkitSpeechRecognition();
        rec.lang = 'uk-UA';
        rec.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            if (target === 'notes') setNotes(prev => prev ? `${prev} ${transcript}` : transcript);
            else setName(prev => prev ? `${prev} ${transcript}` : transcript);
        };
        rec.start();
    };

    const handleSubmit = async () => {
        if (!name) return alert("Введіть назву!");
        setIsSubmitting(true);
        setStatusMsg("Збереження...");
        try {
            let skuToUse = editingItem?.sku || "";
            if (!skuToUse) {
                const skuRes = await apiGetNextSku();
                skuToUse = skuRes.success ? (skuRes.data as string) : '8000000000';
            }
            const finalPhotoLinks: string[] = photoUrls.filter(u => u.startsWith('http'));
            for (let i = 0; i < photos.length; i++) {
                const sbUrl = await apiUploadPhotoToSupabase(photos[i], `${skuToUse}/photo_${Date.now()}_${i}.jpg`);
                if (sbUrl) finalPhotoLinks.push(sbUrl);
            }
            const laptopData: Partial<IncomingLaptop> = {
                sku: skuToUse, name, serial_number: serial, purchase_price: parseFloat(price) || 0,
                location, source, supplier_name: supplierName, notes,
                created_by: user.id, photos: finalPhotoLinks, specifications: specs,
                client_name: clientName, origin_details: originDetails
            };
            const res = editingItem ? await apiUpdateIncomingLaptop({ ...editingItem, ...laptopData } as IncomingLaptop) : await apiCreateIncomingLaptop(laptopData);
            
            if (res.success) {
                if (!editingItem && res.data) {
                    setStatusMsg("Друк етикетки...");
                    await apiPrintLaptopLabel(75095507, res.data).catch(err => console.error("Auto print failed:", err));
                }
                resetForm(); 
                setViewMode('list'); 
                loadItems(); 
            } else { throw new Error(res.error); }
        } catch (e: any) { alert(`Помилка: ${e.message}`); } 
        finally { setIsSubmitting(false); setStatusMsg(""); }
    };

    const handleTogglePrintMenu = (item: IncomingLaptop) => {
        if (activePrintMenu === item.id) {
            setActivePrintMenu(null);
            setLabelPreviewUrl(null);
            setCurrentPrinterId(null);
        } else {
            setActivePrintMenu(item.id);
            const defaultPrinter = PRINTERS[0];
            setCurrentPrinterId(defaultPrinter.id);
            const preview = generateLabelDataUrl(item, defaultPrinter.w, defaultPrinter.h);
            setLabelPreviewUrl(preview);
        }
    };

    const handlePrinterChange = (printerId: number, item: IncomingLaptop) => {
        setCurrentPrinterId(printerId);
        const printer = PRINTERS.find(p => p.id === printerId)!;
        const preview = generateLabelDataUrl(item, printer.w, printer.h);
        setLabelPreviewUrl(preview);
    };

    const handlePrint = async (printerId: number, item: IncomingLaptop) => {
        setPrintingItemId(item.id);
        const res = await apiPrintLaptopLabel(printerId, item);
        if (!res.success) alert("Помилка друку: " + res.error);
        setPrintingItemId(null);
        setActivePrintMenu(null);
    };

    const handleStatusClick = (item: IncomingLaptop, newStatus: string) => {
        if (item.status === newStatus) return;
        setStatusChangeModal({ id: item.id, oldStatus: item.status, newStatus: newStatus });
    };

    const confirmStatusChange = async (navigate: boolean) => {
        if (!statusChangeModal) return;
        const { id, newStatus } = statusChangeModal;
        
        // Optimistic update
        setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
        setStatusChangeModal(null);

        const res = await apiUpdateIncomingStatus(id, newStatus);
        
        if (res.success) {
            if (navigate) {
                // Map status to page route
                let targetPage = 'incoming';
                if (newStatus === 'wholesale') targetPage = 'wholesale';
                if (newStatus === 'recycle') targetPage = 'recycle';
                if (newStatus === 'auction') targetPage = 'auction';
                if (newStatus === 'ready_for_sale') targetPage = 'ready_for_sale';
                if (newStatus === 'completed') targetPage = 'completed';
                if (newStatus === 'teardown') targetPage = 'teardown';
                if (newStatus === 'repair_queue') targetPage = 'repair_queue';
                
                if (targetPage !== 'incoming') onNavigate(targetPage);
            }
        } else {
            alert('Error updating status: ' + res.error);
            loadItems();
        }
    };

    const handleAssignTask = async (item: IncomingLaptop, status: string, targetPage: string, taskType: string) => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: status as any, location: user.name, assigned_to: user.id } : i));
        const res = await apiAssignTask(item.id, user.id, user.name, status, taskType);
        if (res.success) {
            if (targetPage === 'teardown') onNavigate('teardown', { prefilledTitle: item.name, incomingId: item.id });
            else if (targetPage === 'repair-advisor') onNavigate('repair-advisor', { prefilledQuery: item.name, incomingId: item.id });
        } else {
            alert("Помилка призначення завдання: " + res.error);
            loadItems();
        }
    };

    const toggleExpand = async (itemId: string) => {
        if (expandedIds.has(itemId)) {
            const newSet = new Set(expandedIds);
            newSet.delete(itemId);
            setExpandedIds(newSet);
        } else {
            const newSet = new Set(expandedIds);
            newSet.add(itemId);
            setExpandedIds(newSet);
            if (!partsCache[itemId]) {
                setLoadingParts(prev => new Set(prev).add(itemId));
                const res = await apiGetPartsForIncomingItem(itemId);
                setLoadingParts(prev => { const n = new Set(prev); n.delete(itemId); return n; });
                if (res.success) setPartsCache(prev => ({ ...prev, [itemId]: res.data || [] }));
            }
        }
    };

    // Bulk selection logic
    const handleSelectAll = () => {
        if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredItems.map(i => i.id)));
    };

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkPrint = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkPrinting(true);
        let count = 0;
        for (const id of selectedIds) {
            const item = items.find(i => i.id === id);
            if (item) {
                await apiPrintLaptopLabel(75095507, item);
                count++;
            }
            await new Promise(r => setTimeout(r, 500)); // Delay to prevent congestion
        }
        setIsBulkPrinting(false);
        alert(`Надіслано ${count} етикеток на друк`);
        setSelectedIds(new Set());
    };

    const getStatusConfig = (status: string) => {
        const found = STATUS_OPTIONS.find(s => s.value === status);
        return found ? { icon: found.icon, color: found.color, text: found.label } : { icon: Lightbulb, color: 'text-gray-500 bg-gray-50 border-gray-200', text: status };
    };

    const filteredItems = items.filter(i => {
        const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.includes(searchTerm);
        const matchStatus = statusFilter === 'all' || i.status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (viewMode === 'list') {
        const isAdmin = user.role === 'admin';

        return (
            <div className="max-w-4xl mx-auto pb-24 animate-in fade-in space-y-6 px-4">
                <header className="flex justify-between items-center">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3"><PackagePlus className="text-indigo-600" size={28} /> Прийом</h1>
                    <button onClick={() => { resetForm(); setViewMode('form'); }} className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={16} /> Додати</button>
                </header>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-4 md:p-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" placeholder="Пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <div className="relative w-full md:w-64">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full pl-4 pr-10 py-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none appearance-none">
                                <option value="all">Всі статуси</option>
                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100 animate-in slide-in-from-top-2">
                            <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Вибрано: {selectedIds.size}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedIds(new Set())} className="text-indigo-400 hover:text-indigo-600 px-3 py-2 text-xs font-bold">Скасувати</button>
                                <button onClick={handleBulkPrint} disabled={isBulkPrinting} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700">
                                    {isBulkPrinting ? <RefreshCw className="animate-spin" size={14}/> : <Printer size={14}/>} Масовий Друк
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {loadingList ? (
                        <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-gray-300" /></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <button onClick={handleSelectAll} className="flex items-center gap-2 hover:text-indigo-600">
                                    {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>} Вибрати всі
                                </button>
                            </div>
                            {filteredItems.map(item => {
                                const statusConfig = getStatusConfig(item.status);
                                const StatusIcon = statusConfig.icon;
                                const isExpanded = expandedIds.has(item.id);
                                const itemParts = partsCache[item.id];
                                const isLoadingPartsForItem = loadingParts.has(item.id);
                                const isSelected = selectedIds.has(item.id);
                                
                                return (
                                    <div key={item.id} className={`group flex flex-col bg-white border rounded-[2rem] hover:border-indigo-100 transition-all overflow-hidden ${isSelected ? 'border-indigo-200 bg-indigo-50/10' : 'border-gray-100'}`}>
                                        <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 relative">
                                            <div className="absolute top-4 left-3 z-10" onClick={(e) => { e.stopPropagation(); handleToggleSelect(item.id); }}>
                                                {isSelected ? <CheckSquare className="text-indigo-600 cursor-pointer" size={20}/> : <Square className="text-gray-300 cursor-pointer hover:text-indigo-400" size={20}/>}
                                            </div>

                                            <button 
                                                onClick={() => toggleExpand(item.id)}
                                                className={`absolute top-12 left-3 p-1.5 rounded-full hover:bg-gray-100 transition-all ${isExpanded ? 'rotate-180 bg-gray-100' : ''}`}
                                            >
                                                <ChevronDown size={16} className="text-gray-400" />
                                            </button>

                                            <div className="flex items-center gap-4 w-full md:w-auto flex-1 pl-10 md:pl-8">
                                                <div onClick={() => setDetailedItem(item)} className="w-16 h-16 shrink-0 bg-indigo-50 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-50 cursor-pointer hover:opacity-80">
                                                    {item.photos && item.photos[0] ? (
                                                        <img src={`${item.photos[0]}?width=200&resize=contain`} className="w-full h-full object-cover" loading="lazy" />
                                                    ) : (
                                                        <div className="text-indigo-300 font-black text-[10px] uppercase text-center p-1">{item.sku.slice(-4)}</div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase tracking-widest">{item.sku}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${item.assigned_to ? 'text-green-600 bg-green-50 px-2 rounded' : 'text-indigo-500'}`}>{item.location || 'NO LOC'}</span>
                                                    </div>
                                                    <h4 onClick={() => setDetailedItem(item)} className="font-black text-gray-900 truncate text-sm hover:text-indigo-600 cursor-pointer">{item.name}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase truncate">S/N: {item.serial_number || 'N/A'}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto border-t md:border-t-0 border-gray-50 pt-3 md:pt-0 pl-10 md:pl-0">
                                                <div className="relative group/status">
                                                    {isAdmin && (
                                                        <select
                                                            value={item.status}
                                                            onChange={(e) => handleStatusClick(item, e.target.value)}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        >
                                                            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                    )}
                                                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${statusConfig.color} ${isAdmin ? 'hover:border-current cursor-pointer' : 'cursor-default'} shadow-sm justify-center`}>
                                                        <StatusIcon size={14} />
                                                        <span className="hidden sm:inline">{statusConfig.text}</span>
                                                        {isAdmin && <ChevronDown size={10} className="opacity-50 ml-0.5" />}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 pl-1.5 md:border-l md:border-gray-100">
                                                    <button onClick={() => handleAssignTask(item, 'diagnostics', 'repair-advisor', 'diagnostics')} className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-purple-600 hover:bg-purple-50" title="Діагностика"><Activity size={18}/></button>
                                                    <button onClick={() => handleAssignTask(item, 'repair_queue', 'repair-advisor', 'repair')} className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Ремонт"><Wrench size={18}/></button>
                                                    <button onClick={() => handleTogglePrintMenu(item)} className={`p-2.5 rounded-xl transition-all ${activePrintMenu === item.id ? 'bg-[#16BBF8] text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}><Printer size={18}/></button>
                                                    <button onClick={() => handleEdit(item)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={18}/></button>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-gray-50 border-t border-gray-100 p-4 pl-10 md:pl-16 animate-in slide-in-from-top-2">
                                                {isLoadingPartsForItem ? (
                                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold py-2"><Loader2 className="animate-spin" size={14} /> Loading parts...</div>
                                                ) : itemParts && itemParts.length > 0 ? (
                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-2"><Box size={12}/> Розібрані частини ({itemParts.length})</h5>
                                                        {itemParts.map(part => (
                                                            <div key={part.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100">
                                                                        {part.images && part.images.length > 0 ? (
                                                                            <img src={`${part.images[0]}?width=100`} className="w-full h-full object-cover rounded-lg" />
                                                                        ) : <Settings size={16} className="text-gray-300"/>}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xs font-bold text-gray-800">{part.name}</div>
                                                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{part.sku} • {part.category}</div>
                                                                    </div>
                                                                </div>
                                                                {part.baselinkerId ? (
                                                                    <div className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                                                        <Check size={10} /> BL: {part.baselinkerId}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                                                        Not Synced
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-gray-300 text-xs font-bold uppercase">
                                                        Немає зареєстрованих запчастин
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activePrintMenu === item.id && (
                                            <div className="bg-sky-50/50 border-t border-sky-100 p-5 animate-in slide-in-from-top-2">
                                                <div className="flex flex-col md:flex-row gap-6 items-center">
                                                    <div className="w-40 h-24 bg-white border border-sky-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-1">
                                                        {labelPreviewUrl ? <img src={labelPreviewUrl} className="max-w-full max-h-full object-contain" /> : <Loader2 className="animate-spin text-sky-200"/>}
                                                    </div>
                                                    <div className="flex-1 space-y-3 w-full">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {PRINTERS.map(p => (
                                                                <button key={p.id} onClick={() => handlePrinterChange(p.id, item)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${currentPrinterId === p.id ? 'bg-[#16BBF8] text-white border-transparent shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-sky-300'}`}>{p.size}</button>
                                                            ))}
                                                        </div>
                                                        <button 
                                                            onClick={() => handlePrint(currentPrinterId!, item)}
                                                            disabled={printingItemId === item.id}
                                                            className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                                                        >
                                                            {printingItemId === item.id ? <RefreshCw className="animate-spin" size={14}/> : <Printer size={14}/>}
                                                            ДРУКУВАТИ ЕТИКЕТКУ
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* STATUS CHANGE CONFIRMATION MODAL */}
                {statusChangeModal && (
                    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl space-y-6">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                                <RefreshCw size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Статус Змінено</h3>
                                <p className="text-gray-500 font-medium text-sm">Ноутбук переміщено у статус <b>"{STATUS_OPTIONS.find(s=>s.value===statusChangeModal.newStatus)?.label}"</b>. Перейти на відповідну сторінку?</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => confirmStatusChange(false)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black uppercase text-[10px] tracking-widest">Залишитись</button>
                                <button onClick={() => confirmStatusChange(true)} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Перейти</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DETAILED MODAL */}
                {detailedItem && (
                    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-widest">{detailedItem.sku}</span>
                                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest">{detailedItem.location}</span>
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 leading-tight">{detailedItem.name}</h2>
                                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase">S/N: {detailedItem.serial_number}</p>
                                </div>
                                <button onClick={() => setDetailedItem(null)} className="p-3 bg-white hover:bg-rose-50 hover:text-rose-500 rounded-2xl shadow-sm transition-all"><X size={20}/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                                {detailedItem.photos && detailedItem.photos.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Галерея ({detailedItem.photos.length})</h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {detailedItem.photos.map((url, idx) => (
                                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group relative block">
                                                    <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ExternalLink size={20} className="text-white"/></div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                        <span className="text-xs font-black text-slate-400 uppercase">Клієнт</span>
                                        <span className="text-sm font-bold text-slate-900">{detailedItem.client_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                        <span className="text-xs font-black text-slate-400 uppercase">Постачальник</span>
                                        <span className="text-sm font-bold text-slate-900">{detailedItem.supplier_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-slate-400 uppercase">Джерело</span>
                                        <span className="text-sm font-bold text-slate-900">{detailedItem.origin_details || '-'}</span>
                                    </div>
                                </div>

                                {/* ... Specs and Notes ... */}
                                {detailedItem.notes && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Опис стану</h3>
                                        <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 text-sm font-medium text-gray-800 leading-relaxed italic">
                                            "{detailedItem.notes}"
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex gap-4">
                                <button onClick={() => { setDetailedItem(null); handleEdit(detailedItem); }} className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Edit3 size={18}/> Редагувати</button>
                                <button onClick={() => handleTogglePrintMenu(detailedItem)} className="p-5 bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 rounded-2xl shadow-sm transition-all"><Printer size={20}/></button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    } 

    return (
        <div className="max-w-2xl mx-auto pb-24 animate-in fade-in space-y-6 px-4">
            <header className="flex items-center gap-4">
                <button onClick={() => { setViewMode('list'); resetForm(); }} className="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 transition-all"><ArrowLeft size={20}/></button>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">{editingItem ? 'Редагування' : 'Новий пристрій'}</h1>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-5 md:p-8 space-y-8 overflow-hidden">
                {/* 1. AI OCR & STICKER TEXT */}
                <div className="space-y-4 bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Microscope size={16}/> Сканування наклейки</h3>
                        <button onClick={() => startMedia('scan')} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all"><Scan size={20}/></button>
                    </div>
                    <div className="space-y-3">
                        <textarea value={rawOcrText} onChange={(e) => setRawOcrText(e.target.value)} placeholder="Текст з наклейки..." className="w-full bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-xs font-mono text-gray-900 outline-none h-24 resize-none shadow-sm" />
                        <button onClick={handleDeepAnalysis} disabled={!rawOcrText || isDeepAnalyzing} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${rawOcrText ? 'bg-[#16BBF8] text-white shadow-xl' : 'bg-gray-100 text-gray-300'}`}>
                            {isDeepAnalyzing ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>} ВИЗНАЧИТИ МОДЕЛЬ ТА S/N
                        </button>
                    </div>
                </div>

                {/* 2. BASIC INFO */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Назва пристрою</label>
                        <div className="relative">
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dell Latitude 5520..." className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none pr-12 transition-all" />
                            <button onClick={() => toggleListening('name')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"><Mic size={20}/></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Serial Number</label>
                            <input type="text" value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase())} placeholder="S/N..." className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Ціна (€)</label>
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                        </div>
                    </div>
                </div>

                {/* 2.5 SOURCE INFO (NEW) */}
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2 flex items-center gap-2"><Truck size={16}/> Походження</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Клієнт</label>
                            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ім'я клієнта..." className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Постачальник</label>
                            <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Назва постачальника..." className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Звідки надійшов (Джерело)</label>
                        <input type="text" value={originDetails} onChange={(e) => setOriginDetails(e.target.value)} placeholder="Ebay, OLX, Прямий закуп..." className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                    </div>
                </div>

                {/* 3. VISUAL DESCRIPTION (NOTES) & VOICE */}
                <div className="space-y-4 bg-amber-50/30 p-6 rounded-[2rem] border border-amber-100/50">
                    <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black text-amber-600 uppercase tracking-widest px-1 flex items-center gap-2"><Mic size={16}/> Візуальний опис (Стан)</label>
                        <button onClick={() => toggleListening('notes')} className="p-3 bg-white text-amber-600 border border-amber-200 rounded-2xl shadow-sm hover:bg-amber-50 active:scale-90 transition-all"><Mic size={20}/></button>
                    </div>
                    <div className="relative">
                        <textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="Опишіть стан..." 
                            className="w-full bg-white border-2 border-transparent focus:border-amber-500 rounded-2xl px-5 py-4 text-sm font-medium text-gray-900 outline-none h-32 resize-none shadow-sm transition-all" 
                        />
                        <button 
                            onClick={handleAIParseFromNotes}
                            disabled={!notes || isParsingSpecs}
                            className={`absolute bottom-4 right-4 p-3 rounded-xl transition-all shadow-lg flex items-center gap-2 ${notes ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-gray-100 text-gray-300'}`}
                        >
                            {isParsingSpecs ? <RefreshCw className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                            <span className="text-[9px] font-black uppercase">AI Парсинг</span>
                        </button>
                    </div>
                </div>

                {/* 4. SPECIFICATIONS MANAGEMENT */}
                <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center gap-2"><Settings2 size={16}/> Технічні параметри</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(specs).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl group">
                                <div className="min-w-0">
                                    <span className="text-[8px] font-black text-gray-400 uppercase block leading-none mb-1">{k}</span>
                                    <span className="text-xs font-bold text-gray-900 truncate block">{v}</span>
                                </div>
                                <button onClick={() => removeSpec(k)} className="text-gray-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 items-end pt-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase px-1">Назва</label>
                            <input type="text" value={newSpecKey} onChange={(e) => setNewSpecKey(e.target.value)} placeholder="CPU..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase px-1">Значення</label>
                            <input type="text" value={newSpecVal} onChange={(e) => setNewSpecVal(e.target.value)} placeholder="Intel..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                        </div>
                        <button onClick={addManualSpec} className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm"><Plus size={18}/></button>
                    </div>
                </div>

                {/* 5. LOCATION (DROPDOWN) & PHOTOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 block"><MapPin size={16} className="inline mr-2"/> Локалізація</label>
                        <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none shadow-inner appearance-none transition-all">
                            <option value="">Оберіть...</option>
                            {LOCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center gap-2"><Camera size={16}/> Фото-фіксація</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {photoUrls.map((url, idx) => (
                                <div key={idx} className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <button onClick={() => setPhotoUrls(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"><X size={10}/></button>
                                </div>
                            ))}
                            {photoUrls.length < 6 && (
                                <button onClick={() => startMedia('photo')} className="aspect-square bg-indigo-50 text-indigo-500 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-dashed border-indigo-100 active:scale-95 transition-all">
                                    <Camera size={20} />
                                    <span className="text-[8px] font-black uppercase">Додати</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 6. ACTIONS */}
                <div className="pt-6 flex flex-col sm:flex-row gap-4 border-t border-gray-50">
                    <button onClick={() => { setViewMode('list'); resetForm(); }} className="order-2 sm:order-1 flex-1 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Скасувати</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="order-1 sm:order-2 flex-[3] bg-gray-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-600">
                        {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                        {isSubmitting ? statusMsg : (editingItem ? 'ЗБЕРЕГТИ ЗМІНИ' : 'ЗАРЕЄСТРУВАТИ ПРИСТРІЙ')}
                    </button>
                </div>
            </div>

            {/* Media Modal */}
            {mediaModal !== 'none' && (
                <div className="fixed inset-0 z-[600] bg-black flex flex-col h-[100dvh] overflow-hidden">
                    <div className="relative flex-1 bg-black">
                        <video ref={mediaVideoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        <canvas ref={mediaCanvasRef} className="hidden" />
                        {showFlash && <div className="absolute inset-0 bg-white z-[650] animate-in fade-out duration-150" />}
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[700] bg-gradient-to-b from-black/60 to-transparent">
                            <div className="text-white text-[10px] font-black uppercase bg-indigo-600 px-4 py-2 rounded-full shadow-lg">{mediaModal === 'scan' ? 'AI СКАНЕР' : 'КАМЕРА'}</div>
                            <button onClick={stopMedia} className="p-4 bg-white/20 hover:bg-rose-500 rounded-full text-white backdrop-blur-md active:scale-90 transition-all"><X size={24}/></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent z-[750]">
                            {mediaModal === 'scan' && (
                                <button onClick={performAIOcr} disabled={isAIOcrLoading} className="w-full max-w-xs bg-[#16BBF8] text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95">
                                    {isAIOcrLoading ? <RefreshCw className="animate-spin" size={20}/> : <Wand2 size={20}/>} 
                                    {isAIOcrLoading ? 'ОБРОБКА...' : 'ЗАХОПИТИ ТЕКСТ'}
                                </button>
                            )}
                            {mediaModal === 'photo' && (
                                <div className="flex items-center gap-8">
                                    <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-2xl active:scale-90 p-1">
                                        <div className="w-full h-full bg-white rounded-full border-2 border-black" />
                                    </button>
                                    {photoUrls.length > 0 && (
                                        <button onClick={stopMedia} className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 active:scale-95">
                                            <Check size={18}/> ГОТОВО
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncomingGoods;
