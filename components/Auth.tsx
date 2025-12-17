import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { checkUsernameExists, createUserProfile } from '../services/chatService';
import { UserProfile } from '../types';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowRight, Loader2, AlertCircle, Settings as SettingsIcon, Save } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // @handle
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Config State
  const [showConfig, setShowConfig] = useState(false);
  const [configJson, setConfigJson] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Auto-format username: Remove existing @, force lowercase, then add @ back
        // Forcing lowercase ensures "User" and "user" are treated as the same handle logic
        const cleanInput = username.trim().replace(/^@/, '').toLowerCase();
        const finalUsername = `@${cleanInput}`;

        // Validation
        if (cleanInput.length < 3) {
          throw new Error("Username is too short (min 3 chars)");
        }
        
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        const regex = /^[a-z0-9_]+$/;
        if (!regex.test(cleanInput)) {
            throw new Error("Username can only contain letters, numbers, and underscores.");
        }

        // Check if username taken
        const exists = await checkUsernameExists(finalUsername);
        if (exists) {
          throw new Error(`Username ${finalUsername} is already taken`);
        }

        // Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Auth Profile
        await updateProfile(user, { displayName });

        // Create Firestore Profile
        const newUser: UserProfile = {
          uid: user.uid,
          email: user.email!,
          username: finalUsername,
          displayName,
          createdAt: Date.now(),
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}` // Default avatar
        };

        await createUserProfile(newUser);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/api-key-not-valid') {
        setError('Invalid API Key. Please paste your valid Firebase Config JSON below.');
        setShowConfig(true); // Automatically open config if key is invalid
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setError('Authentication disabled. Enable "Email/Password" in Firebase Console > Authentication > Sign-in method.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Please sign in.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    try {
      const parsed = JSON.parse(configJson);
      if (!parsed.apiKey) throw new Error("Config must contain apiKey");
      localStorage.setItem('flux_firebase_config', JSON.stringify(parsed));
      window.location.reload();
    } catch (e) {
      setError("Invalid JSON. Please copy the object directly from Firebase Console.");
    }
  };

  if (showConfig) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700"
            >
                <div className="flex items-center gap-3 mb-6 text-white">
                    <SettingsIcon className="w-6 h-6 text-blue-500" />
                    <h2 className="text-xl font-bold">Firebase Configuration</h2>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    The current API key is invalid or restricted. Please paste your <b>firebaseConfig</b> object from the Firebase Console Project Settings.
                </p>
                <textarea 
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    placeholder='{
  "apiKey": "AIza...",
  "authDomain": "...",
  "projectId": "..."
}'
                    className="w-full h-48 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500 mb-4"
                />
                 {error && (
                    <p className="text-red-400 text-sm mb-4">{error}</p>
                 )}
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowConfig(false)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveConfig}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Save & Reload
                    </button>
                </div>
            </motion.div>
        </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 relative overflow-hidden"
      >
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Flux</h1>
          <p className="text-slate-400 mt-2">The future of messaging</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-red-400 text-sm">{error}</p>
                {error.includes("API Key") && (
                    <button 
                        onClick={() => setShowConfig(true)}
                        className="text-xs text-red-300 underline mt-1 hover:text-white"
                    >
                        Update Configuration
                    </button>
                )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {isRegistering && (
            <>
              <div>
                <label className="block text-slate-400 text-sm mb-1 ml-1">Username</label>
                <div className="relative">
                    <input
                    type="text"
                    placeholder="username"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-8 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    value={username.replace(/^@/, '').toLowerCase()} // Visual feedback
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    required
                    />
                    <span className="absolute left-3 top-3.5 text-slate-500">@</span>
                </div>
                <p className="text-[10px] text-slate-500 ml-1 mt-1">Lowercase letters, numbers and underscores only.</p>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1 ml-1">Display Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-slate-400 text-sm mb-1 ml-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
             {isRegistering && (
                  <p className="text-[10px] text-slate-500 ml-1 mt-1">Must be at least 6 characters.</p>
             )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {isRegistering ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center relative z-10">
          <button
            onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
            }}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            {isRegistering ? 'Already have an account? Sign In' : 'New to Flux? Create Account'}
          </button>
        </div>
        
        {/* Footer Config Trigger - Always Visible */}
        <div className="mt-8 flex justify-center">
            <button onClick={() => setShowConfig(true)} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                <SettingsIcon className="w-3 h-3" /> Setup Database Keys
            </button>
        </div>
      </motion.div>
    </div>
  );
};