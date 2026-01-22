
import React, { useState } from 'react';
import { User, IncomingLaptop } from '../types';
import { apiCreateIncomingLaptop, apiGetNextSku } from '../services/mockBackend';
import { apiPrintLaptopLabel } from '../services/printnodeService';
import { Layers, Printer, Save, MapPin, CheckCircle2, Loader2, AlertCircle, Copy, Euro, FileText } from 'lucide-react';

interface BulkRegistrationProps {
    user: User;
    onNavigate: (page: string) => void;
}

const STATUS_OPTIONS = [
    { value: 'wholesale', label: 'На Опт / Аукціон' },
    { value: 'diagnostics', label: 'На Діагностику' },
    { value: 'return', label: 'Повернення (Return)' },
    { value: 'received', label: 'Очікує (Mix)' },
    { value: 'teardown', label: 'На Розбірку' },
];

const LOCATION_OPTIONS = [
    "4.1.0.1", "4.1.0.2", "4.1.0.3",
    "Service Room", "Base A", "Auction Area"
];

const BulkRegistration: React.FC<BulkRegistrationProps> = ({ user, onNavigate }) => {
    const [quantity, setQuantity] = useState<number>(1);
    const [baseName, setBaseName] = useState('');
    const [status, setStatus] = useState('wholesale');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [completedCount, setCompletedCount] = useState(0);

    const handleBulkAction = async () => {
        let effectiveBaseName = baseName.trim();

        // If base name is empty, default to English status name
        if (!effectiveBaseName) {
            switch (status) {
                case 'wholesale': effectiveBaseName = 'Wholesale'; break;
                case 'diagnostics': effectiveBaseName = 'Diagnostics'; break;
                case 'return': effectiveBaseName = 'Return'; break;
                case 'received': effectiveBaseName = 'Received Mix'; break;
                case 'teardown': effectiveBaseName = 'Teardown'; break;
                default: effectiveBaseName = status.charAt(0).toUpperCase() + status.slice(1);
            }
        }

        if (quantity < 1 || quantity > 100) return alert("Кількість повинна бути від 1 до 100");

        setIsProcessing(true);
        setLogs([]);
        setCompletedCount(0);
        setProgress(0);

        try {
            for (let i = 0; i < quantity; i++) {
                // 1. Get SKU
                const skuRes = await apiGetNextSku();
                const sku = skuRes.success ? (skuRes.data as string) : `ERR-${Date.now()}`;

                // 2. Create Object
                const laptopData: Partial<IncomingLaptop> = {
                    sku: sku,
                    name: quantity > 1 ? `${effectiveBaseName} #${i + 1}` : effectiveBaseName,
                    status: status as any,
                    location: location || 'Transit',
                    source: 'supplier', // Default
                    notes: description ? `${description} (Batch: ${status})` : `Bulk Created via Batch Tool. Status: ${status}`,
                    created_by: user.id,
                    purchase_price: parseFloat(price) || 0,
                    serial_number: 'PENDING'
                };

                // 3. Save to DB
                const createRes = await apiCreateIncomingLaptop(laptopData);
                
                if (createRes.success && createRes.data) {
                    // 4. Print Label (Printer ID 75095507)
                    await apiPrintLaptopLabel(75095507, createRes.data)
                        .then(() => {
                            setLogs(prev => [`✅ [${sku}] Створено + Друк OK`, ...prev]);
                        })
                        .catch(err => {
                            setLogs(prev => [`⚠️ [${sku}] Створено, але помилка друку`, ...prev]);
                        });
                } else {
                    setLogs(prev => [`❌ Помилка створення запису #${i+1}`, ...prev]);
                }

                setCompletedCount(prev => prev + 1);
                setProgress(Math.round(((i + 1) / quantity) * 100));
                
                // Small delay to prevent overwhelming the server/printer queue
                await new Promise(r => setTimeout(r, 500));
            }
        } catch (e: any) {
            alert("Критична помилка процесу: " + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto pb-24 animate-in fade-in space-y-6 px-4">
            <header>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <Layers className="text-indigo-600" size={32} /> 
                    Масова Реєстрація
                </h1>
                <p className="text-gray-500 font-medium tracking-tight">Створення партій та автоматичний друк етикеток</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* FORM SECTION */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Базова назва / Партія</label>
                            <input 
                                type="text" 
                                value={baseName} 
                                onChange={(e) => setBaseName(e.target.value)} 
                                placeholder={status === 'wholesale' ? "Wholesale (за замовчуванням)" : "Введіть назву..."}
                                disabled={isProcessing}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all placeholder-gray-400" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Кількість</label>
                                <div className="relative">
                                    <Copy className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="100" 
                                        value={quantity} 
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} 
                                        disabled={isProcessing}
                                        className="w-full pl-12 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Ціна (€/шт)</label>
                                <div className="relative">
                                    <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        value={price} 
                                        onChange={(e) => setPrice(e.target.value)} 
                                        placeholder="0.00" 
                                        disabled={isProcessing}
                                        className="w-full pl-12 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Локація (опціонально)</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                <input 
                                    list="locations"
                                    type="text"
                                    value={location} 
                                    onChange={(e) => setLocation(e.target.value)} 
                                    placeholder="Оберіть..." 
                                    disabled={isProcessing}
                                    className="w-full pl-12 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all" 
                                />
                                <datalist id="locations">
                                    {LOCATION_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Опис / Примітки</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-4 text-gray-400" size={18}/>
                                <textarea 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Додаткова інформація..." 
                                    disabled={isProcessing}
                                    className="w-full pl-12 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-medium outline-none transition-all resize-none h-20" 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Статус призначення</label>
                            <div className="grid grid-cols-1 gap-2">
                                {STATUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setStatus(opt.value)}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wide text-left flex items-center justify-between border-2 transition-all ${status === opt.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {opt.label}
                                        {status === opt.value && <CheckCircle2 size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50">
                        <button 
                            onClick={handleBulkAction} 
                            disabled={isProcessing} 
                            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18}/>}
                            {isProcessing ? `ОБРОБКА ${completedCount}/${quantity}...` : 'ЗГЕНЕРУВАТИ ТА ДРУКУВАТИ'}
                        </button>
                    </div>
                </div>

                {/* LOGS SECTION */}
                <div className="space-y-4">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 h-full flex flex-col">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Save size={14} /> Лог операцій
                        </h3>
                        
                        {isProcessing && (
                            <div className="mb-4">
                                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                                    <span>Прогрес</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 space-y-2 max-h-[400px] border border-gray-100 font-mono text-[10px]">
                            {logs.length === 0 ? (
                                <div className="text-center text-gray-300 py-10">Тут з'являться результати</div>
                            ) : (
                                logs.map((log, idx) => (
                                    <div key={idx} className="pb-1 border-b border-gray-100 last:border-0">{log}</div>
                                ))
                            )}
                        </div>
                        
                        {completedCount === quantity && quantity > 0 && !isProcessing && (
                            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-in zoom-in">
                                <CheckCircle2 size={16} />
                                Готово! Створено {completedCount} записів.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkRegistration;
