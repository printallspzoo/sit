
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle, Clock, Timer as TimerIcon } from 'lucide-react';
import { apiGetActiveTimer, apiUpdateTimerStatus } from '../services/mockBackend';
import { TaskTimer as TimerType } from '../types';

interface TaskTimerProps {
    laptopId: string;
    taskType: string;
    userId: string;
    onComplete?: () => void;
    className?: string;
}

const TaskTimer: React.FC<TaskTimerProps> = ({ laptopId, taskType, userId, onComplete, className }) => {
    const [timer, setTimer] = useState<TimerType | null>(null);
    const [elapsedWait, setElapsedWait] = useState(0);
    const [elapsedWork, setElapsedWork] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTimer();
    }, [laptopId, taskType]);

    const loadTimer = async () => {
        setLoading(true);
        const res = await apiGetActiveTimer(laptopId, taskType);
        if (res.success && res.data) {
            setTimer(res.data);
        }
        setLoading(false);
    };

    // Ticker Effect
    useEffect(() => {
        if (!timer) return;

        const tick = () => {
            const now = Date.now();

            // Calculate Waiting Time
            if (timer.created_at) {
                const startWait = new Date(timer.created_at).getTime();
                const endWait = timer.work_started_at ? new Date(timer.work_started_at).getTime() : now;
                setElapsedWait(Math.floor((endWait - startWait) / 1000));
            }

            // Calculate Work Time
            if (timer.status === 'in_progress' && timer.last_resume_at) {
                const currentSession = Math.floor((now - new Date(timer.last_resume_at).getTime()) / 1000);
                setElapsedWork((timer.total_work_seconds || 0) + currentSession);
            } else {
                setElapsedWork(timer.total_work_seconds || 0);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const handleStart = async () => {
        if (!timer) return;
        const now = new Date().toISOString();
        const updates: Partial<TimerType> = {};
        
        // If starting for the first time
        if (!timer.work_started_at) {
            updates.work_started_at = now;
        }

        const res = await apiUpdateTimerStatus(timer.id, 'in_progress', updates);
        if (res.success && res.data) setTimer(res.data);
    };

    const handlePause = async () => {
        if (!timer) return;
        // Save current session duration to total
        const now = Date.now();
        const currentSession = timer.last_resume_at ? Math.floor((now - new Date(timer.last_resume_at).getTime()) / 1000) : 0;
        const newTotal = (timer.total_work_seconds || 0) + currentSession;

        const res = await apiUpdateTimerStatus(timer.id, 'paused', { total_work_seconds: newTotal });
        if (res.success && res.data) setTimer(res.data);
    };

    const handleComplete = async () => {
        if (!timer) return;
        if (confirm("Завершити завдання?")) {
            // Update final totals if running
            let finalTotal = timer.total_work_seconds || 0;
            if (timer.status === 'in_progress' && timer.last_resume_at) {
                const now = Date.now();
                const currentSession = Math.floor((now - new Date(timer.last_resume_at).getTime()) / 1000);
                finalTotal += currentSession;
            }

            const res = await apiUpdateTimerStatus(timer.id, 'completed', { total_work_seconds: finalTotal });
            if (res.success) {
                setTimer(null); // Hide or show completed state
                if (onComplete) onComplete();
            }
        }
    };

    const formatSeconds = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h}г ${m}хв ${s}с`;
    };

    if (loading) return <div className="text-xs text-gray-400">Loading timer...</div>;
    if (!timer) return null;

    return (
        <div className={`bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 ${className}`}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Clock size={12} /> Час очікування: <span className="text-white">{formatSeconds(elapsedWait)}</span>
                </div>
                <div className="flex items-center gap-2 text-lg font-mono font-bold text-[#16BBF8]">
                    <TimerIcon size={20} />
                    {formatSeconds(elapsedWork)}
                </div>
            </div>

            <div className="flex gap-2">
                {timer.status === 'waiting' || timer.status === 'paused' ? (
                    <button 
                        onClick={handleStart}
                        className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"
                        title={timer.status === 'paused' ? "Продовжити" : "Почати роботу"}
                    >
                        <Play size={20} fill="currentColor" />
                    </button>
                ) : (
                    <button 
                        onClick={handlePause}
                        className="bg-amber-500 hover:bg-amber-400 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"
                        title="Пауза"
                    >
                        <Pause size={20} fill="currentColor" />
                    </button>
                )}

                <button 
                    onClick={handleComplete}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"
                    title="Завершити"
                >
                    <CheckCircle size={20} />
                </button>
            </div>
        </div>
    );
};

export default TaskTimer;
