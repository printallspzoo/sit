
import React, { useState, useRef, useEffect } from 'react';
import { Video, Download, RotateCcw, AlertCircle, CloudUpload, CheckCircle, Loader2, Package, Edit3, HardDrive } from 'lucide-react';
import { apiUploadVideo, apiGetUser } from '../services/mockBackend';
import { apiUploadToGoogleDrive, getGoogleAccessToken } from '../services/googleDriveService';

const VideoRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState(false);
  
  // DPD Label State
  const [dpdNumber, setDpdNumber] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);

  // --- Global Scanner Listener (USB Scanner / Keyboard) ---
  useEffect(() => {
    let barcodeBuffer = '';
    let timeoutId: any;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        if (e.key === 'Enter') {
            if (barcodeBuffer.length > 0) {
                setDpdNumber(barcodeBuffer);
                barcodeBuffer = '';
            }
            return;
        }

        if (e.key.length !== 1) return;
        barcodeBuffer += e.key;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            barcodeBuffer = '';
        }, 200); 
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown);
        clearTimeout(timeoutId);
    };
  }, []);

  const setupStream = async (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      try {
        await videoRef.current.play();
        setIsCameraReady(true);
      } catch (playErr) {
        console.error("Video play error:", playErr);
        setError("Не вдалося запустити відтворення відео.");
      }
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        // Try with environment-facing camera and HD resolution
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          }, 
          audio: false 
        });
        await setupStream(stream);
      } catch (envErr) {
        console.warn("Environment camera failed, falling back to any camera", envErr);
        // Fallback to any available camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        await setupStream(stream);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let msg = "Не вдалося отримати доступ до камери.";
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') msg = "Камеру не знайдено на цьому пристрої.";
      else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') msg = "Доступ до камери заборонено.";
      else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') msg = "Камера вже використовується іншим додатком.";
      
      setError(msg);
      setIsCameraReady(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const drawToCanvas = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      requestRef.current = requestAnimationFrame(drawToCanvas);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.paused || video.ended) {
      requestRef.current = requestAnimationFrame(drawToCanvas);
      return;
    }

    // Ensure canvas dimensions match video
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      
      ctx.save();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Timestamp overlay
      const now = new Date();
      const dateStr = now.toLocaleDateString('uk-UA');
      const timeStr = now.toLocaleTimeString('uk-UA');
      const fullText = `${dateStr} ${timeStr} | SITREM SECURE REC`;

      ctx.font = 'bold 24px "Inter", monospace';
      ctx.textAlign = 'right';
      
      const textWidth = ctx.measureText(fullText).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(canvas.width - textWidth - 40, canvas.height - 60, textWidth + 20, 40);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(fullText, canvas.width - 30, canvas.height - 32);
      ctx.restore();
    }
    
    requestRef.current = requestAnimationFrame(drawToCanvas);
  };

  useEffect(() => {
    if (isCameraReady) {
        requestRef.current = requestAnimationFrame(drawToCanvas);
    }
  }, [isCameraReady]);

  const handleStartRecording = () => {
    if (!canvasRef.current || !isCameraReady) {
        startCamera();
        return;
    }
    setUploadSuccess(false);
    setDriveSuccess(false);
    
    try {
        const canvasStream = canvasRef.current.captureStream(30); 
        const mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        mediaRecorderRef.current = mediaRecorder;
        const localChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            localChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(localChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedChunks(localChunks);
          setVideoUrl(url);
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (recErr: any) {
        console.error("Recording error:", recErr);
        setError("Не вдалося почати запис: " + recErr.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRetake = () => {
    setVideoUrl(null);
    setRecordedChunks([]);
    setUploadSuccess(false);
    setDriveSuccess(false);
    if (videoRef.current && streamRef.current) {
        videoRef.current.play().catch(e => console.error("Resume play failed", e));
    } else {
        startCamera();
    }
  };

  const getFormattedDate = () => {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      return `${d}-${m}-${y}`;
  };

  const generateFileName = () => {
    const cleanDpdNumber = dpdNumber.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    const dateStr = getFormattedDate();
    const filenamePrefix = cleanDpdNumber 
        ? `${cleanDpdNumber}_${dateStr}` 
        : `sitrem-record-${dateStr}_${Date.now()}`;
    return `${filenamePrefix}.webm`;
  };

  const handleCloudUpload = async () => {
    if (recordedChunks.length === 0) return;
    
    setIsUploading(true);
    try {
        const userRes = await apiGetUser();
        if (!userRes.success || !userRes.data) throw new Error("User not found");
        
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const res = await apiUploadVideo(userRes.data.id, blob, generateFileName());
        
        if (res.success) {
            setUploadSuccess(true);
        } else {
            setError(res.error || "Помилка завантаження");
        }
    } catch (err) {
        setError("Сталася помилка при завантаженні.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleDriveUpload = async () => {
      if (recordedChunks.length === 0) return;
      
      setIsDriveUploading(true);
      setError(null);

      try {
          let token = localStorage.getItem('google_access_token');
          
          if (!token) {
              try {
                  token = await getGoogleAccessToken();
                  localStorage.setItem('google_access_token', token);
              } catch (e: any) {
                  if (e.message === 'Popup window closed' || e.message?.includes('closed')) {
                      setIsDriveUploading(false);
                      return;
                  }
                  setError("Авторизацію скасовано або сталася помилка: " + (e.message || "Unknown error"));
                  setIsDriveUploading(false);
                  return;
              }
          }

          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          let res = await apiUploadToGoogleDrive(blob, generateFileName(), token);

          if (!res.success && res.error?.includes('401')) {
              try {
                  token = await getGoogleAccessToken();
                  localStorage.setItem('google_access_token', token);
                  res = await apiUploadToGoogleDrive(blob, generateFileName(), token);
              } catch (e: any) {
                  if (e.message === 'Popup window closed') {
                      setIsDriveUploading(false);
                      return;
                  }
                  setError("Не вдалося оновити сесію Google.");
                  setIsDriveUploading(false);
                  return;
              }
          }

          if (res.success) {
              setDriveSuccess(true);
              alert("Відео успішно завантажено на Google Drive!");
          } else {
              setError(res.error || "Помилка Google Drive");
          }
      } catch (err: any) {
          console.error("Drive Flow Error:", err);
          setError("Критична помилка завантаження: " + (err.message || 'Unknown'));
      } finally {
          setIsDriveUploading(false);
      }
  };

  const handleDownload = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    
    a.download = generateFileName();
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <Video className="text-rose-500" size={32} /> 
                    Відео Рекордер
                </h1>
                <p className="text-gray-500 font-medium tracking-tight">Зйомка з водяним знаком (підтримка USB-сканера)</p>
            </div>
            
            <div className={`flex flex-wrap gap-2 transition-opacity duration-300 ${videoUrl ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button 
                    onClick={handleCloudUpload}
                    disabled={isUploading || uploadSuccess}
                    className={`px-4 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl active:scale-95 text-xs ${uploadSuccess ? 'bg-green-100 text-green-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : uploadSuccess ? <CheckCircle size={16} /> : <CloudUpload size={16} />}
                    {uploadSuccess ? 'PORTAL OK' : 'НА ПОРТАЛ'}
                </button>

                <button 
                    onClick={handleDriveUpload}
                    disabled={isDriveUploading || driveSuccess}
                    className={`px-4 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl active:scale-95 text-xs ${driveSuccess ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'}`}
                >
                    {isDriveUploading ? <Loader2 size={16} className="animate-spin" /> : driveSuccess ? <CheckCircle size={16} /> : <HardDrive size={16} />}
                    {driveSuccess ? 'DRIVE OK' : 'GOOGLE DRIVE'}
                </button>

                <button 
                    onClick={handleDownload}
                    className="bg-gray-900 text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-xl active:scale-95 text-xs"
                >
                    <Download size={16} /> ФАЙЛ
                </button>
            </div>
        </div>

        <div className={`flex flex-col md:flex-row items-center justify-between p-4 md:p-6 rounded-[2rem] border transition-all gap-4 ${dpdNumber ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                <div className={`p-3 rounded-2xl transition-colors shrink-0 ${dpdNumber ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Package size={24} />
                </div>
                <div className="w-full relative group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                        Номер етикетки / Назва файлу
                    </label>
                    <input
                        type="text"
                        value={dpdNumber}
                        onChange={(e) => setDpdNumber(e.target.value)}
                        placeholder="СКАНУЙТЕ (USB)..."
                        className="w-full bg-transparent border-none p-0 text-xl font-black font-mono tracking-widest text-indigo-900 placeholder-gray-300 focus:ring-0 outline-none uppercase"
                        disabled={isRecording || !!videoUrl}
                    />
                     <div className="absolute right-0 bottom-1 text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 size={16} />
                     </div>
                </div>
            </div>
        </div>

        {error && (
             <div className="p-4 bg-rose-50 text-rose-700 text-center rounded-2xl border border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertCircle size={24} className="opacity-50" />
                    <span className="font-bold text-sm">{error}</span>
                </div>
                <button onClick={() => { startCamera(); }} className="text-xs font-black underline hover:text-rose-900 uppercase tracking-widest">Спробувати знову</button>
             </div>
        )}

        <div className="space-y-6">
            <div className="relative bg-black rounded-[3rem] overflow-hidden shadow-2xl aspect-video group border-4 border-gray-100">
                {isRecording && (
                    <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_#f43f5e]"></div>
                        <span className="text-white text-xs font-black uppercase tracking-widest">REC (MUTE)</span>
                    </div>
                )}

                {!isCameraReady && !videoUrl && !error && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/50">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin" size={32}/>
                            <p className="font-bold uppercase tracking-widest text-xs">Ініціалізація камери...</p>
                        </div>
                    </div>
                )}

                {videoUrl ? (
                    <video 
                        src={videoUrl} 
                        controls 
                        className="w-full h-full object-contain bg-black" 
                    />
                ) : (
                    <div className="w-full h-full relative">
                        <video 
                            ref={videoRef} 
                            className="hidden" 
                            playsInline 
                            muted
                        />
                        <canvas 
                            ref={canvasRef}
                            className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-center items-center gap-6">
                {!videoUrl ? (
                    !isRecording ? (
                        <button 
                            onClick={handleStartRecording}
                            disabled={!isCameraReady}
                            className={`group relative w-20 h-20 flex items-center justify-center bg-white rounded-full shadow-lg border-4 transition-all ${!isCameraReady ? 'border-gray-200 opacity-50 cursor-not-allowed' : 'border-gray-100 hover:border-rose-100'}`}
                        >
                            <div className="absolute inset-0 rounded-full bg-rose-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                            <div className="w-12 h-12 bg-rose-500 rounded-full shadow-md group-hover:scale-90 transition-transform"></div>
                        </button>
                    ) : (
                        <button 
                            onClick={handleStopRecording}
                            className="w-20 h-20 flex items-center justify-center bg-white rounded-full shadow-lg border-4 border-rose-100 transition-all"
                        >
                            <div className="w-10 h-10 bg-gray-900 rounded-xl shadow-md"></div>
                        </button>
                    )
                ) : (
                    <button 
                        onClick={handleRetake}
                        className="flex flex-col items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors group"
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                            <RotateCcw size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Перезняти</span>
                    </button>
                )}
            </div>

            <div className="text-center text-gray-400">
                <p className="text-xs font-medium">
                    {isRecording ? 'Запис відео без звуку...' : uploadSuccess || driveSuccess ? 'Відео оброблено.' : videoUrl ? 'Відео готове.' : 'Натисніть червону кнопку для запису'}
                </p>
            </div>
        </div>
    </div>
  );
};

export default VideoRecorder;
