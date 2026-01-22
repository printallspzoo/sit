
import React, { useState, useEffect, useRef } from 'react';
import { User, GoogleFile } from '../types';
import { Folder, FileText, Image as ImageIcon, Upload, ExternalLink, Search, Cloud, CheckCircle2, Loader2, Globe, LogIn, Camera, X, RefreshCw, AlertTriangle, PlayCircle } from 'lucide-react';
import { apiListGoogleDriveFiles, apiUploadToGoogleDrive, getGoogleAccessToken } from '../services/googleDriveService';

interface DocumentsProps {
  user: User;
}

const Documents: React.FC<DocumentsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'photos'>('docs');
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
        setIsAuthenticated(true);
        if (token.startsWith('demo_mode_')) setIsDemoMode(true);
        loadFiles(token);
    }
  }, []);

  const handleLogin = async () => {
      setError(null);
      setIsAuthenticating(true);
      try {
          const token = await getGoogleAccessToken();
          localStorage.setItem('google_access_token', token);
          setIsAuthenticated(true);
          setIsDemoMode(false);
          await loadFiles(token);
      } catch (e: any) {
          if (e.message !== 'Popup window closed') {
             setError("Авторизація не вдалася. " + e.message);
          }
      } finally {
          setIsAuthenticating(false);
      }
  };

  const handleDemoLogin = () => {
      const demoToken = 'demo_mode_' + Math.random().toString(36).substr(2);
      localStorage.setItem('google_access_token', demoToken);
      setIsAuthenticated(true);
      setIsDemoMode(true);
      loadFiles(demoToken);
  };

  const handleLogout = () => {
      localStorage.removeItem('google_access_token');
      setIsAuthenticated(false);
      setIsDemoMode(false);
      setFiles([]);
      setError(null);
  };

  const loadFiles = async (token: string) => {
      setLoading(true);
      setError(null);
      try {
          const res = await apiListGoogleDriveFiles(token);
          if (res.success && res.data) {
              setFiles(res.data);
          } else if (res.error?.includes('401')) {
              setIsAuthenticated(false);
              localStorage.removeItem('google_access_token');
              setError("Сесія закінчилася. Будь ласка, увійдіть знову.");
          } else {
              setError(res.error || "Помилка завантаження файлів");
          }
      } catch (e) {
          setError("Мережева помилка");
      } finally {
          setLoading(false);
      }
  };

  const startCamera = async () => {
      setShowCamera(true);
      setCapturedPhoto(null);
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'environment' }, 
              audio: false 
          });
          setCameraStream(stream);
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      } catch (err) {
          alert("Немає доступу до камери");
          setShowCamera(false);
      }
  };

  const stopCamera = () => {
      if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
      }
      setShowCamera(false);
  };

  const takePhoto = () => {
      if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setCapturedPhoto(dataUrl);
          
          if (cameraStream) {
              cameraStream.getTracks().forEach(track => track.stop());
              setCameraStream(null);
          }
      }
  };

  const uploadCapturedPhoto = async () => {
      if (!capturedPhoto) return;
      
      const token = localStorage.getItem('google_access_token');
      if (!token) {
          setError("Потрібна авторизація");
          return;
      }

      setIsUploading(true);
      try {
          const res = await fetch(capturedPhoto);
          const blob = await res.blob();
          const fileName = `SITREM_IMG_${new Date().getTime()}.jpg`;
          
          const uploadRes = await apiUploadToGoogleDrive(blob, fileName, token);
          if (uploadRes.success) {
              alert(isDemoMode ? "Демо: Фото збережено (симуляція)" : "Фото збережено на Drive!");
              stopCamera();
              loadFiles(token);
          } else {
              if (uploadRes.error?.includes('401')) {
                  handleLogout();
                  setError("Сесія закінчилася. Увійдіть знову.");
              } else {
                  alert("Помилка завантаження: " + uploadRes.error);
              }
          }
      } catch (e) {
          alert("Помилка обробки фото");
      } finally {
          setIsUploading(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      let token = localStorage.getItem('google_access_token');
      if (!token) return;

      setIsUploading(true);
      try {
          const res = await apiUploadToGoogleDrive(file, file.name, token);
          if (res.success) {
              alert(isDemoMode ? "Демо: Файл завантажено (симуляція)" : "Файл успішно завантажено!");
              loadFiles(token);
          } else {
              if (res.error?.includes('401')) {
                  handleLogout();
                  setError("Сесія закінчилася. Увійдіть знову.");
              } else {
                  alert("Помилка: " + res.error);
              }
          }
      } catch (err) {
          alert("Помилка завантаження");
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isImage = f.mimeType.startsWith('image/');
    const matchesTab = activeTab === 'docs' ? !isImage : isImage;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 px-2 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Cloud className="text-[#16BBF8]" size={32} /> 
            Sitrem Drive
          </h1>
          <p className="text-gray-500 font-medium tracking-tight">Архів документів та фото-фіксація</p>
        </div>
        
        {isAuthenticated && (
            <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                    onClick={startCamera}
                    className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                    <Camera size={18} /> Фото
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                    {isUploading ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />} Файл
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
        )}
      </header>

      {!isAuthenticated ? (
          <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl shadow-blue-900/5 text-center flex flex-col items-center gap-6">
                  <div className="bg-blue-50 p-6 rounded-full">
                      <Globe className="text-blue-600 w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                      <h2 className="text-xl font-black text-gray-900 uppercase">Потрібна авторизація</h2>
                      <p className="text-gray-500 max-w-sm mx-auto text-sm font-medium">Для доступу до корпоративного Google Drive, будь ласка, увійдіть за допомогою робочого акаунту.</p>
                  </div>
                  
                  {error && (
                      <div className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl text-xs font-bold w-full text-left space-y-2 border border-rose-100">
                          <div className="flex items-center gap-2 text-rose-700 uppercase tracking-widest">
                              <AlertTriangle size={14} /> Помилка входу
                          </div>
                          <p className="break-words">{error}</p>
                          
                          {/* Auto-detect 'API not enabled' error and show fix button */}
                          {(error.includes('disabled') || error.includes('Enable it by visiting')) && (
                              <div className="pt-2">
                                  <a 
                                    href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=381854750655"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                                  >
                                      Увімкнути Google Drive API <ExternalLink size={12} />
                                  </a>
                              </div>
                          )}

                          <div className="pt-2 border-t border-rose-100 text-[10px] text-rose-500">
                              <span className="font-black uppercase block mb-1">Для адміністратора (Google Cloud Console):</span>
                              Переконайтеся, що API увімкнено та домен додано в "Authorized JavaScript origins":
                              <code className="block bg-white p-2 rounded-lg mt-1 font-mono text-rose-700 select-all border border-rose-100 overflow-x-auto">
                                {window.location.origin}
                              </code>
                          </div>
                      </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                      <button 
                        onClick={handleLogin}
                        disabled={isAuthenticating}
                        className="flex items-center justify-center gap-3 bg-[#16BBF8] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#14a3da] transition-all shadow-xl shadow-sky-100 active:scale-95 disabled:opacity-70"
                      >
                          {isAuthenticating ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />} 
                          {isAuthenticating ? 'Авторизація...' : 'Увійти через Google'}
                      </button>
                      
                      <button 
                        onClick={handleDemoLogin}
                        className="flex items-center justify-center gap-3 bg-white text-slate-500 border-2 border-slate-100 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-slate-300 hover:text-slate-700 transition-all active:scale-95"
                      >
                          <PlayCircle size={18} /> Демо-режим
                      </button>
                  </div>
              </div>
          </div>
      ) : (
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-gray-100 overflow-hidden min-h-[400px]">
                {isDemoMode && (
                    <div className="bg-amber-100 text-amber-800 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                        <AlertTriangle size={12} /> Ви в Демо-режимі (Файли не реальні)
                    </div>
                )}
                
                <div className="flex border-b border-gray-50 bg-gray-50/50 p-1.5 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('docs')} className={`flex-1 px-8 py-4 text-xs font-black flex items-center justify-center space-x-2 transition-all rounded-2xl ${activeTab === 'docs' ? 'text-[#16BBF8] bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        <FileText size={16} /> <span>ДОКУМЕНТИ</span>
                    </button>
                    <button onClick={() => setActiveTab('photos')} className={`flex-1 px-8 py-4 text-xs font-black flex items-center justify-center space-x-2 transition-all rounded-2xl ${activeTab === 'photos' ? 'text-[#16BBF8] bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        <ImageIcon size={16} /> <span>ФОТО</span>
                    </button>
                </div>

                <div className="p-4 md:p-8">
                    <div className="flex justify-between items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Пошук за назвою..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold w-full focus:ring-2 focus:ring-[#16BBF8] outline-none transition-all" />
                        </div>
                        <button onClick={handleLogout} className="text-gray-400 hover:text-rose-500 text-[10px] font-bold uppercase tracking-widest px-2">Вийти</button>
                    </div>

                    {error && (
                        <div className="mb-6 bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                            <X size={14} className="cursor-pointer" onClick={() => setError(null)} /> {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <Loader2 size={40} className="animate-spin text-[#16BBF8]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Отримання файлів з Drive...</span>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="py-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs flex flex-col items-center gap-4 opacity-50">
                            <Folder size={64} strokeWidth={1} />
                            <span>Нічого не знайдено</span>
                        </div>
                    ) : activeTab === 'docs' ? (
                        <div className="space-y-2">
                            {filteredFiles.map(file => (
                                <div key={file.id} className="group bg-gray-50 p-4 rounded-2xl border border-transparent hover:border-[#16BBF8]/20 hover:bg-white hover:shadow-lg transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`p-3 rounded-xl shrink-0 ${file.mimeType.includes('pdf') ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-gray-900 truncate">{file.name}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{file.size} • {new Date(file.createdTime).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-300 hover:text-[#16BBF8] transition-colors"><ExternalLink size={18} /></a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredFiles.map(file => (
                                <div key={file.id} className="group relative bg-slate-50 rounded-3xl overflow-hidden aspect-square border border-gray-100 hover:border-[#16BBF8] transition-all">
                                    {file.thumbnailLink ? (
                                        <img src={file.thumbnailLink.replace('=s220', '=s800')} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" alt={file.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={32} /></div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                        <p className="text-[10px] font-black text-white truncate">{file.name}</p>
                                        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[8px] font-black text-white uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">Переглянути</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
          </div>
      )}

      {/* CAMERA MODAL */}
      {showCamera && (
          <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in">
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                  <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest">Фото-фіксація Sitrem {isDemoMode && '(DEMO)'}</div>
                  <button onClick={stopCamera} className="p-3 bg-white/10 hover:bg-rose-500 rounded-full text-white backdrop-blur-md transition-all"><X size={24} /></button>
              </div>

              {!capturedPhoto ? (
                  <div className="relative w-full h-full max-w-lg overflow-hidden md:rounded-[3rem] border-x md:border-8 border-white/5">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
                          <div className="w-full h-full border border-white/30 rounded-2xl" />
                      </div>
                      <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                          <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl active:scale-90 transition-all">
                              <div className="w-full h-full border-4 border-slate-900 rounded-full" />
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="relative w-full h-full max-w-lg flex flex-col items-center justify-center p-6 space-y-6 animate-in zoom-in duration-300">
                      <img src={capturedPhoto} className="w-full rounded-[3rem] shadow-2xl border-4 border-white/10" alt="Captured" />
                      <div className="flex gap-4 w-full">
                          <button onClick={() => setCapturedPhoto(null)} className="flex-1 py-5 bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20">Перезняти</button>
                          <button 
                            onClick={uploadCapturedPhoto} 
                            disabled={isUploading}
                            className="flex-[2] py-5 bg-[#16BBF8] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-sky-500/20 active:scale-95"
                          >
                              {isUploading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} ЗБЕРЕГТИ {isDemoMode ? '(DEMO)' : 'НА DRIVE'}
                          </button>
                      </div>
                  </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
          </div>
      )}
    </div>
  );
};

export default Documents;
