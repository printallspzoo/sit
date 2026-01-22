
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PublicLayout from './components/public/PublicLayout';
import Dashboard from './pages/Dashboard';
import QRAuth from './pages/QRAuth';
import Reports from './pages/Reports';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Documents from './pages/Documents';
import VideoRecorder from './pages/VideoRecorder';
import TerminalView from './pages/TerminalView';
import DeviceRegistrationScreen from './pages/DeviceRegistrationScreen';
import DataWiping from './pages/DataWiping'; 
import Teardown from './pages/Teardown'; 
import RepairAdvisor from './pages/RepairAdvisor'; 
import RepairQueue from './pages/RepairQueue';
import BuybackRequestsPage from './pages/BuybackRequestsPage';
import CRM from './pages/CRM';
import IncomingGoods from './pages/IncomingGoods';
import BulkRegistration from './pages/BulkRegistration';
import GenericStatusPage from './pages/GenericStatusPage'; // Import new generic page

// Public Pages
import PublicHome from './pages/public/PublicHome';
import PublicShop from './pages/public/PublicShop';
import Ankauf from './pages/public/Ankauf';
import PublicRepair from './pages/public/PublicRepair';
import Impressum from './pages/public/Impressum';

import { InstallPrompt } from './components/InstallPrompt';
import { User } from './types';
import { apiGetUser, apiLogin, apiCredentialLogin, apiLogout, getBrowserDeviceId } from './services/mockBackend';
import { Gavel, Truck, Recycle, Tag, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [navParams, setNavParams] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobile, setIsMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  useEffect(() => {
    const handleResize = () => setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    window.addEventListener('resize', handleResize);
    
    const init = async () => {
      try {
        const res = await apiGetUser();
        if (res.success && res.data) {
          setUser(res.data);
          setCurrentPage('dashboard');
        }
      } catch (e) {
        console.error("Initialization failed:", e);
      } finally {
        setLoading(false);
      }
    };

    init();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (page: string, params?: any) => {
      setCurrentPage(page);
      if (params) setNavParams(params);
      else setNavParams(null);
      window.scrollTo(0, 0);
  };

  const handleLoginSuccess = (userData: User) => {
      setUser(userData);
      setCurrentPage(userData.role === 'terminal' ? 'terminal' : 'dashboard');
  };

  const handleLogout = async () => {
      await apiLogout();
      setUser(null);
      setCurrentPage('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sitrem is loading...</p>
      </div>
    );
  }

  // Terminal View Bypass
  if (user?.role === 'terminal') {
    return <TerminalView onLogout={handleLogout} />;
  }

  const renderInternalPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user!} onNavigate={handleNavigate} isDesktop={!isMobile} />;
      case 'qr': return <QRAuth user={user!} />;
      case 'incoming': return <IncomingGoods user={user!} onNavigate={handleNavigate} />;
      case 'bulk-registration': return <BulkRegistration user={user!} onNavigate={handleNavigate} />;
      case 'crm': return user?.role === 'admin' ? <CRM user={user!} /> : <Dashboard user={user!} onNavigate={handleNavigate} isDesktop={!isMobile} />;
      case 'buyback-requests': return user?.role === 'admin' ? <BuybackRequestsPage /> : <Dashboard user={user!} onNavigate={handleNavigate} isDesktop={!isMobile} />;
      case 'repair-advisor': return <RepairAdvisor onNavigate={handleNavigate} prefilledJob={navParams?.prefilledJob} prefilledQuery={navParams?.prefilledQuery} incomingId={navParams?.incomingId} />;
      case 'repair-queue': return <RepairQueue onNavigate={handleNavigate} />;
      case 'reports': return <Reports user={user!} />;
      case 'documents': return <Documents user={user!} />;
      case 'video-recorder': return <VideoRecorder />;
      case 'data-wiping': return <DataWiping user={user!} />;
      case 'teardown': return <Teardown user={user!} prefilledTitle={navParams?.prefilledTitle} />;
      case 'profile': return <Profile user={user!} onUpdate={(u) => setUser(u)} />;
      case 'admin': return user?.role === 'admin' ? <AdminPanel /> : <Dashboard user={user!} onNavigate={handleNavigate} isDesktop={!isMobile} />;
      
      // NEW PAGES
      case 'auction': return <GenericStatusPage status="auction" title="Аукціон" icon={Gavel} colorClass="text-amber-600" onNavigate={handleNavigate} />;
      case 'wholesale': return <GenericStatusPage status="wholesale" title="Опт" icon={Truck} colorClass="text-purple-600" onNavigate={handleNavigate} />;
      case 'recycle': return <GenericStatusPage status="recycle" title="Утилізація" icon={Recycle} colorClass="text-rose-600" onNavigate={handleNavigate} />;
      case 'ready_for_sale': return <GenericStatusPage status="ready_for_sale" title="Готовий на продаж" icon={Tag} colorClass="text-indigo-600" onNavigate={handleNavigate} />;
      case 'completed': return <GenericStatusPage status="completed" title="Завершено" icon={CheckCircle2} colorClass="text-green-600" onNavigate={handleNavigate} />;

      default: return <Dashboard user={user!} onNavigate={handleNavigate} isDesktop={!isMobile} />;
    }
  };

  const renderPublicPage = () => {
    switch (currentPage) {
      case 'home': return <PublicHome onNavigate={handleNavigate} />;
      case 'shop': return <PublicShop onNavigate={handleNavigate} />;
      case 'ankauf': return <Ankauf />;
      case 'repair-public': return <PublicRepair />;
      case 'impressum': return <Impressum />;
      case 'login': return <Login onLogin={() => {}} onAdminLogin={async (u, p) => {
          const res = await apiCredentialLogin(u,p);
          if (res.success && res.data) { handleLoginSuccess(res.data); return true; }
          return false;
      }} loading={isLoggingIn} />;
      default: return <PublicHome onNavigate={handleNavigate} />;
    }
  };

  return (
    user ? (
      <Layout user={user} currentPage={currentPage} onNavigate={handleNavigate} onLogout={handleLogout} isDesktop={!isMobile}>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{renderInternalPage()}</div>
        <InstallPrompt />
      </Layout>
    ) : (
      <PublicLayout currentPage={currentPage} onNavigate={handleNavigate}>
         <div className="animate-in fade-in duration-500">{renderPublicPage()}</div>
         <InstallPrompt />
      </PublicLayout>
    )
  );
};

export default App;
