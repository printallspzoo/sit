
import React from 'react';
import { Home, QrCode, FileText, LogOut, Shield, Settings, FolderOpen, Video, HardDrive, Wrench, Lightbulb, ClipboardList, ShoppingCart, TrendingUp, PackagePlus, Layers, Gavel, Truck, Recycle, Tag, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isDesktop?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, user, currentPage, onNavigate, onLogout, isDesktop }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, adminOnly: false },
    { id: 'qr', label: 'QR Pass', icon: QrCode, adminOnly: false, mobileOnly: true },
    { id: 'incoming', label: 'Прийом Товару', icon: PackagePlus, adminOnly: false },
    { id: 'bulk-registration', label: 'Масова Реєстр.', icon: Layers, adminOnly: false },
    
    // Status Pages
    { id: 'auction', label: 'Аукціон', icon: Gavel, adminOnly: false },
    { id: 'wholesale', label: 'Опт', icon: Truck, adminOnly: false },
    { id: 'recycle', label: 'Утилізація', icon: Recycle, adminOnly: false },
    { id: 'ready_for_sale', label: 'На Продаж', icon: Tag, adminOnly: false },
    { id: 'completed', label: 'Завершено', icon: CheckCircle2, adminOnly: false },

    { id: 'crm', label: 'CRM Leads', icon: TrendingUp, adminOnly: true },
    { id: 'buyback-requests', label: 'Ankauf Заявки', icon: ShoppingCart, adminOnly: true },
    { id: 'repair-advisor', label: 'Repair Advisor', icon: Lightbulb, adminOnly: false },
    { id: 'repair-queue', label: 'Repair Queue', icon: ClipboardList, adminOnly: false },
    { id: 'reports', label: 'Reports', icon: FileText, adminOnly: false },
    { id: 'documents', label: 'Documents', icon: FolderOpen, adminOnly: false },
    { id: 'video-recorder', label: 'Video Rec', icon: Video, adminOnly: false },
    { id: 'teardown', label: 'Teardown', icon: Wrench, adminOnly: false },
    { id: 'data-wiping', label: 'Data Wipe', icon: HardDrive, adminOnly: false },
    { id: 'profile', label: 'Profile', icon: Settings, adminOnly: false },
    { id: 'admin', label: 'Admin Panel', icon: Shield, adminOnly: true },
  ];

  const filteredItems = navItems.filter(item => {
    const adminCheck = !item.adminOnly || user.role === 'admin';
    const deviceCheck = !item.mobileOnly || !isDesktop;
    return adminCheck && deviceCheck;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white print:block">
      <aside className="bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 w-full md:w-64 flex-shrink-0 flex md:flex-col justify-between p-4 md:h-screen sticky top-0 z-50 print:hidden text-white overflow-y-auto no-scrollbar">
        <div className="flex items-center md:flex-col md:items-start space-x-3 md:space-x-0 md:space-y-8">
            <div className="flex items-center">
                <img 
                    src="https://sitrem.de/wp-content/uploads/2023/02/cropped-sitrem_color_logo-3-1536x367.png" 
                    alt="Sitrem" 
                    className="h-8 md:h-10 w-auto object-contain brightness-0 invert"
                />
            </div>

            <nav className="hidden md:flex flex-col w-full space-y-1">
                {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>

        <div className="flex items-center justify-between md:pt-6 md:border-t md:border-slate-800 gap-2">
             <button 
                onClick={() => onNavigate('profile')}
                className="flex items-center space-x-3 overflow-hidden text-left hover:opacity-80 transition-opacity w-full min-w-0"
             >
                <div className="relative flex-shrink-0">
                    <img src={user.avatarUrl} alt="User" className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-700" />
                </div>
                <div className="hidden md:block overflow-hidden min-w-0">
                    <p className="text-sm font-black text-white truncate tracking-tight">{user.name}</p>
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Active Member</span>
                </div>
             </button>
             
             <button onClick={onLogout} className="text-slate-500 hover:text-rose-500 p-2 rounded-lg transition-colors">
                <LogOut size={20} />
             </button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-50 overflow-x-auto no-scrollbar print:hidden">
         {filteredItems.map((item) => {
             const Icon = item.icon;
             const isActive = currentPage === item.id;
             return (
                 <button 
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex flex-col items-center space-y-1 min-w-[65px] ${isActive ? 'text-orange-500' : 'text-slate-500'}`}
                >
                    <Icon size={20} />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
                 </button>
             )
         })}
      </div>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto print:p-0 print:overflow-visible print:h-auto">
        <div className="max-w-5xl mx-auto print:max-w-none print:mx-0">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
