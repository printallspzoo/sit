
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, TeardownJob, TeardownPart, TeardownCategory, IncomingLaptop, TeardownParamDefinition } from '../types';
import { 
    apiGetTeardownJobs, apiCreateTeardownJob, apiGetTeardownParts, apiAddTeardownPart, 
    apiDeleteTeardownPart, apiGetTeardownCategories, apiGetTeardownDefinitions, 
    apiSaveTeardownDefinition, apiGetLaptopsForTeardown, apiDeleteTeardownDefinition, apiUpdateTeardownPart, apiUpdateTeardownDefinition,
    apiGetNextTeardownSku, apiUpdateTeardownCategory, apiUpdateTeardownJobStatus, apiGetIncomingLaptopById
} from '../services/mockBackend';
import { apiUploadPhotoToSupabase } from '../services/supabaseClient';
import { apiSyncPartToBaseLinker } from '../services/baselinkerService';
import { fillTeardownSpecs } from '../services/geminiService';
import TaskTimer from '../components/TaskTimer';
import { useTranslation } from '../context/LanguageContext';
import { GoogleGenAI } from "@google/genai";
import { 
    Wrench, Plus, Save, Trash2, Cpu, Monitor, HardDrive, Keyboard, Speaker, 
    Fan, Box, Battery, Zap, ChevronRight, RefreshCw, Settings, 
    FolderOpen, ArrowLeft, ChevronDown, ShoppingCart, CheckCircle2, Barcode, Play, List, Sparkles, Database, Copy, Check, AlertCircle, Layers, Upload, FileSpreadsheet, ArrowRight, Camera, X, Image as ImageIcon, CheckCircle, Pencil, Tag, GripVertical, Type,
    Crop, Sun, RotateCcw, Brush, MousePointer2, Link, Undo2, Edit3, MoveRight, Space, Minus, AlignCenter, ChevronUp, Search, Loader2, Info, FileText, ExternalLink, Mic, Scan, CheckSquare
} from 'lucide-react';

// --- IMAGE COMPRESSION UTILS ---
const compressAndResizeImage = async (file: Blob, maxWidth: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context error"));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Compression failed"));
            }, 'image/jpeg', quality);
        };
        img.onerror = (e) => reject(e);
    });
};

const getThumbUrl = (url: string) => {
    if (!url) return '';
    // Assumes standard extension. Insert _thumb before extension.
    const lastDotIndex = url.lastIndexOf('.');
    if (lastDotIndex === -1) return url;
    return `${url.substring(0, lastDotIndex)}_thumb${url.substring(lastDotIndex)}`;
};

// --- PHOTO EDITOR COMPONENT ---
const PhotoEditor = ({ imageUrl, onSave, onClose }: { imageUrl: string, onSave: (blob: Blob) => void, onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<'view' | 'crop' | 'draw' | 'text'>('view');
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [rotation, setRotation] = useState(0);
    
    // Interaction States
    const [isDragging, setIsDragging] = useState(false); // Global drag state
    const [isDrawing, setIsDrawing] = useState(false);
    
    const [paths, setPaths] = useState<{points: {x: number, y: number}[], color: string, width: number}[]>([]);
    const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
    
    const [texts, setTexts] = useState<{x: number, y: number, text: string, color: string, size: number}[]>([]);
    const [textInput, setTextInput] = useState('');
    const [activeColor, setActiveColor] = useState('#ff0000');
    const [activeSize, setActiveSize] = useState(40);

    const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
    const [cropEnd, setCropEnd] = useState<{x: number, y: number} | null>(null);

    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        img.onload = () => {
            setOriginalImage(img);
        };
    }, [imageUrl]);

    useEffect(() => {
        if (originalImage) {
            renderCanvas();
        }
    }, [brightness, contrast, rotation, originalImage, cropStart, cropEnd, mode, paths, currentPath, texts]);

    // Added 'clean' parameter to render without UI overlays for saving
    const renderCanvas = (clean: boolean = false) => {
        const canvas = canvasRef.current;
        const img = originalImage;
        if (!canvas || !img) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset transform to identity before clearing
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Adjust canvas size to fit rotated image
        if (rotation % 180 === 0) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
        } else {
            canvas.width = img.naturalHeight;
            canvas.height = img.naturalWidth;
        }

        ctx.save();
        // 1. Draw Image with Filters
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();

        // 2. Draw Paths
        const drawPath = (points: {x: number, y: number}[], color: string, width: number) => {
            if (points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        };

        paths.forEach(p => drawPath(p.points, p.color, p.width));
        if (currentPath.length > 0) {
            drawPath(currentPath, activeColor, 10);
        }

        // 3. Draw Text
        texts.forEach(t => {
            ctx.font = `bold ${t.size}px sans-serif`;
            ctx.fillStyle = t.color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            ctx.fillText(t.text, t.x, t.y);
            ctx.shadowBlur = 0;
        });

        // 4. Draw Crop Overlay (Only if NOT clean render)
        if (!clean && mode === 'crop' && cropStart && cropEnd) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const x = Math.min(cropStart.x, cropEnd.x);
            const y = Math.min(cropStart.y, cropEnd.y);
            const w = Math.abs(cropEnd.x - cropStart.x);
            const h = Math.abs(cropEnd.y - cropStart.y);

            ctx.clearRect(x, y, w, h);
            
            // Re-draw image inside clip for brightness check
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            
            // Draw image again inside the hole so filters apply visually
            ctx.save();
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            ctx.restore();

            // Re-draw drawings inside clip
            paths.forEach(p => drawPath(p.points, p.color, p.width));
            texts.forEach(t => {
                ctx.font = `bold ${t.size}px sans-serif`;
                ctx.fillStyle = t.color;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillText(t.text, t.x, t.y);
            });

            ctx.restore();

            // Draw selection border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }
    };

    const getMousePos = (e: React.MouseEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const { x, y } = getMousePos(e);
        setIsDragging(true); // START INTERACTION

        if (mode === 'crop') {
            setCropStart({ x, y });
            setCropEnd({ x, y });
        } else if (mode === 'draw') {
            setIsDrawing(true);
            setCurrentPath([{ x, y }]);
        } else if (mode === 'text') {
            if (textInput.trim()) {
                setTexts(prev => [...prev, { x, y, text: textInput, color: activeColor, size: activeSize }]);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return; // CRITICAL FIX: Don't move if not dragging

        const { x, y } = getMousePos(e);
        if (mode === 'crop' && cropStart) {
            setCropEnd({ x, y });
        } else if (mode === 'draw' && isDrawing) {
            setCurrentPath(prev => [...prev, { x, y }]);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false); // STOP INTERACTION
        
        if (mode === 'draw' && isDrawing) {
            setIsDrawing(false);
            if (currentPath.length > 1) {
                setPaths(prev => [...prev, { points: currentPath, color: activeColor, width: 10 }]);
            }
            setCurrentPath([]);
        }
        // Note: We intentionally do NOT reset cropStart here, so the box stays visible for "Apply"
    };

    const applyCrop = (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent canvas click
        if (!cropStart || !cropEnd || !canvasRef.current) return;
        
        // Ensure coordinates are normalized
        const x = Math.min(cropStart.x, cropEnd.x);
        const y = Math.min(cropStart.y, cropEnd.y);
        const w = Math.abs(cropEnd.x - cropStart.x);
        const h = Math.abs(cropEnd.y - cropStart.y);
        
        if (w < 10 || h < 10) return;

        // Perform crop on a temporary canvas to save it as new original
        // We need to redraw the scene strictly to extract data
        renderCanvas(true); // Draw clean (without overlay)

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Extract image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if(!tempCtx) return;

        // Draw the sliced part to temp canvas
        tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        
        const newImg = new Image();
        newImg.src = tempCanvas.toDataURL();
        newImg.onload = () => {
            setOriginalImage(newImg);
            // Reset transforms for the new image base
            setRotation(0);
            setBrightness(100);
            setContrast(100);
            setPaths([]);
            setTexts([]);
            setMode('view');
            setCropStart(null);
            setCropEnd(null);
        };
    };

    const handleUndo = () => {
        if (mode === 'draw' && paths.length > 0) {
            setPaths(prev => prev.slice(0, -1));
        } else if (mode === 'text' && texts.length > 0) {
            setTexts(prev => prev.slice(0, -1));
        }
    };

    const handleSave = () => {
        if (!canvasRef.current) return;
        
        // 1. Draw clean image (no crop lines, no selection boxes)
        renderCanvas(true);
        
        // 2. Export
        canvasRef.current.toBlob((blob) => {
            if (blob) {
                onSave(blob);
            } else {
                alert("Помилка збереження (Empty Blob)");
            }
            // Restore UI (Only after we have the blob)
            renderCanvas(false);
        }, 'image/jpeg', 0.95);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-900 border-b border-gray-800 gap-4">
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <button onClick={() => { setMode('view'); setCropStart(null); }} className={`p-2 rounded-xl ${mode === 'view' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}><MousePointer2 size={20}/></button>
                    <button onClick={() => setMode('crop')} className={`p-2 rounded-xl ${mode === 'crop' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}><Crop size={20}/></button>
                    <button onClick={() => setMode('draw')} className={`p-2 rounded-xl ${mode === 'draw' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}><Brush size={20}/></button>
                    <button onClick={() => setMode('text')} className={`p-2 rounded-xl ${mode === 'text' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}><Type size={20}/></button>
                    <div className="w-[1px] h-8 bg-gray-700 mx-2"></div>
                    <button onClick={() => setRotation(r => r + 90)} className="p-2 text-gray-400 hover:text-white"><RotateCcw size={20}/></button>
                    <button onClick={handleUndo} className="p-2 text-gray-400 hover:text-white" title="Undo Last"><Undo2 size={20}/></button>
                </div>

                <div className="flex gap-4 items-center w-full md:w-auto justify-end">
                    {mode === 'text' && (
                        <div className="flex items-center gap-2 bg-gray-800 p-1.5 rounded-lg">
                            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Текст..." className="bg-gray-700 text-white px-2 py-1 rounded text-xs w-24 outline-none border border-gray-600" />
                            <input type="color" value={activeColor} onChange={(e) => setActiveColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                            <input type="number" value={activeSize} onChange={(e) => setActiveSize(Number(e.target.value))} className="w-12 bg-gray-700 text-white px-1 py-1 rounded text-xs border border-gray-600" />
                        </div>
                    )}
                    {mode === 'draw' && (
                        <div className="flex items-center gap-2 bg-gray-800 p-1.5 rounded-lg">
                            <input type="color" value={activeColor} onChange={(e) => setActiveColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                        </div>
                    )}
                    {mode === 'view' && (
                        <div className="flex gap-2 items-center text-gray-400 text-xs font-bold hidden sm:flex">
                            <Sun size={14}/>
                            <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-20 accent-indigo-500" />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-sm uppercase px-2">Скасувати</button>
                        <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-sm uppercase shadow-lg hover:bg-green-500">Зберегти</button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 bg-black cursor-crosshair">
                <canvas 
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="max-w-full max-h-[80vh] shadow-2xl border border-gray-800"
                />
            </div>

            {mode === 'crop' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 p-4 rounded-2xl flex gap-4 pointer-events-auto">
                    <p className="text-white text-xs font-bold my-auto">
                        {cropStart ? "Натисніть Застосувати" : "Виділіть область для обрізки"}
                    </p>
                    {cropStart && (
                        <button 
                            onClick={applyCrop} 
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-indigo-500 z-50"
                        >
                            Застосувати
                        </button>
                    )}
                </div>
            )}
            {mode === 'text' && !textInput && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-900/80 border border-gray-700 p-3 rounded-xl pointer-events-none">
                    <p className="text-gray-400 text-xs font-bold">Введіть текст зверху і клікніть на фото</p>
                </div>
            )}
        </div>
    );
};

interface TeardownProps {
    user: User;
    prefilledTitle?: string;
    incomingId?: string;
}

interface NamingToken {
    id: string;
    label: string;
    value: string;
    type: 'static' | 'param';
    color: string;
}

const Teardown: React.FC<TeardownProps> = ({ user, prefilledTitle, incomingId }) => {
    // ... (Existing State) ...
    const { lang } = useTranslation(); // Use global lang state
    const [activeTab, setActiveTab] = useState<'queue' | 'active' | 'settings'>('queue');
    const [queueItems, setQueueItems] = useState<IncomingLaptop[]>([]);
    const [jobs, setJobs] = useState<TeardownJob[]>([]);
    const [categories, setCategories] = useState<TeardownCategory[]>([]);
    
    const [selectedJob, setSelectedJob] = useState<TeardownJob | null>(null);
    const [parts, setParts] = useState<TeardownPart[]>([]);
    const [definitions, setDefinitions] = useState<TeardownParamDefinition[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [wizardStep, setWizardStep] = useState<'select' | 'details' | 'photos'>('select');
    const [partForms, setPartForms] = useState<Record<number, Record<string, string>>>({});
    const [processingParts, setProcessingParts] = useState(false);
    const [isAiFilling, setIsAiFilling] = useState(false);
    const [syncingPartId, setSyncingPartId] = useState<string | null>(null);

    // Search & Filtering & Tree & Laptop Details
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
    const [partsCache, setPartsCache] = useState<Record<string, TeardownPart[]>>({});
    const [loadingParts, setLoadingParts] = useState<Set<string>>(new Set());
    
    // NEW: Cache for Incoming Laptop Details
    const [laptopDetailsCache, setLaptopDetailsCache] = useState<Record<string, IncomingLaptop>>({});
    const [viewingLaptopDetails, setViewingLaptopDetails] = useState<IncomingLaptop | null>(null);

    // AI OCR & Description State
    const [activeOcrCategory, setActiveOcrCategory] = useState<number | null>(null);
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);

    // Settings State
    const [settingsCategory, setSettingsCategory] = useState<number | null>(null);
    const [settingsBlId, setSettingsBlId] = useState('');
    const [settingsCatName, setSettingsCatName] = useState(''); // NEW: For editing cat name
    const [activeNamingTemplate, setActiveNamingTemplate] = useState<NamingToken[]>([]);
    const [draggedToken, setDraggedToken] = useState<number | null>(null);
    const [customTokenText, setCustomTokenText] = useState(''); // NEW: Custom token input

    const [showParamModal, setShowParamModal] = useState(false);
    const [editingParam, setEditingParam] = useState<TeardownParamDefinition | null>(null);
    const [modalParamName, setModalParamName] = useState('');
    const [modalParamOptions, setModalParamOptions] = useState('');
    const [isSavingParam, setIsSavingParam] = useState(false);

    const [cameraModalOpen, setCameraModalOpen] = useState(false);
    const [activePartForCamera, setActivePartForCamera] = useState<TeardownPart | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const ocrVideoRef = useRef<HTMLVideoElement>(null);
    const [uploadingPartId, setUploadingPartId] = useState<string | null>(null);
    const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
    const [takenPhotosSession, setTakenPhotosSession] = useState<string[]>([]); // New for session queue

    const [editingPhoto, setEditingPhoto] = useState<{ url: string, partId: string, index: number } | null>(null);
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const [showEditPartModal, setShowEditPartModal] = useState(false);
    const [partToEdit, setPartToEdit] = useState<TeardownPart | null>(null);
    const [editPartForm, setEditPartForm] = useState<Record<string, string>>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const groupedCategories = useMemo(() => {
        const groups: Record<string, TeardownCategory[]> = {};
        categories.forEach(cat => {
            const groupName = cat.group || 'Other';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(cat);
        });
        return groups;
    }, [categories]);

    const queueItemsToDisplay = useMemo(() => {
        const activeJobIncomingIds = new Set(jobs.filter(j => j.status === 'in_progress').map(j => j.incoming_id));
        return queueItems.filter(item => 
            !activeJobIncomingIds.has(item.id) && 
            (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.includes(searchTerm))
        );
    }, [queueItems, jobs, searchTerm]);

    const activeTeardownJobs = useMemo(() => {
        return jobs.filter(j => j.status === 'in_progress' && (
            j.title.toLowerCase().includes(searchTerm.toLowerCase()) || (j.incoming_sku && j.incoming_sku.includes(searchTerm))
        ));
    }, [jobs, searchTerm]);

    useEffect(() => {
        loadInitialData();
        if (prefilledTitle && incomingId) {
            handleStartTeardown({ id: incomingId, name: prefilledTitle, sku: '' } as IncomingLaptop);
        }
    }, []);

    // NEW: Fetch laptop details when displaying active jobs
    useEffect(() => {
        const fetchMissingDetails = async () => {
            const jobsToFetch = activeTeardownJobs.filter(j => j.incoming_id && !laptopDetailsCache[j.incoming_id]);
            if (jobsToFetch.length === 0) return;

            const newDetails: Record<string, IncomingLaptop> = {};
            // In a real scenario, we might want a bulk fetch, but for now loop individually (or rely on caching)
            for (const job of jobsToFetch) {
                if (!job.incoming_id) continue;
                try {
                    const res = await apiGetIncomingLaptopById(job.incoming_id);
                    if (res.success && res.data) {
                        newDetails[job.incoming_id] = res.data;
                    }
                } catch (e) { console.error("Error fetching laptop details", e); }
            }
            
            if (Object.keys(newDetails).length > 0) {
                setLaptopDetailsCache(prev => ({ ...prev, ...newDetails }));
            }
        };
        
        if (activeTab === 'active' && activeTeardownJobs.length > 0) {
            fetchMissingDetails();
        }
    }, [activeTeardownJobs, activeTab]);

    // ... (Existing helper functions, handlers, etc.) ...
    const getLocalized = (str: string) => {
        if(!str) return '';
        if(!str.includes('|')) return str;
        const parts = str.split('|').map(s => s.trim());
        if(parts.length < 3) return str;
        if(lang === 'de') return parts[0];
        if(lang === 'en') return parts[1];
        return parts[2];
    };

    const loadInitialData = async () => {
        setLoading(true);
        const [qRes, jRes, cRes] = await Promise.all([
            apiGetLaptopsForTeardown(),
            apiGetTeardownJobs(),
            apiGetTeardownCategories()
        ]);
        if (qRes.success) setQueueItems(qRes.data || []);
        if (jRes.success) setJobs(jRes.data || []);
        if (cRes.success) setCategories(cRes.data || []);
        setLoading(false);
    };

    const toggleJobTree = async (jobId: string) => {
        const newSet = new Set(expandedJobs);
        if (newSet.has(jobId)) {
            newSet.delete(jobId);
        } else {
            newSet.add(jobId);
            if (!partsCache[jobId]) {
                setLoadingParts(prev => new Set(prev).add(jobId));
                const res = await apiGetTeardownParts(jobId);
                if(res.success) {
                    setPartsCache(prev => ({...prev, [jobId]: res.data || []}));
                }
                setLoadingParts(prev => { const n = new Set(prev); n.delete(jobId); return n; });
            }
        }
        setExpandedJobs(newSet);
    };

    // NOTE: Copying existing logic but ensuring handleEditPart works from tree view
    // ... [omitted existing standard handlers for brevity, assuming they are unchanged unless specified] ...

    const handleStartTeardown = async (laptop: IncomingLaptop) => {
        // ... (standard logic)
        try {
            let job = jobs.find(j => j.incoming_id === laptop.id);
            if (!job) {
                const res = await apiCreateTeardownJob(laptop.name, user.id, laptop.id, laptop.sku);
                if (res.success && res.data) {
                    job = res.data;
                    setJobs(prev => [res.data!, ...prev]);
                } else {
                    if (res.error?.includes('duplicate') || res.error?.includes('unique')) {
                        const refreshed = await apiGetTeardownJobs();
                        if (refreshed.success && refreshed.data) {
                            setJobs(refreshed.data);
                            job = refreshed.data.find(j => j.incoming_id === laptop.id);
                        }
                    }
                    if (!job) {
                        alert("Не вдалося створити завдання: " + res.error);
                        return;
                    }
                }
            }
            if (job) {
                if (job.status !== 'in_progress') {
                    await apiUpdateTeardownJobStatus(job.id, 'in_progress');
                    job.status = 'in_progress';
                    setJobs(prev => prev.map(j => j.id === job!.id ? { ...j, status: 'in_progress' } : j));
                }

                setSelectedJob(job);
                await loadJobDetails(job.id);
                setWizardStep('select');
                setActiveTab('active');
            }
        } catch (e: any) {
            console.error("Critical error starting teardown:", e);
            alert("Критична помилка: " + e.message);
        }
    };

    const handleResumeTeardown = async (job: TeardownJob) => {
        setSelectedJob(job);
        await loadJobDetails(job.id);
        setWizardStep('select');
        setActiveTab('active');
    };

    const loadJobDetails = async (jobId: string) => {
        setLoading(true);
        const [pRes, dRes] = await Promise.all([
            apiGetTeardownParts(jobId),
            apiGetTeardownDefinitions()
        ]);
        if (pRes.success) setParts(pRes.data || []);
        if (dRes.success) setDefinitions(dRes.data || []);
        setLoading(false);
    };

    const handleProceedToDetails = async () => {
        setLoading(true);
        const dRes = await apiGetTeardownDefinitions();
        if (dRes.success) setDefinitions(dRes.data || []);
        setWizardStep('details');
        setLoading(false);
    };

    const handleCategoryToggle = (catId: number) => {
        setSelectedCategories(prev => 
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const handleParamChange = (catId: number, paramName: string, value: string) => {
        setPartForms(prev => ({
            ...prev,
            [catId]: { ...(prev[catId] || {}), [paramName]: value }
        }));
    };

    const handleAIAutoFill = async () => {
        if (!selectedJob || selectedCategories.length === 0) return;
        setIsAiFilling(true);
        try {
            const requests = selectedCategories.map(catId => {
                const cat = categories.find(c => c.id === catId);
                const defs = definitions.filter(d => d.category_id === catId);
                const fields = (defs as TeardownParamDefinition[]).map(d => d.name);
                return { id: catId, category: cat?.name || 'Unknown', fields: fields };
            });
            const filledData = await fillTeardownSpecs(selectedJob.title, requests);
            setPartForms(prev => {
                const newState = { ...prev };
                Object.entries(filledData).forEach(([catIdStr, values]) => {
                    const catId = parseInt(catIdStr);
                    newState[catId] = { ...(newState[catId] || {}), ...values };
                });
                return newState;
            });
        } catch (e) {
            console.error("AI Fill Error", e);
            alert("Помилка AI заповнення");
        } finally {
            setIsAiFilling(false);
        }
    };

    // --- Voice & OCR Logic ---
    const handleVoiceInput = (catId: number) => {
        if (!('webkitSpeechRecognition' in window)) return alert("Browser not supported");
        const rec = new (window as any).webkitSpeechRecognition();
        rec.lang = 'uk-UA';
        rec.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            setPartForms(prev => {
                const currentVal = prev[catId]?.['Description'] || '';
                return {
                    ...prev,
                    [catId]: { ...prev[catId], 'Description': currentVal ? `${currentVal} ${transcript}` : transcript }
                };
            });
        };
        rec.start();
    };

    const handleOpenOcr = async (catId: number) => {
        setActiveOcrCategory(catId);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
            });
            setStream(mediaStream);
            if (ocrVideoRef.current) {
                ocrVideoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            alert("Камера недоступна");
            setActiveOcrCategory(null);
        }
    };

    const handleOcrCapture = async () => {
        if (!ocrVideoRef.current || activeOcrCategory === null) return;
        setIsOcrProcessing(true);
        
        try {
            const video = ocrVideoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            
            const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    { 
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, 
                            { text: "Describe this laptop part in detail for a technician. Focus on label text, condition, and visual identifiers. Output in Ukrainian." }
                        ] 
                    }
                ]
            });
            
            const text = response.text || '';
            
            setPartForms(prev => {
                const currentVal = prev[activeOcrCategory]?.['Description'] || '';
                return {
                    ...prev,
                    [activeOcrCategory]: { 
                        ...prev[activeOcrCategory], 
                        'Description': currentVal ? `${currentVal}\n\n[AI SCAN]: ${text}` : text 
                    }
                };
            });
            
            // Close modal
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
                setStream(null);
            }
            setActiveOcrCategory(null);

        } catch (e) {
            console.error("OCR Error", e);
            alert("Помилка AI розпізнавання");
        } finally {
            setIsOcrProcessing(false);
        }
    };

    const handleSaveParts = async () => {
        if (!selectedJob) return;
        setProcessingParts(true);
        try {
            const skuRes = await apiGetNextTeardownSku();
            let currentSkuCounter = parseInt(skuRes.data || '9000000000');

            for (const catId of selectedCategories) {
                const category = categories.find(c => c.id === catId);
                if (!category) continue;
                
                currentSkuCounter++;
                const newSku = currentSkuCounter.toString();
                const params = partForms[catId] || {};
                const manufacturer = params['Manufacturer'] || '';
                
                let name = '';
                // Fix potential type issue by asserting to any first then to the array type
                const namingTemplate = (category as any).naming_template as string[] | undefined;

                if (namingTemplate && Array.isArray(namingTemplate) && namingTemplate.length > 0) {
                    const nameParts = namingTemplate.map((tokenId: string) => {
                        if (tokenId === 'laptop_name') return selectedJob.title;
                        if (tokenId === 'category_name') return getLocalized(category.name); // Localize cat name
                        if (tokenId === 'manufacturer') return manufacturer;
                        if (tokenId === 'sku') return newSku;
                        if (tokenId.startsWith('param:')) {
                            const paramKey = tokenId.replace('param:', '');
                            // The param key in definitions might be multilingual "Name | Name | Name"
                            // But we store the value under that key.
                            // We need to find the value using the full key.
                            const value = params[paramKey];
                            return value ? getLocalized(value) : '';
                        }
                        // Static text (custom or standard)
                        return tokenId; 
                    });
                    
                    // FIXED: Join with empty string to respect custom space blocks added in settings
                    // AND do not filter out spaces (which trim to empty string)
                    name = nameParts.filter(s => s !== null && s !== undefined).join('').trim();
                } else {
                    const localizedCat = getLocalized(category.name);
                    name = `${manufacturer || 'Generic'} ${localizedCat.split('/')[0].trim()}`;
                    const specKeys = Object.keys(params).filter(k => k !== 'Manufacturer' && k !== 'Description');
                    if (specKeys.length > 0) {
                        const firstSpec = params[specKeys[0]];
                        if (firstSpec) name += ` ${getLocalized(firstSpec)}`;
                    }
                    name += ` for ${selectedJob.title}`;
                }

                const newPart: any = {
                    jobId: selectedJob.id,
                    categoryId: catId,
                    category: category.name,
                    name: name.substring(0, 150),
                    manufacturer: manufacturer || 'Generic',
                    parameters: params,
                    sku: newSku
                };
                
                const res = await apiAddTeardownPart(newPart);
                
                if (res.success && res.data) {
                    setParts(prev => [...prev, res.data!]);
                }
            }
            alert("Запчастини збережено!");
            setSelectedCategories([]);
            setPartForms({});
            setWizardStep('photos');
        } catch (e: any) {
            console.error(e);
            alert("Помилка збереження: " + e.message);
        } finally {
            setProcessingParts(false);
        }
    };

    // ... (Camera, Upload, Sync, Edit Logic - Unchanged) ...
    // [Keeping previous implementation for handleStartCamera, startCameraStream, stopCameraStream, handleTakePhoto, handleFileUpload, uploadImage, saveEditedPhoto, toggleCameraMode, handleDeletePart, handleSyncPart, handleEditPart, handleEditFormChange, handleSaveEditedPart]
    const handleStartCamera = (part: TeardownPart) => {
        setActivePartForCamera(part);
        setCameraModalOpen(true);
        startCameraStream();
    };

    const startCameraStream = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: cameraFacingMode,
                    width: { ideal: 3840 }, // Try 4K
                    height: { ideal: 2160 },
                    // @ts-ignore - constraint not in basic types but supported
                    advanced: [{ focusMode: 'continuous' }] 
                } 
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            // Fallback for non-4k or restricted browsers
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode } });
                setStream(fallbackStream);
                if (videoRef.current) videoRef.current.srcObject = fallbackStream;
            } catch(e) {
                alert("Камера недоступна");
                setCameraModalOpen(false);
            }
        }
    };

    const stopCameraStream = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setTakenPhotosSession([]); // Clear session preview
    };

    const handleTakePhoto = async () => {
        if (!activePartForCamera || !videoRef.current) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        
        canvas.toBlob(async (blob) => {
            if (blob) {
                // Add to visual queue immediately for feedback
                const previewUrl = URL.createObjectURL(blob);
                setTakenPhotosSession(prev => [...prev, previewUrl]);
                
                await uploadImage(activePartForCamera, blob);
            }
        }, 'image/jpeg', 0.9);
    };

    // --- REWRITTEN UPLOAD LOGIC FOR RELIABILITY ---
    const handleFileUpload = async (part: TeardownPart, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploadingPartId(part.id);
        
        const files = Array.from(e.target.files) as File[];
        
        // Upload all files in parallel for speed
        const uploadPromises = files.map(async (file, i) => {
             return await uploadImage(part, file, true); // Return new url
        });

        const results = await Promise.all(uploadPromises);
        // State update handled inside uploadImage
        setUploadingPartId(null);
        e.target.value = ''; // Reset input
    };

    const uploadImage = async (part: TeardownPart, file: Blob | File, batchMode = false) => {
        if(!batchMode) setUploadingPartId(part.id);
        
        const baseName = `uploads/${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const fileNameFull = `${baseName}.jpg`;
        const fileNameThumb = `${baseName}_thumb.jpg`;

        try {
            // 1. NO COMPRESSION FOR FULL IMAGE (Per Request)
            const fullBlob = file; 
            // 2. Compress Thumb
            const thumbBlob = await compressAndResizeImage(file, 300, 0.60);

            // 3. Upload Both
            const [urlFull, urlThumb] = await Promise.all([
                apiUploadPhotoToSupabase(fullBlob, fileNameFull),
                apiUploadPhotoToSupabase(thumbBlob, fileNameThumb)
            ]);

            if (urlFull) {
                const updatedImages = [...(part.images || []), urlFull];
                setParts(prev => prev.map(p => p.id === part.id ? { ...p, images: updatedImages } : p));
                await apiUpdateTeardownPart({ id: part.id, images: updatedImages });
                return urlFull;
            }
        } catch (e) {
            console.error("Upload error", e);
        } finally {
            if(!batchMode) setUploadingPartId(null);
        }
        return null;
    };

    const saveEditedPhoto = async (blob: Blob) => {
        if (!editingPhoto) return;
        const part = parts.find(p => p.id === editingPhoto.partId);
        if (!part) return;
        setUploadingPartId(part.id);
        
        const baseName = `uploads/edited_${Date.now()}`;
        const fileNameFull = `${baseName}.jpg`;
        const fileNameThumb = `${baseName}_thumb.jpg`;

        try {
            // 1. NO RE-COMPRESSION FOR EDITED IMAGE (Per Request)
            const fullBlob = blob;
            const thumbBlob = await compressAndResizeImage(blob, 300, 0.60);

            const [publicUrl] = await Promise.all([
                apiUploadPhotoToSupabase(fullBlob, fileNameFull),
                apiUploadPhotoToSupabase(thumbBlob, fileNameThumb)
            ]);
            
            if (publicUrl) {
                const updatedImages = [...(part.images || [])];
                if (updatedImages[editingPhoto.index]) updatedImages[editingPhoto.index] = publicUrl;
                else updatedImages.push(publicUrl);
                
                // Update local state immediately with the new Full URL
                setParts(prev => prev.map(p => p.id === part.id ? { ...p, images: updatedImages } : p));
                
                // Save to DB
                await apiUpdateTeardownPart({ id: part.id, images: updatedImages });
                
                setEditingPhoto(null); // Close editor on success
            } else {
                alert("Помилка завантаження відредагованого фото.");
            }
        } catch(e) { 
            console.error(e); 
            alert("Помилка збереження.");
        }
        setUploadingPartId(null);
    };

    const toggleCameraMode = () => {
        stopCameraStream();
        setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        setTimeout(startCameraStream, 200);
    };

    const handleDeletePart = async (id: string) => {
        if (!confirm("Видалити?")) return;
        const res = await apiDeleteTeardownPart(id);
        if (res.success) setParts(prev => prev.filter(p => p.id !== id));
    };

    const handleSyncPart = async (part: TeardownPart) => {
        if (part.baselinkerId) return;
        setSyncingPartId(part.id);
        try {
            const cat = categories.find(c => c.id === part.categoryId);
            const res = await apiSyncPartToBaseLinker(part, cat?.baselinker_id);
            if (res.success && res.data) {
                const updatedPart = { ...part, baselinkerId: res.data };
                await apiUpdateTeardownPart(updatedPart);
                setParts(prev => prev.map(p => p.id === part.id ? updatedPart : p));
            } else {
                alert("Помилка синхронізації: " + res.error);
            }
        } catch (e) { alert("Критична помилка"); } finally { setSyncingPartId(null); }
    };

    const handleEditPart = (part: TeardownPart) => {
        if (part.baselinkerId) return; 
        setPartToEdit(part);
        setEditPartForm({
            name: part.name,
            manufacturer: part.manufacturer || '',
            ...part.parameters
        });
        setShowEditPartModal(true);
    };

    const handleEditFormChange = (key: string, value: string) => {
        setEditPartForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveEditedPart = async () => {
        if (!partToEdit) return;
        setIsSavingEdit(true);
        try {
            const { name, manufacturer, ...params } = editPartForm;
            const updatedPart: Partial<TeardownPart> = {
                id: partToEdit.id,
                name: name,
                manufacturer: manufacturer,
                parameters: params
            };
            const res = await apiUpdateTeardownPart(updatedPart);
            if (res.success && res.data) {
                setParts(prev => prev.map(p => p.id === partToEdit.id ? res.data! : p));
                setShowEditPartModal(false);
                setPartToEdit(null);
            } else {
                alert("Помилка оновлення: " + res.error);
            }
        } catch (e: any) {
            alert("Критична помилка: " + e.message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    // --- SETTINGS LOGIC (Unchanged) ---
    const loadCategorySettings = async (catId: number) => { 
        setLoading(true);
        const defRes = await apiGetTeardownDefinitions(catId);
        if (defRes.success) setDefinitions(defRes.data || []);
        
        const category = categories.find(c => c.id === catId);
        if (category) {
            setSettingsBlId(category.baselinker_id || '');
            setSettingsCatName(category.name); 
            // FIXED: Safe array access for naming_template
            const template: string[] = Array.isArray(category.naming_template) ? category.naming_template : [];
            const tokens: NamingToken[] = template.map((t, idx) => {
                 if (t.startsWith('param:')) {
                    const paramName = t.replace('param:', '');
                    return { id: `existing-${idx}`, value: t, label: getLocalized(paramName), type: 'param', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                }
                const map: Record<string, string> = { 'laptop_name': 'Laptop Name', 'category_name': 'Category', 'manufacturer': 'Manufacturer', 'sku': 'SKU', ' ': 'Space', '-': '-' };
                return { id: `existing-${idx}`, value: t, label: map[t] || t, type: 'static', color: 'bg-slate-100 text-slate-700 border-slate-200' };
            });
            setActiveNamingTemplate(tokens);
        }
        setLoading(false);
    };
    
    const handleSaveCategorySettings = async () => { 
        if(!settingsCategory) return;
        const val = settingsBlId.trim() === '' ? null : settingsBlId.trim();
        const template = activeNamingTemplate as NamingToken[];
        const templateStrings = template.map(t => t.value);
        const updates: any = { name: settingsCatName, baselinker_id: val, naming_template: templateStrings };
        await apiUpdateTeardownCategory(settingsCategory, updates);
        setCategories((prev: TeardownCategory[]) => prev.map(c => c.id === settingsCategory ? { ...c, ...updates } : c));
        alert("Збережено!");
    };

    const getAvailableTokens = (catId: number): NamingToken[] => {
        const staticTokens: NamingToken[] = [
            { id: 'new-1', value: 'laptop_name', label: 'Laptop Name', type: 'static', color: 'bg-slate-100 text-slate-700 border-slate-200' },
            { id: 'new-2', value: 'category_name', label: 'Category', type: 'static', color: 'bg-slate-100 text-slate-700 border-slate-200' },
            { id: 'new-3', value: 'manufacturer', label: 'Manufacturer', type: 'static', color: 'bg-slate-100 text-slate-700 border-slate-200' },
            { id: 'new-4', value: 'sku', label: 'SKU', type: 'static', color: 'bg-slate-100 text-slate-700 border-slate-200' },
        ];
        
        // Safety check for definitions
        const safeDefs = definitions || [];
        const catDefs = safeDefs.filter(d => d.category_id === catId);
        
        const paramTokens: NamingToken[] = catDefs.map((d, i) => ({
            id: `param-${d.id || i}`,
            value: `param:${d.name}`,
            label: getLocalized(d.name),
            type: 'param' as const,
            color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        }));
        return [...staticTokens, ...paramTokens];
    };

    const handleAddToken = (token: NamingToken) => { setActiveNamingTemplate(prev => [...prev, { ...token, id: `token-${Date.now()}` }]); };
    const handleAddCustomToken = (text?: string) => {
        const valueToAdd = text !== undefined ? text : customTokenText;
        if (valueToAdd.length === 0) return;
        const isSpace = valueToAdd.trim().length === 0;
        const newToken: NamingToken = {
            id: `custom-${Date.now()}`,
            value: valueToAdd,
            label: isSpace ? '[ Пробіл ]' : `"${valueToAdd}"`,
            type: 'static',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
        setActiveNamingTemplate(prev => [...prev, newToken]);
        setCustomTokenText('');
    };
    const handleRemoveToken = (index: number) => { setActiveNamingTemplate(prev => prev.filter((_, i) => i !== index)); };
    const handleDragStart = (e: React.DragEvent, index: number) => { setDraggedToken(index); e.dataTransfer.effectAllowed = "move"; };
    const handleDragOver = (e: React.DragEvent, index: number) => { 
        e.preventDefault(); 
        if (draggedToken === null || draggedToken === index) return; 
        const newOrder = [...(activeNamingTemplate as NamingToken[])]; 
        const draggedItem = newOrder[draggedToken]; 
        newOrder.splice(draggedToken, 1); 
        newOrder.splice(index, 0, draggedItem); 
        setActiveNamingTemplate(newOrder); 
        setDraggedToken(index); 
    };
    const handleDragEnd = () => setDraggedToken(null);
    const getMockPreview = () => { 
        // Fix for TS error: Property 'map' does not exist on type 'unknown'
        const template = activeNamingTemplate as NamingToken[];
        if (template.length === 0) return "Назва товару..."; 
        return template.map(t => { 
            if(t.value === 'laptop_name') return "Dell Latitude 5520"; 
            if(t.value === 'category_name') return getLocalized(categories.find(c => c.id === settingsCategory)?.name || "Category"); 
            if(t.value === 'manufacturer') return "Samsung"; 
            if(t.value === 'sku') return "9000001234"; 
            if(t.value.startsWith('param:')) return "Value"; 
            return t.value; 
        }).join(''); 
    };
    const handleOpenParamModal = (def?: TeardownParamDefinition) => { 
        setShowParamModal(true); 
        setEditingParam(def || null); 
        setModalParamName(def?.name || ''); 
        setModalParamOptions(def?.options?.join(',') || ''); 
    };
    const handleSaveParam = async () => { const opts = modalParamOptions.split(',').map(s=>s.trim()).filter(s=>s); if(editingParam) { const res = await apiUpdateTeardownDefinition({...editingParam, name: modalParamName, options: opts}); if(res.success && res.data) setDefinitions((prev: TeardownParamDefinition[]) => prev.map(d=>d.id===editingParam.id?res.data!:d)); } else { const res = await apiSaveTeardownDefinition({category_id: settingsCategory!, name: modalParamName, options: opts}); if(res.success && res.data) setDefinitions(prev => [...prev, res.data!]); } setShowParamModal(false); };
    const handleDeleteParam = async (id: string) => { await apiDeleteTeardownDefinition(id); setDefinitions(prev => prev.filter(d=>d.id!==id)); };
    const handleCopySql = () => { const sql = `-- SQL Copy`; navigator.clipboard.writeText(sql); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    return (
        <div className="max-w-6xl mx-auto pb-24 px-4 space-y-6 animate-in fade-in">
            {/* ... (Existing UI Code) ... */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                    <Wrench className="text-amber-500" size={32} /> Teardown Station
                </h1>
                <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1">
                    <button onClick={() => setActiveTab('queue')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
                        Черга ({queueItemsToDisplay.length})
                    </button>
                    <button onClick={() => setActiveTab('active')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
                        Активний розбір ({activeTeardownJobs.length})
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
                        Налаштування
                    </button>
                </div>
            </div>

            {/* Queue Tab */}
            {activeTab === 'queue' && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Очікують розбірки</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={loadInitialData} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><RefreshCw size={16}/></button>
                                <button onClick={() => setShowSqlModal(true)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><Database size={16}/></button>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Пошук по назві або SKU..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-100 transition-all"
                            />
                        </div>
                    </div>
                    {/* ... (Existing Queue Logic) ... */}
                    <div className="p-4 space-y-2">
                        {loading ? <div className="text-center py-10 text-gray-300">Завантаження...</div> : queueItemsToDisplay.length === 0 ? <div className="text-center py-20 text-gray-300 font-black uppercase text-xs">Список порожній</div> : queueItemsToDisplay.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-[2rem] border border-gray-100 hover:border-amber-200 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm font-black text-[10px]">{item.sku.slice(-4)}</div>
                                    <div>
                                        <div className="font-bold text-gray-900">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono uppercase">{item.serial_number || 'NO S/N'}</div>
                                    </div>
                                </div>
                                <button onClick={() => handleStartTeardown(item)} className="bg-amber-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2">
                                    <Play size={14} /> Start
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Tab */}
            {activeTab === 'active' && (
                <div className="space-y-6">
                    {!selectedJob ? (
                        <>
                            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-2">
                                <Search className="text-gray-400 ml-2" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Пошук активних робіт..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 bg-transparent text-sm font-bold outline-none py-2"
                                />
                            </div>

                            {activeTeardownJobs.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Незавершені роботи</h3>
                                    {activeTeardownJobs.map(job => {
                                        const isExpanded = expandedJobs.has(job.id);
                                        const jobParts = partsCache[job.id] || [];
                                        const isLoading = loadingParts.has(job.id);
                                        const laptopDetails = job.incoming_id ? laptopDetailsCache[job.incoming_id] : null;

                                        return (
                                            <div key={job.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:border-amber-200 transition-all">
                                                {/* Mobile Optimized Layout */}
                                                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                    <div className="flex items-center gap-4 w-full">
                                                        <button 
                                                            onClick={() => toggleJobTree(job.id)}
                                                            className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                                        >
                                                            {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                                        </button>
                                                        
                                                        {laptopDetails && laptopDetails.photos && laptopDetails.photos[0] && (
                                                            <div 
                                                                onClick={() => setViewingLaptopDetails(laptopDetails)}
                                                                className="w-16 h-16 shrink-0 bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-all border border-gray-200"
                                                            >
                                                                <img 
                                                                    src={getThumbUrl(laptopDetails.photos[0])} 
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = laptopDetails.photos![0];
                                                                        e.currentTarget.onerror = null;
                                                                    }}
                                                                    className="w-full h-full object-cover" 
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold text-gray-900 text-sm truncate">{job.title}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono flex flex-wrap items-center gap-2 mt-1">
                                                                {job.incoming_sku} 
                                                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">{new Date(job.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Actions Buttons - Stacked on Mobile, Row on Desktop */}
                                                    <div className="flex gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
                                                        {laptopDetails && (
                                                            <button 
                                                                onClick={() => setViewingLaptopDetails(laptopDetails)}
                                                                className="flex-1 md:flex-none p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                                                title="Деталі про ноутбук"
                                                            >
                                                                <Info size={16}/> <span className="md:hidden text-xs font-bold">Інфо</span>
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleResumeTeardown(job)} className="flex-[3] md:flex-none bg-amber-50 text-amber-600 px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-amber-100 transition-all text-center">
                                                            Продовжити
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Tree View for Parts */}
                                                {isExpanded && (
                                                    <div className="bg-gray-50 border-t border-gray-100 p-4 pl-4 md:pl-12 space-y-2 animate-in slide-in-from-top-2">
                                                        {isLoading ? (
                                                            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold py-2"><Loader2 className="animate-spin" size={14}/> Завантаження запчастин...</div>
                                                        ) : jobParts.length > 0 ? (
                                                            jobParts.map(part => (
                                                                <div key={part.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all">
                                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                        <div 
                                                                            className="w-12 h-12 bg-gray-50 rounded-lg shrink-0 border border-gray-100 overflow-hidden cursor-pointer relative group"
                                                                            onClick={() => {
                                                                                if(part.images && part.images.length > 0) {
                                                                                    setEditingPhoto({ url: part.images[0], partId: part.id, index: 0 });
                                                                                }
                                                                            }}
                                                                        >
                                                                            {part.images && part.images.length > 0 ? (
                                                                                <img 
                                                                                    src={getThumbUrl(part.images[0])} 
                                                                                    onError={(e) => {
                                                                                        e.currentTarget.src = part.images![0];
                                                                                        e.currentTarget.onerror = null;
                                                                                    }}
                                                                                    className="w-full h-full object-cover" 
                                                                                />
                                                                            ) : (
                                                                                <div className="flex items-center justify-center w-full h-full text-gray-300"><ImageIcon size={16}/></div>
                                                                            )}
                                                                            {part.images && part.images.length > 0 && (
                                                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                                                    <Pencil size={12} className="text-white"/>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                                <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">{part.sku}</span>
                                                                                <span className="text-[9px] font-bold text-amber-600 uppercase">{part.category}</span>
                                                                            </div>
                                                                            <div className="text-xs font-bold text-gray-900 truncate">{part.name}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 ml-4">
                                                                        <button onClick={() => handleEditPart(part)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors border border-gray-200 shadow-sm" title="Edit Info">
                                                                            <Edit3 size={14}/>
                                                                        </button>
                                                                        {part.baselinkerId ? (
                                                                            <div className="text-[9px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded border border-green-100">Synced</div>
                                                                        ) : (
                                                                            <div className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-100">Pending</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center py-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Ще немає розібраних частин</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
                                    <Wrench size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Немає активних розбірок</p>
                                    <button onClick={() => setActiveTab('queue')} className="mt-6 text-amber-500 font-bold text-sm hover:underline">Перейти до черги</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Wizard Header (Unchanged) */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={16}/></button>
                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Active Job</span>
                                        <span className="text-gray-400 text-[10px] font-mono">{selectedJob.incoming_sku}</span>
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900">{selectedJob.title}</h2>
                                </div>
                                <div className="flex bg-gray-50 p-1 rounded-xl">
                                    <button onClick={() => setWizardStep('select')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${wizardStep === 'select' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}>1. Категорії</button>
                                    <button onClick={() => handleProceedToDetails()} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${wizardStep === 'details' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}>2. Деталі</button>
                                    <button onClick={() => setWizardStep('photos')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${wizardStep === 'photos' ? 'bg-white shadow text-amber-600' : 'text-gray-400'}`}>3. Фото & Sync</button>
                                </div>
                            </div>

                            {/* Wizard Steps */}
                            {wizardStep === 'select' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(groupedCategories).map(([group, cats]) => (
                                        <div key={group} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">{group}</h3>
                                            <div className="space-y-2">
                                                {cats.map(cat => (
                                                    <button 
                                                        key={cat.id} 
                                                        onClick={() => handleCategoryToggle(cat.id)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedCategories.includes(cat.id) ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                                                    >
                                                        <span className="text-xs font-bold text-left">{getLocalized(cat.name)}</span>
                                                        {selectedCategories.includes(cat.id) && <CheckCircle2 size={16} className="text-amber-500" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-4">
                                        <button onClick={handleProceedToDetails} disabled={selectedCategories.length === 0} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                            Далі: Заповнити Деталі <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 'details' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-black text-gray-900">Заповнення параметрів</h3>
                                        <button onClick={handleAIAutoFill} disabled={isAiFilling} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all">
                                            {isAiFilling ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>} AI Auto-Fill
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {selectedCategories.map(catId => {
                                            const cat = categories.find(c => c.id === catId);
                                            const catDefs = definitions.filter(d => d.category_id === catId);
                                            return (
                                                <div key={catId} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in">
                                                    <h4 className="text-sm font-black text-amber-600 uppercase mb-4 flex items-center gap-2"><Settings size={14}/> {getLocalized(cat?.name || '')}</h4>
                                                    <div className="space-y-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Manufacturer</label>
                                                            <input 
                                                                type="text" 
                                                                value={partForms[catId]?.['Manufacturer'] || ''} 
                                                                onChange={(e) => handleParamChange(catId, 'Manufacturer', e.target.value)}
                                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                                                                placeholder="Samsung, LG..."
                                                            />
                                                        </div>
                                                        
                                                        {/* --- NEW: Description with Voice & AI --- */}
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Опис / Стан (Description)</label>
                                                            <div className="relative">
                                                                <textarea 
                                                                    value={partForms[catId]?.['Description'] || ''}
                                                                    onChange={(e) => handleParamChange(catId, 'Description', e.target.value)}
                                                                    placeholder="Візуальний стан, дефекти..."
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-amber-500 transition-all resize-none h-24"
                                                                />
                                                                <div className="absolute bottom-2 right-2 flex gap-1">
                                                                    <button 
                                                                        onClick={() => handleVoiceInput(catId)}
                                                                        className="p-2 bg-white text-gray-400 hover:text-indigo-600 rounded-lg shadow-sm border border-gray-100 transition-colors"
                                                                        title="Голосовий ввід"
                                                                    >
                                                                        <Mic size={14}/>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleOpenOcr(catId)}
                                                                        className="p-2 bg-white text-gray-400 hover:text-amber-600 rounded-lg shadow-sm border border-gray-100 transition-colors"
                                                                        title="AI Розпізнавання (Фото)"
                                                                    >
                                                                        <Scan size={14}/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* -------------------------------------- */}

                                                        {catDefs.map(def => (
                                                            <div key={def.id} className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{getLocalized(def.name)}</label>
                                                                {def.options && def.options.length > 0 ? (
                                                                    <select
                                                                        value={partForms[catId]?.[def.name] || ''}
                                                                        onChange={(e) => handleParamChange(catId, def.name, e.target.value)}
                                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all appearance-none"
                                                                    >
                                                                        <option value="">Select...</option>
                                                                        {def.options.map(opt => <option key={opt} value={opt}>{getLocalized(opt)}</option>)}
                                                                    </select>
                                                                ) : (
                                                                    <input 
                                                                        type="text" 
                                                                        value={partForms[catId]?.[def.name] || ''} 
                                                                        onChange={(e) => handleParamChange(catId, def.name, e.target.value)}
                                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <button onClick={handleSaveParts} disabled={processingParts} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-green-700 transition-all flex items-center gap-2">
                                            {processingParts ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Зберегти та перейти до фото
                                        </button>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 'photos' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        {parts.map(part => (
                                            <div key={part.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-amber-200 transition-all">
                                                <div className="w-full md:w-auto overflow-x-auto flex gap-2 p-1 no-scrollbar max-w-sm">
                                                    {part.images && (part.images as string[]).map((img, idx) => (
                                                        <div key={idx} className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-200 relative group/img cursor-pointer hover:border-indigo-400 transition-colors">
                                                            <img 
                                                                src={getThumbUrl(img)} 
                                                                onError={(e) => {
                                                                    e.currentTarget.src = img;
                                                                    e.currentTarget.onerror = null;
                                                                }}
                                                                className="w-full h-full object-cover" 
                                                                onClick={() => setEditingPhoto({ url: img, partId: part.id, index: 0 })} 
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white pointer-events-none">
                                                                <Pencil size={16}/>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    <div className="w-24 h-24 bg-gray-50 rounded-2xl flex-shrink-0 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-indigo-300 hover:bg-indigo-50 transition-all relative">
                                                        <Camera size={20} className="text-gray-400"/>
                                                        <span className="text-[8px] font-black text-gray-400 uppercase">Додати</span>
                                                        <div className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm rounded-2xl transition-opacity">
                                                            <button onClick={() => handleStartCamera(part)} className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200"><Camera size={16}/></button>
                                                            <label className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 cursor-pointer">
                                                                <Upload size={16}/>
                                                                <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleFileUpload(part, e)}/>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 text-center md:text-left">
                                                    <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">{part.category}</div>
                                                    <h4 className="text-sm font-bold text-gray-900">{part.name}</h4>
                                                    <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                                                        <span className="text-[9px] bg-slate-100 px-2 py-1 rounded text-slate-700 font-bold border border-slate-200">
                                                            SKU: {part.sku || 'N/A'}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleEditPart(part)}
                                                            disabled={!!part.baselinkerId}
                                                            className={`text-[9px] px-2 py-1 rounded font-bold border flex items-center gap-1 ${!!part.baselinkerId ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                                                        >
                                                            <Edit3 size={10} /> Edit
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                                    {part.baselinkerId ? (
                                                        <div className="flex items-center justify-center gap-1 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-green-100">
                                                            <CheckCircle size={12}/> Synced: {part.baselinkerId}
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleSyncPart(part)} 
                                                            disabled={syncingPartId === part.id}
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
                                                        >
                                                            {syncingPartId === part.id ? <RefreshCw className="animate-spin" size={12}/> : <Link size={12}/>} 
                                                            Sync to BL
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeletePart(part.id)} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2">
                                                        <Trash2 size={12}/> Видалити
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* AI OCR SCANNER MODAL */}
            {activeOcrCategory !== null && (
                <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center animate-in fade-in">
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                        <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest">AI Опис (Фото)</div>
                        <button onClick={() => { setActiveOcrCategory(null); if(stream) stream.getTracks().forEach(t=>t.stop()); }} className="p-3 bg-white/10 hover:bg-rose-500 rounded-full text-white backdrop-blur-md transition-all"><X size={24} /></button>
                    </div>
                    <div className="relative w-full h-full max-w-lg overflow-hidden md:rounded-[3rem] border-x md:border-8 border-white/5">
                        <video ref={ocrVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
                            <button onClick={handleOcrCapture} disabled={isOcrProcessing} className="w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl active:scale-90 transition-all flex items-center justify-center">
                                {isOcrProcessing ? <RefreshCw className="animate-spin text-black" size={32}/> : <div className="w-full h-full border-4 border-slate-900 rounded-full" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {cameraModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col h-[100dvh] overflow-hidden animate-in fade-in">
                    <div className="relative flex-1 bg-black">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        
                        {/* Camera Header */}
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[700] bg-gradient-to-b from-black/60 to-transparent">
                            <div className="text-white text-[10px] font-black uppercase bg-indigo-600 px-4 py-2 rounded-full shadow-lg">КАМЕРА (Серійна зйомка)</div>
                            <button onClick={() => { setCameraModalOpen(false); stopCameraStream(); }} className="p-4 bg-white/20 hover:bg-rose-500 rounded-full text-white backdrop-blur-md active:scale-90 transition-all"><X size={24}/></button>
                        </div>

                        {/* Camera Footer & Controls */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 bg-gradient-to-t from-black/90 to-transparent z-[750]">
                            
                            {/* Session Preview Strip */}
                            {takenPhotosSession.length > 0 && (
                                <div className="w-full flex gap-3 overflow-x-auto pb-2 no-scrollbar px-4">
                                    {takenPhotosSession.map((url, idx) => (
                                        <img key={idx} src={url} className="h-16 w-16 object-cover rounded-lg border-2 border-white/50 shadow-md animate-in zoom-in duration-300" />
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between w-full max-w-sm px-4">
                                <button onClick={toggleCameraMode} className="p-4 bg-white/10 rounded-full text-white backdrop-blur-md"><RefreshCw size={20}/></button>
                                
                                <button onClick={handleTakePhoto} className="w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl active:scale-90 transition-all border-4 border-gray-300">
                                    <div className="w-full h-full bg-white rounded-full border-2 border-black" />
                                </button>

                                {takenPhotosSession.length > 0 ? (
                                    <button onClick={() => { setCameraModalOpen(false); stopCameraStream(); }} className="bg-emerald-500 text-white px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 active:scale-95 shadow-lg">
                                        <Check size={18}/> Готово ({takenPhotosSession.length})
                                    </button>
                                ) : <div className="w-12"></div>}
                            </div>
                        </div>
                        
                        {uploadingPartId && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-[800]">
                                <div className="text-center text-white">
                                    <RefreshCw className="animate-spin mb-4 mx-auto" size={48} />
                                    <p className="font-bold uppercase tracking-widest text-xs">Обробка та завантаження...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingPhoto && (
                <PhotoEditor 
                    imageUrl={editingPhoto.url} 
                    onSave={saveEditedPhoto} 
                    onClose={() => setEditingPhoto(null)} 
                />
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <h3 className="text-lg font-black text-gray-900">Налаштування категорії</h3>
                            <select 
                                value={settingsCategory || ''} 
                                onChange={(e) => { const id = parseInt(e.target.value); setSettingsCategory(id); loadCategorySettings(id); }}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none flex-1"
                            >
                                <option value="">Оберіть категорію...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{getLocalized(c.name)}</option>)}
                            </select>
                        </div>

                        {settingsCategory && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Назва категорії</label>
                                        <input type="text" value={settingsCatName} onChange={(e) => setSettingsCatName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">BaseLinker Category ID</label>
                                        <input type="text" value={settingsBlId} onChange={(e) => setSettingsBlId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none font-mono"/>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Шаблон назви (Naming Template)</h4>
                                    
                                    <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-2 items-center min-h-[60px]">
                                        {activeNamingTemplate.map((token, index) => (
                                            <div 
                                                key={token.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragOver={(e) => handleDragOver(e, index)}
                                                onDragEnd={handleDragEnd}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-sm ${token.color} ${draggedToken === index ? 'opacity-50' : ''}`}
                                            >
                                                <GripVertical size={12} className="text-gray-400"/>
                                                {token.label}
                                                <button onClick={() => handleRemoveToken(index)} className="hover:text-rose-500"><X size={12}/></button>
                                            </div>
                                        ))}
                                        {activeNamingTemplate.length === 0 && <span className="text-xs text-gray-400 font-bold italic ml-2">Перетягніть блоки сюди...</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Доступні блоки</p>
                                        <div className="flex flex-wrap gap-2">
                                            {settingsCategory && getAvailableTokens(settingsCategory).map(token => (
                                                <button 
                                                    key={token.id} 
                                                    onClick={() => handleAddToken(token)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:shadow-md ${token.color}`}
                                                >
                                                    + {token.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Спеціальні символи</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAddCustomToken(" ")} className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 hover:shadow-md flex items-center gap-1"><Space size={12}/> Пробіл</button>
                                            <button onClick={() => handleAddCustomToken(" - ")} className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 hover:shadow-md flex items-center gap-1"><Minus size={12}/> Тире</button>
                                            <button onClick={() => handleAddCustomToken(" / ")} className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 hover:shadow-md flex items-center gap-1">/ Слеш</button>
                                            <div className="flex items-center gap-1 ml-2">
                                                <input type="text" value={customTokenText} onChange={(e) => setCustomTokenText(e.target.value)} placeholder="Текст..." className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none"/>
                                                <button onClick={() => handleAddCustomToken()} disabled={!customTokenText} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">Додати</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-mono text-slate-600 mt-2">
                                        <span className="font-bold text-slate-400 uppercase mr-2">Preview:</span>
                                        {getMockPreview()}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Параметри категорії</h4>
                                        <button onClick={() => handleOpenParamModal()} className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">+ Додати параметр</button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {(definitions || []).filter((d: TeardownParamDefinition) => d.category_id === settingsCategory).map((def: TeardownParamDefinition) => (
                                            <div key={def.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                                                <div>
                                                    <div className="text-xs font-bold text-gray-900">{getLocalized(def.name)}</div>
                                                    <div className="text-[10px] text-gray-400 truncate max-w-xs">{(def.options && Array.isArray(def.options)) ? def.options.join(', ') : 'Free text'}</div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenParamModal(def)} className="p-1.5 bg-white border border-gray-200 rounded-lg hover:text-indigo-600"><Edit3 size={14}/></button>
                                                    <button onClick={() => handleDeleteParam(def.id!)} className="p-1.5 bg-white border border-gray-200 rounded-lg hover:text-rose-600"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(definitions || []).filter((d: TeardownParamDefinition) => d.category_id === settingsCategory).length === 0 && (
                                            <p className="text-xs text-gray-400 italic text-center py-4">Немає параметрів</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button onClick={handleSaveCategorySettings} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-green-700 transition-all flex items-center gap-2">
                                        <Save size={16}/> Зберегти налаштування
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Param Edit Modal */}
            {showParamModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-black text-gray-900 mb-6">{editingParam ? 'Редагувати параметр' : 'Новий параметр'}</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Назва (DE | EN | UA)</label>
                                <input type="text" value={modalParamName} onChange={(e) => setModalParamName(e.target.value)} placeholder="Color | Colour | Колір" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                                <p className="text-[9px] text-gray-400 px-1">Використовуйте | для перекладу</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Опції (через кому)</label>
                                <textarea value={modalParamOptions} onChange={(e) => setModalParamOptions(e.target.value)} placeholder="Red, Blue, Green..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none h-24 resize-none"/>
                                <p className="text-[9px] text-gray-400 px-1">Залиште порожнім для вільного вводу</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowParamModal(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase hover:text-gray-600">Скасувати</button>
                            <button onClick={handleSaveParam} disabled={!modalParamName} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-indigo-700 disabled:opacity-50">Зберегти</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Part Modal */}
            {showEditPartModal && partToEdit && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Редагування запчастини</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase">{partToEdit.sku}</p>
                            </div>
                            <button onClick={() => setShowEditPartModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Назва (Baselinker Name)</label>
                                <input 
                                    type="text" 
                                    value={editPartForm.name || ''} 
                                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Виробник</label>
                                <input 
                                    type="text" 
                                    value={editPartForm.manufacturer || ''} 
                                    onChange={(e) => handleEditFormChange('manufacturer', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Параметри</h4>
                                {Object.keys(editPartForm).filter(k => k !== 'name' && k !== 'manufacturer').map(key => (
                                    <div key={key} className="space-y-1 mb-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{key}</label>
                                        <input 
                                            type="text" 
                                            value={editPartForm[key]} 
                                            onChange={(e) => handleEditFormChange(key, e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 mt-4 border-t border-gray-100">
                            <button 
                                onClick={handleSaveEditedPart} 
                                disabled={isSavingEdit}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                {isSavingEdit ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                                Зберегти зміни
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Teardown;
