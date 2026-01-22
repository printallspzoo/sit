
import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { PackageSearch, Trash2, Copy, CheckCircle, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';

interface ScannedLabel {
  id: string;
  trackingNumber: string;
  timestamp: string;
  carrier: 'DPD' | 'Other';
  status: 'captured' | 'saved';
}

const LabelScanner: React.FC = () => {
  const [scannedLabels, setScannedLabels] = useState<ScannedLabel[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    startScanner();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      setError(null);
      const devices = await readerRef.current?.listVideoInputDevices();
      const backCamera = devices?.find((d: any) => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('environment') || 
        d.label.toLowerCase().includes('camera 0')
      );
      
      const selectedDeviceId = backCamera?.deviceId || devices?.[0]?.deviceId;

      if (!selectedDeviceId) {
        throw new Error("Камеру не знайдено");
      }

      readerRef.current?.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result: Result | null, err?: any) => {
          if (result) {
            handleScanSuccess(result.getText());
          }
        }
      );
    } catch (err: any) {
      console.error("Scanner error:", err);
      setError("Не вдалося отримати доступ до камери. Надайте дозволи або перевірте підключення.");
    }
  };

  const handleScanSuccess = (text: string) => {
    // DPD logic: usually 14 digits or alphanumeric patterns
    // Common DPD formats: 14 digits starting with 1, 0, or alphanumeric
    const isDPD = /^[0-9A-Z]{14}$/i.test(text.replace(/\s/g, '')) || text.startsWith('MPS');
    
    if (text === lastScanResult) return; // Avoid duplicate scans too fast

    // Visual feedback
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 300);

    setLastScanResult(text);

    // Vibration feedback (if available)
    if (navigator.vibrate) navigator.vibrate(100);

    const newLabel: ScannedLabel = {
      id: Math.random().toString(36).substr(2, 9),
      trackingNumber: text,
      timestamp: new Date().toLocaleTimeString(),
      carrier: isDPD ? 'DPD' : 'Other',
      status: 'captured'
    };

    setScannedLabels(prev => [newLabel, ...prev].slice(0, 50)); // Keep last 50
  };

  const deleteLabel = (id: string) => {
    setScannedLabels(prev => prev.filter(l => l.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Код скопійовано!");
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <PackageSearch className="text-indigo-600" size={32} /> 
                    Сканер DPD
                </h1>
                <p className="text-gray-500 font-medium tracking-tight">Автоматичне розпізнавання транспортних етикеток</p>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setScannedLabels([])}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50"
                >
                    Очистити список
                </button>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera View Area */}
            <div className="space-y-4">
                <div className={`relative bg-black rounded-[3rem] overflow-hidden shadow-2xl aspect-[4/3] border-8 transition-colors duration-300 ${isFlashActive ? 'border-green-400' : 'border-white'}`}>
                    {error ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-rose-50 text-rose-700">
                            <AlertCircle size={48} className="mb-4" />
                            <p className="font-bold">{error}</p>
                            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black">ПЕРЕЗАВАНТАЖИТИ</button>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                            
                            {/* Scanning Guide UI */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-3/4 h-1/2 border-2 border-white/30 rounded-3xl relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                                    
                                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500/50 animate-pulse" />
                                </div>
                            </div>

                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                                <div className="flex items-center gap-2">
                                    <RefreshCw size={12} className="text-white animate-spin" />
                                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Live Scanner Active</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                    <div className="flex items-start gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Порада для сканування</h4>
                            <p className="text-xs text-indigo-700 font-medium leading-relaxed mt-1">Тримайте етикетку прямо. Система автоматично розпізнає формати DPD, DHL та UPS. Дані миттєво з'являться в таблиці поруч.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table Area */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-gray-100 flex flex-col h-[500px] lg:h-auto">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        Зчитані дані ({scannedLabels.length})
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                    {scannedLabels.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-50">
                            <PackageSearch size={64} strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Очікування сканування...</p>
                        </div>
                    ) : (
                        scannedLabels.map((label) => (
                            <div key={label.id} className="bg-gray-50 border border-gray-100 p-5 rounded-3xl flex items-center justify-between group hover:border-indigo-200 transition-all animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-[10px] shadow-sm ${label.carrier === 'DPD' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {label.carrier}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-gray-900 font-mono tracking-tight truncate">{label.trackingNumber}</div>
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label.timestamp} • Capturing Success</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => copyToClipboard(label.trackingNumber)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 bg-white rounded-xl shadow-sm border border-gray-100"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button 
                                        onClick={() => deleteLabel(label.id)}
                                        className="p-2 text-gray-400 hover:text-rose-500 bg-white rounded-xl shadow-sm border border-gray-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {scannedLabels.length > 0 && (
                    <div className="p-6 bg-gray-50/50 border-t border-gray-50">
                        <button className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-lg">
                            Експортувати в звіт
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default LabelScanner;
