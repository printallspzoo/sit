import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import jsQR from 'jsqr';
import { User } from '../types';
import { apiGenerateTerminalToken, apiProcessAttendanceScan } from '../services/mockBackend';
import { Camera, RefreshCw, ShieldCheck, Wifi, Clock, MapPin, Smartphone, SwitchCamera, XCircle, CheckCircle2 } from 'lucide-react';

interface QRAuthProps {
  user: User;
}

const QRAuth: React.FC<QRAuthProps> = ({ user }) => {
  const isTerminalUser = user.role === 'terminal' || user.role === 'admin';
  const [mode, setMode] = useState<'display' | 'scan'>(isTerminalUser ? 'display' : 'scan');
  
  // Terminal State
  const [terminalToken, setTerminalToken] = useState<string>('');
  const [nextRefresh, setNextRefresh] = useState(15);
  
  // Scanner State
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const statusRef = useRef(scanStatus);

  // Sync ref for tick function
  useEffect(() => {
    statusRef.current = scanStatus;
  }, [scanStatus]);

  // Terminal logic
  useEffect(() => {
    let timer: any;
    if (mode === 'display') {
        const fetchToken = async () => {
            const res = await apiGenerateTerminalToken();
            if (res.success && res.data) {
                setTerminalToken(res.data);
                setNextRefresh(15);
            }
        };
        fetchToken();
        timer = setInterval(() => {
            setNextRefresh((prev) => {
                if (prev <= 1) { fetchToken(); return 15; }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode]);

  // Camera logic
  const stopCamera = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const startCamera = async () => {
    setScanStatus('scanning');
    setScanMessage('');
    
    try {
        const constraints = { video: { facingMode: cameraFacingMode } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true");
            await videoRef.current.play();
            requestRef.current = requestAnimationFrame(tick);
        }
    } catch (err) {
        console.error("Camera access error:", err);
        // Fallback to front camera if back fails (common on desktops)
        if (cameraFacingMode === 'environment') {
            setCameraFacingMode('user');
        } else {
            setScanStatus('error');
            setScanMessage("Camera access denied or not found.");
        }
    }
  };

  const tick = () => {
    if (statusRef.current !== 'scanning') return;

    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

                if (code && code.data) {
                    handleScanSuccess(code.data);
                    return;
                }
            }
        }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  const handleScanSuccess = async (token: string) => {
      setScanStatus('processing');
      stopCamera();
      
      try {
          const res = await apiProcessAttendanceScan(user.id, token);
          if (res.success) {
              setScanStatus('success');
              setScanMessage(res.data?.message || "Verified Successfully");
          } else {
              setScanStatus('error');
              setScanMessage(res.error || "Verification failed");
          }
      } catch (e) {
          setScanStatus('error');
          setScanMessage("Network error. Try again.");
      }
  };

  const toggleCamera = () => {
      stopCamera();
      setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      setTimeout(() => startCamera(), 150);
  };

  useEffect(() => {
      if (mode === 'scan') startCamera();
      return () => stopCamera();
  }, [mode]);

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Mode Switcher */}
      {(user.role === 'admin' || user.role === 'terminal') && (
        <div className="bg-gray-200 p-1 rounded-xl flex mb-8 max-w-sm mx-auto shadow-inner">
             <button onClick={() => { stopCamera(); setMode('display'); }} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'display' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Terminal Mode</button>
             <button onClick={() => { setMode('scan'); }} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'scan' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Scanner Mode</button>
        </div>
      )}

      {mode === 'display' ? (
        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
             <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 text-center relative max-w-sm w-full">
                <div className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest inline-flex items-center gap-2 mb-8">
                    <Wifi size={10} className="text-green-400 animate-pulse"/> SYSTEM SECURE
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">WorkSync Point</h2>
                <p className="text-sm text-gray-400 mb-8">Align your scanner with the code</p>

                <div className="bg-white p-6 rounded-3xl border-4 border-gray-50 inline-block mb-8 shadow-inner">
                    {terminalToken ? <QRCode value={terminalToken} size={200} /> : <div className="h-[200px] w-[200px] bg-gray-100 animate-pulse rounded-lg" />}
                </div>

                <div className="flex items-center justify-center gap-2 text-indigo-500 text-xs font-bold bg-indigo-50 py-3 rounded-2xl">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>SECURE REFRESH IN {nextRefresh}S</span>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                     <span className="flex items-center gap-1"><MapPin size={10}/> OFFICE_A</span>
                     <span className="flex items-center gap-1"><Clock size={10}/> {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
             </div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6 w-full px-4 animate-in fade-in">
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-gray-900">Attendance Scan</h2>
                <p className="text-gray-500 text-sm">Position QR code within the frame</p>
            </div>

            <div className="relative w-full max-w-sm aspect-[4/5] bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white group">
                <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`} muted playsInline />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Frame Overlay */}
                {scanStatus === 'scanning' && (
                     <div className="absolute inset-0 z-10 pointer-events-none">
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 rounded-3xl">
                             <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-indigo-500 rounded-tl-xl" />
                             <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-indigo-500 rounded-tr-xl" />
                             <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-indigo-500 rounded-bl-xl" />
                             <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-indigo-500 rounded-br-xl" />
                             <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/50 blur-sm animate-[scan_2s_ease-in-out_infinite]" />
                             <div className="absolute top-0 left-0 right-0 h-0.5 bg-white shadow-[0_0_15px_white] animate-[scan_2s_ease-in-out_infinite]" />
                        </div>
                     </div>
                )}

                {/* Status Overlays */}
                {scanStatus === 'processing' && (
                    <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center z-20 text-white">
                        <RefreshCw className="animate-spin mb-4" size={48} />
                        <p className="font-black text-lg tracking-widest uppercase">Verifying</p>
                    </div>
                )}

                {scanStatus === 'success' && (
                    <div className="absolute inset-0 bg-green-500 flex flex-col items-center justify-center z-30 text-white p-8 text-center animate-in zoom-in duration-300">
                        <div className="bg-white/20 p-6 rounded-full mb-6">
                            <CheckCircle2 size={80} />
                        </div>
                        <h3 className="text-3xl font-black mb-2">ACCESS GRANTED</h3>
                        <p className="font-medium opacity-90">{scanMessage}</p>
                        <button onClick={() => window.location.reload()} className="mt-12 bg-white text-green-600 px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">DASHBOARD</button>
                    </div>
                )}

                {scanStatus === 'error' && (
                    <div className="absolute inset-0 bg-rose-600 flex flex-col items-center justify-center z-30 text-white p-8 text-center">
                        <XCircle size={64} className="mb-4" />
                        <h3 className="text-2xl font-black mb-2">SCAN ERROR</h3>
                        <p className="text-sm font-medium opacity-90 mb-8">{scanMessage}</p>
                        <button onClick={() => startCamera()} className="bg-white text-rose-600 px-8 py-3 rounded-2xl font-black text-sm">TRY AGAIN</button>
                    </div>
                )}
                
                {scanStatus === 'scanning' && (
                    <button onClick={toggleCamera} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-xl p-4 rounded-full text-white border border-white/30 hover:bg-white/40 transition-all z-20">
                        <SwitchCamera size={24} />
                    </button>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0%, 100% { top: 0%; }
                    50% { top: 100%; }
                }
            `}</style>
        </div>
      )}
    </div>
  );
};

export default QRAuth;