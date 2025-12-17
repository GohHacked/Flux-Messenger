import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { Save, User, AtSign, Image as ImageIcon, LogOut } from 'lucide-react';
import { auth } from '../firebase';

interface SettingsProps {
  currentUser: UserProfile;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName,
        username, // Note: In a real app, we would need to check uniqueness again before updating
        photoURL
      });
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error(error);
      setMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-24"
    >
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>

        <div className="flex flex-col items-center mb-8">
            <div className="relative">
                <img 
                    src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} 
                    alt="Avatar" 
                    className="w-24 h-24 rounded-full border-4 border-slate-700 bg-slate-800 object-cover"
                />
                <div className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full border-2 border-slate-900">
                    <ImageIcon className="w-4 h-4 text-white" />
                </div>
            </div>
        </div>

        <div className="space-y-5">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <User className="w-4 h-4" /> Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <AtSign className="w-4 h-4" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <ImageIcon className="w-4 h-4" /> Avatar URL
            </label>
            <input
              type="text"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-2">Paste a direct link to an image.</p>
          </div>

          {msg && (
            <div className={`text-sm text-center p-2 rounded-lg ${msg.includes('Failed') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {msg}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {saving ? <span className="animate-pulse">Saving...</span> : (
              <>
                <Save className="w-5 h-5" /> Save Changes
              </>
            )}
          </button>
          
           <button
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-slate-700 text-red-400 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700 mt-8"
          >
             <LogOut className="w-5 h-5" /> Log Out
          </button>
        </div>
      </div>
    </motion.div>
  );
};
