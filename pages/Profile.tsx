
import React, { useState } from 'react';
import { User } from '../types';
import { apiUpdateProfile } from '../services/mockBackend';
import { Save, Lock, Image as ImageIcon, UserCircle } from 'lucide-react';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  
  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (newPassword && newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: "New passwords don't match." });
        return;
    }
    if (newPassword && !oldPassword) {
        setMessage({ type: 'error', text: "Please enter your current password to set a new one." });
        return;
    }

    setLoading(true);

    const res = await apiUpdateProfile(user.id, {
        avatarUrl,
        password: newPassword || undefined,
        oldPassword: oldPassword || undefined
    });

    setLoading(false);

    if (res.success && res.data) {
        setMessage({ type: 'success', text: "Profile updated successfully!" });
        onUpdate(res.data);
        // Clear sensitive fields
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
    } else {
        setMessage({ type: 'error', text: res.error || "Failed to update profile." });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500">Manage your account settings and preferences.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Avatar Section */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative flex-shrink-0">
                    <img src={avatarUrl} alt="Avatar" className="h-24 w-24 rounded-full object-cover border-4 border-gray-50" />
                    <div className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 text-gray-500">
                        <ImageIcon size={14} />
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                    <input 
                        type="text" 
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
                    />
                    <p className="text-xs text-gray-400 mt-1">Paste a direct link to an image.</p>
                </div>
            </div>

            {/* General Info (Read Only) */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
                 <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <UserCircle size={16} />
                    Public Information
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                         <div className="mt-1 text-gray-800 font-medium">{user.name}</div>
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Department</label>
                         <div className="mt-1 text-gray-800 font-medium">{user.department}</div>
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                         <div className="mt-1 text-gray-800">{user.email}</div>
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
                         <div className="mt-1 text-gray-800 font-mono text-sm">{user.username || 'Not set'}</div>
                     </div>
                 </div>
            </div>

            {/* Security Section */}
            <div className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Lock size={16} />
                    Security
                </h3>
                
                <div className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input 
                            type="password" 
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
                        />
                    </div>
                </div>
            </div>

            {message && (
                <div className={`px-6 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-70 shadow-sm"
                >
                    {loading ? 'Saving...' : (
                        <>
                            <Save size={16} />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    </div>
  );
};

export default Profile;
