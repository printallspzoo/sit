
import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, QrCode } from 'lucide-react';
import { TimeLog } from '../types';
import { calculateDuration } from '../utils/timeUtils';

interface TimeControlsProps {
  user: any;
  activeLog: TimeLog | null;
  onUpdate: () => void;
  onNavigate: (page: string) => void;
}

const TimeControls: React.FC<TimeControlsProps> = ({ user, activeLog, onUpdate, onNavigate }) => {
  const [elapsed, setElapsed] = useState('0h 0m');

  // Timer effect to update elapsed time every minute if active
  useEffect(() => {
    let interval: any;
    
    if (activeLog && activeLog.status === 'active') {
        const updateTimer = () => {
            setElapsed(calculateDuration(activeLog.checkIn, null));
        };
        updateTimer(); // Initial call
        interval = setInterval(updateTimer, 60000); // Update every minute
    } else {
        setElapsed('0h 0m');
    }

    return () => clearInterval(interval);
  }, [activeLog]);

  const handleAction = () => {
    // Both Check In and Check Out now go through the QR scanner
    onNavigate('qr');
  };

  const isActive = !!activeLog;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Time Tracker</h3>
        <p className="text-sm font-bold text-gray-900">
          {isActive ? 'Ви зараз на зміні' : 'Робочий день не розпочато'}
        </p>
      </div>

      <div className={`text-5xl font-black tracking-tighter ${isActive ? 'text-indigo-600' : 'text-gray-200'}`}>
        {isActive ? elapsed : '00г 00хв'}
      </div>

      {isActive && (
        <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-4 py-2 rounded-full">
            <Clock size={12} />
            <span>Початок: {new Date(activeLog.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      )}

      <button
        onClick={handleAction}
        className={`
          group relative flex items-center justify-center w-full sm:w-72 h-16 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl
          ${isActive 
            ? 'bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700' 
            : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
          }
        `}
      >
        <QrCode className="mr-3 h-5 w-5" />
        {isActive ? 'Відсканувати Вихід' : 'Відсканувати Вхід'}
      </button>

      {!isActive && (
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Використовуйте QR-код терміналу Sitrem</p>
      )}
    </div>
  );
};

export default TimeControls;
