
import React, { useEffect, useState } from 'react';
import { Download, Share, X, Phone } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Detect if already installed/standalone
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isInStandaloneMode);

    // Capture the install prompt event (Chrome/Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if we should show iOS prompt (only if not standalone and on iOS)
    if (isIosDevice && !isInStandaloneMode) {
        // Only show once per session or use local storage to limit frequency
        const hasSeenPrompt = sessionStorage.getItem('iosPwaPromptSeen');
        if (!hasSeenPrompt) {
            setShowIOSPrompt(true);
        }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const closeIOSPrompt = () => {
      setShowIOSPrompt(false);
      sessionStorage.setItem('iosPwaPromptSeen', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Android / Desktop Chrome Button */}
      {deferredPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-gray-700">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-600 p-2 rounded-xl">
                 <Download size={20} className="text-white" />
               </div>
               <div>
                 <p className="text-sm font-bold">Встановити додаток</p>
                 <p className="text-[10px] text-gray-400">Швидкий доступ та офлайн режим</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setDeferredPrompt(null)} 
                  className="p-2 text-gray-400 hover:text-white"
                >
                    <X size={18} />
                </button>
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  Встановити
                </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Instructions Overlay */}
      {showIOSPrompt && (
        <div className="fixed inset-x-0 bottom-0 z-[100] p-4 animate-in slide-in-from-bottom duration-500">
            <div className="bg-white/90 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-3xl p-6 relative">
                 <button onClick={closeIOSPrompt} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
                     <X size={20} />
                 </button>
                 
                 <div className="flex flex-col items-center text-center space-y-4">
                     <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                         <Phone className="text-indigo-600" size={24} />
                     </div>
                     <div>
                         <h3 className="text-lg font-black text-gray-900">Встановити Sitrem</h3>
                         <p className="text-sm text-gray-500 mt-1">Додайте на головний екран для зручного доступу.</p>
                     </div>
                     
                     <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-4 py-3 rounded-xl w-full justify-center">
                         <span>1. Натисніть</span>
                         <Share size={18} className="text-blue-500" />
                         <span>"Поділитися"</span>
                     </div>
                     <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-4 py-3 rounded-xl w-full justify-center">
                         <span>2. Оберіть</span>
                         <span className="font-bold border border-gray-200 bg-white px-2 py-0.5 rounded-md text-xs">На початковий екран</span>
                     </div>
                 </div>
                 
                 {/* Little arrow pointing down */}
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-b border-r border-gray-200"></div>
            </div>
        </div>
      )}
    </>
  );
};
