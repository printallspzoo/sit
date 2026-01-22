
import React, { useState, useEffect } from 'react';
import { User, TimeLog, DayOffRequest, Report, CompanyHoliday } from '../types';
import { 
    apiGetAllUsers, apiGetAllLogs, apiGetDayOffRequests, apiUpdateDayOffRequestStatus, 
    apiUpdateUser, apiGetReports, apiAdminCreateUser, apiAdminManualCheckOut, 
    apiGetCompanyHolidays, apiAddCompanyHoliday, apiDeleteCompanyHoliday 
} from '../services/mockBackend';
import { 
    apiGetBuybackPrices, apiUpdateBuybackPrice, apiDeleteBuybackPrice, BuybackPriceRow 
} from '../services/buybackService';
import { 
    Users, Clock, Search, Calendar, CheckCircle2, Coffee, Check, X, 
    Smartphone, RefreshCw, PlusCircle, FileText, Package, Settings, 
    UserPlus, Mail, Lock, Euro, Trash2, Save, AlertCircle, 
    Briefcase, LogOut, Pencil, ShieldAlert 
} from 'lucide-react';
import { formatDate, formatTime, calculateDuration } from '../utils/timeUtils';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'requests' | 'reports' | 'buyback'>('attendance');
  
  // Data State
  const [employees, setEmployees] = useState<User[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [requests, setRequests] = useState<DayOffRequest[]>([]);
  const [reports, setReports] = useState<(Report & { user: User })[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [buybackPrices, setBuybackPrices] = useState<BuybackPriceRow[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  
  // Modals & Actions
  const [isClosingLog, setIsClosingLog] = useState<TimeLog | null>(null);
  const [closeTime, setCloseTime] = useState('');
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  
  // User Management
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', name: '', department: 'Warehouse' });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Buyback Editing
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, viewDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
        // Always load users for mapping
        const usersRes = await apiGetAllUsers();
        if (usersRes.success) setEmployees(usersRes.data || []);

        if (activeTab === 'attendance') {
            const [lRes, hRes, rRes] = await Promise.all([
                apiGetAllLogs(), 
                apiGetCompanyHolidays(),
                apiGetDayOffRequests()
            ]);
            if (lRes.success) setLogs(lRes.data || []);
            if (hRes.success) setHolidays(hRes.data || []);
            if (rRes.success) setRequests(rRes.data || []);
        }
        if (activeTab === 'requests') {
            const res = await apiGetDayOffRequests();
            if (res.success) setRequests(res.data || []);
        }
        if (activeTab === 'reports') {
            const res = await apiGetReports();
            if (res.success) setReports(res.data || []);
        }
        if (activeTab === 'buyback') {
            const res = await apiGetBuybackPrices();
            if (res.success) setBuybackPrices(res.data || []);
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- Handlers ---

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await apiAdminCreateUser(newUserForm.email, newUserForm.password, newUserForm.name, newUserForm.department);
      if (res.success) {
          setIsCreatingUser(false);
          setNewUserForm({ email: '', password: '', name: '', department: 'Warehouse' });
          fetchData();
      } else {
          alert("Error: " + res.error);
      }
  };

  const handleUpdateUser = async () => {
      if (!editingUser) return;
      await apiUpdateUser(editingUser);
      setEditingUser(null);
      fetchData();
  };

  const handleRequestStatus = async (id: string, status: string) => {
      await apiUpdateDayOffRequestStatus(id, status);
      fetchData();
  };

  const handleAddHoliday = async () => {
      if (!newHoliday.date || !newHoliday.name) return;
      await apiAddCompanyHoliday(newHoliday.date, newHoliday.name);
      setIsAddingHoliday(false);
      setNewHoliday({ date: '', name: '' });
      fetchData();
  };

  const handleDeleteHoliday = async (id: string) => {
      if(confirm('Delete holiday?')) {
          await apiDeleteCompanyHoliday(id);
          fetchData();
      }
  };

  const handleManualCheckOut = async () => {
    if (!isClosingLog || !closeTime) return;
    const [hours, minutes] = closeTime.split(':');
    const logDate = new Date(isClosingLog.checkIn);
    logDate.setHours(parseInt(hours), parseInt(minutes), 0);
    const res = await apiAdminManualCheckOut(isClosingLog.id, logDate.toISOString());
    if (res.success) { setIsClosingLog(null); setCloseTime(''); fetchData(); }
  };

  const handlePriceFieldChange = (index: number, field: keyof BuybackPriceRow, value: any) => {
      const newPrices = [...buybackPrices];
      newPrices[index] = { ...newPrices[index], [field]: value };
      setBuybackPrices(newPrices);
  };

  const handleUpdatePrice = async (row: BuybackPriceRow) => {
      const uniqueKey = row.id || `${row.brand}-${row.model_series}`;
      setSavingId(uniqueKey);
      await apiUpdateBuybackPrice(row);
      setSavingId(null);
      setSaveSuccessId(uniqueKey);
      setTimeout(() => setSaveSuccessId(null), 2000);
  };

  const handleDeletePrice = async (id: string) => {
      if(confirm("Delete price row?")) {
          await apiDeleteBuybackPrice(id);
          fetchData();
      }
  };

  const filteredEmployees = employees.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto pb-24 animate-in fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-slate-900" size={32} /> 
              Admin Panel
          </h1>
          
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              {['attendance', 'employees', 'requests', 'reports', 'buyback'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab 
                        ? 'bg-slate-900 text-white shadow-lg' 
                        : 'bg-white text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
          
          {loading && <div className="p-10 flex justify-center"><RefreshCw className="animate-spin text-gray-300" /></div>}

          {!loading && activeTab === 'employees' && (
              <div className="p-6 md:p-8 space-y-6">
                  <div className="flex justify-between items-center">
                      <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Search employees..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none"
                          />
                      </div>
                      <button onClick={() => setIsCreatingUser(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700">
                          <UserPlus size={16} /> Add User
                      </button>
                  </div>

                  {isCreatingUser && (
                      <form onSubmit={handleCreateUser} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
                              <input required type="text" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} className="w-full p-2 rounded-lg border text-sm" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Email</label>
                              <input required type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full p-2 rounded-lg border text-sm" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Password</label>
                              <input required type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full p-2 rounded-lg border text-sm" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Department</label>
                              <select value={newUserForm.department} onChange={e => setNewUserForm({...newUserForm, department: e.target.value})} className="w-full p-2 rounded-lg border text-sm">
                                  <option>Warehouse</option><option>IT</option><option>Sales</option><option>Service</option><option>Management</option>
                              </select>
                          </div>
                          <div className="flex gap-2">
                              <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded-lg font-bold text-xs uppercase">Save</button>
                              <button type="button" onClick={() => setIsCreatingUser(false)} className="bg-gray-200 text-gray-600 p-2 rounded-lg"><X size={16}/></button>
                          </div>
                      </form>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                      {filteredEmployees.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-white border border-gray-200 overflow-hidden">
                                      <img src={u.avatarUrl} className="w-full h-full object-cover" alt={u.name} />
                                  </div>
                                  <div>
                                      <div className="font-bold text-gray-900">{u.name}</div>
                                      <div className="text-xs text-gray-500">{u.email} • {u.department}</div>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => setEditingUser(u)} className="p-2 bg-white border rounded-lg text-indigo-600 hover:bg-indigo-50"><Pencil size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {!loading && activeTab === 'attendance' && (
              <div className="p-6 md:p-8 space-y-8">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black text-gray-900">Active Sessions</h3>
                      <button onClick={fetchData} className="p-2 bg-gray-100 rounded-lg"><RefreshCw size={16}/></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {logs.filter(l => l.status === 'active').map(log => {
                          const user = employees.find(u => u.id === log.userId);
                          return (
                              <div key={log.id} className="bg-green-50 border border-green-200 p-4 rounded-2xl flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
                                          {user?.name?.[0] || '?'}
                                      </div>
                                      <div>
                                          <div className="font-bold text-green-900 text-sm">{user?.name || 'Unknown'}</div>
                                          <div className="text-xs text-green-700">{formatTime(log.checkIn)} (Active)</div>
                                      </div>
                                  </div>
                                  <button onClick={() => setIsClosingLog(log)} className="p-2 bg-white rounded-lg text-rose-500 hover:bg-rose-50 shadow-sm"><LogOut size={16}/></button>
                              </div>
                          );
                      })}
                      {logs.filter(l => l.status === 'active').length === 0 && <p className="text-gray-400 text-xs italic">No active sessions.</p>}
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-black text-gray-900">Recent Logs</h3>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead>
                                  <tr className="text-gray-400 border-b border-gray-100">
                                      <th className="pb-2 font-bold">User</th>
                                      <th className="pb-2 font-bold">Date</th>
                                      <th className="pb-2 font-bold">In</th>
                                      <th className="pb-2 font-bold">Out</th>
                                      <th className="pb-2 font-bold">Duration</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {logs.slice(0, 20).map(log => {
                                      const user = employees.find(u => u.id === log.userId);
                                      return (
                                          <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                              <td className="py-3 font-medium">{user?.name || log.userId}</td>
                                              <td className="py-3 text-gray-500">{formatDate(log.checkIn)}</td>
                                              <td className="py-3 font-mono">{formatTime(log.checkIn)}</td>
                                              <td className="py-3 font-mono">{log.checkOut ? formatTime(log.checkOut) : '-'}</td>
                                              <td className="py-3 font-bold text-indigo-600">{calculateDuration(log.checkIn, log.checkOut)}</td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {!loading && activeTab === 'buyback' && (
              <div className="p-6 md:p-8">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-gray-900">Ціни Ankauf</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                  <th className="p-4 rounded-tl-2xl">Brand</th>
                                  <th className="p-4">Model</th>
                                  <th className="p-4">RAM</th>
                                  <th className="p-4">Storage</th>
                                  <th className="p-4 text-green-600">Perfect €</th>
                                  <th className="p-4 text-blue-600">Good €</th>
                                  <th className="p-4 text-amber-600">Defect €</th>
                                  <th className="p-4 text-rose-600">Broken €</th>
                                  <th className="p-4 rounded-tr-2xl">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {buybackPrices.map((row, idx) => (
                                  <tr key={row.id || idx} className="hover:bg-gray-50">
                                      <td className="p-2"><input type="text" className="w-24 bg-transparent font-bold text-xs" value={row.brand} onChange={(e) => handlePriceFieldChange(idx, 'brand', e.target.value)} /></td>
                                      <td className="p-2"><input type="text" className="w-32 bg-transparent font-bold text-xs" value={row.model_series} onChange={(e) => handlePriceFieldChange(idx, 'model_series', e.target.value)} /></td>
                                      <td className="p-2"><input type="number" className="w-12 bg-transparent text-xs" value={row.ram_gb} onChange={(e) => handlePriceFieldChange(idx, 'ram_gb', parseInt(e.target.value))} /></td>
                                      <td className="p-2"><input type="number" className="w-12 bg-transparent text-xs" value={row.storage_gb} onChange={(e) => handlePriceFieldChange(idx, 'storage_gb', parseInt(e.target.value))} /></td>
                                      <td className="p-2"><input type="number" className="w-16 bg-green-50 border-green-100 border rounded px-1 text-xs font-bold text-green-700" value={row.price_perfect} onChange={(e) => handlePriceFieldChange(idx, 'price_perfect', parseFloat(e.target.value))} /></td>
                                      <td className="p-2"><input type="number" className="w-16 bg-blue-50 border-blue-100 border rounded px-1 text-xs font-bold text-blue-700" value={row.price_good} onChange={(e) => handlePriceFieldChange(idx, 'price_good', parseFloat(e.target.value))} /></td>
                                      <td className="p-2"><input type="number" className="w-16 bg-amber-50 border-amber-100 border rounded px-1 text-xs font-bold text-amber-700" value={row.price_defective} onChange={(e) => handlePriceFieldChange(idx, 'price_defective', parseFloat(e.target.value))} /></td>
                                      <td className="p-2"><input type="number" className="w-16 bg-rose-50 border-rose-100 border rounded px-1 text-xs font-bold text-rose-700" value={row.price_broken} onChange={(e) => handlePriceFieldChange(idx, 'price_broken', parseFloat(e.target.value))} /></td>
                                      <td className="p-2 flex gap-2">
                                          <button onClick={() => handleUpdatePrice(row)} className="p-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">
                                              {savingId === (row.id || `${row.brand}-${row.model_series}`) ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>}
                                          </button>
                                          {row.id && <button onClick={() => handleDeletePrice(row.id!)} className="p-2 bg-rose-50 text-rose-600 rounded hover:bg-rose-100"><Trash2 size={14}/></button>}
                                          {saveSuccessId === (row.id || `${row.brand}-${row.model_series}`) && <Check size={14} className="text-green-500 my-auto"/>}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {!loading && activeTab === 'requests' && (
              <div className="p-6 md:p-8 space-y-4">
                  {requests.map(req => {
                      const user = employees.find(u => u.id === req.userId);
                      return (
                          <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div>
                                  <div className="font-bold text-gray-900">{user?.name || 'Unknown'}</div>
                                  <div className="text-xs text-gray-500">{new Date(req.date).toLocaleDateString()} • {req.reason}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span>
                                  {req.status === 'pending' && (
                                      <>
                                          <button onClick={() => handleRequestStatus(req.id, 'approved')} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100"><Check size={14}/></button>
                                          <button onClick={() => handleRequestStatus(req.id, 'rejected')} className="p-2 bg-rose-50 text-rose-600 rounded hover:bg-rose-100"><X size={14}/></button>
                                      </>
                                  )}
                              </div>
                          </div>
                      );
                  })}
                  {requests.length === 0 && <p className="text-center text-gray-400 text-xs uppercase tracking-widest">No pending requests</p>}
              </div>
          )}

          {!loading && activeTab === 'reports' && (
              <div className="p-6 md:p-8 space-y-4">
                  {reports.map(rep => (
                      <div key={rep.id} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                          <div className="flex justify-between mb-2">
                              <div className="font-bold text-gray-900">{rep.user?.name}</div>
                              <div className="text-xs text-gray-500">{new Date(rep.date).toLocaleDateString()}</div>
                          </div>
                          <div className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-200 mb-3">{rep.summary}</div>
                          <div className="space-y-1">
                              {rep.entries.map((entry, i) => (
                                  <div key={i} className="flex justify-between text-xs text-gray-500">
                                      <span>{entry.task}</span>
                                      <span className="font-mono">{entry.duration}m</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
                  {reports.length === 0 && <p className="text-center text-gray-400 text-xs uppercase tracking-widest">No reports found</p>}
              </div>
          )}
      </div>

      {/* Manual Checkout Modal */}
      {isClosingLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4">Manual Checkout</h3>
                  <p className="text-sm text-gray-500 mb-4">Set checkout time for this session.</p>
                  <input 
                    type="time" 
                    value={closeTime} 
                    onChange={e => setCloseTime(e.target.value)} 
                    className="w-full p-3 border rounded-xl mb-4 font-bold text-xl text-center"
                  />
                  <div className="flex gap-2">
                      <button onClick={() => setIsClosingLog(null)} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
                      <button onClick={handleManualCheckOut} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Confirm</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
