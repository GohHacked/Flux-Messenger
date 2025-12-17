import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Auth } from './components/Auth';
import { ChatList } from './components/ChatList';
import { ChatRoom } from './components/ChatRoom';
import { Settings } from './components/Settings';
import { UserProfile, ViewState } from './types';
import { MessageSquare, Settings as SettingsIcon, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [view, setView] = useState<ViewState>('chats');
  const [activeChat, setActiveChat] = useState<{ otherUser: UserProfile, chatId: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        // Fetch full profile from Firestore
        const docRef = doc(db, 'users', authUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
            // Fallback if firestore record missing
            console.error("Firestore profile not found");
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Presence System Logic
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    const setOnline = () => {
        updateDoc(userRef, {
            isOnline: true,
            lastSeen: Date.now()
        }).catch(e => console.error("Error setting online", e));
    };

    const setOffline = () => {
        updateDoc(userRef, {
            isOnline: false,
            lastSeen: Date.now()
        }).catch(e => console.error("Error setting offline", e));
    };

    // Set online immediately on mount
    setOnline();

    // Handle visibility change (tab switch/minimize on mobile)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            setOnline();
        } else {
            setOffline();
        }
    };

    // Handle window close
    const handleBeforeUnload = () => {
        setOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Heartbeat to keep lastSeen fresh while using app
    // FIX: Increased frequency to 30 seconds (was 60s) for more accurate "Online" detection
    const heartbeat = setInterval(() => {
        if (document.visibilityState === 'visible') {
            updateDoc(userRef, { lastSeen: Date.now() });
        }
    }, 30000); 

    return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        clearInterval(heartbeat);
        setOffline(); // Try to set offline on unmount
    };
  }, [user]);

  // Sync profile updates locally if settings change
  useEffect(() => {
    if(!user) return;
    const docRef = doc(db, 'users', user.uid);
    getDoc(docRef).then(s => {
        if(s.exists()) setUserProfile(s.data() as UserProfile);
    });
  }, [view]); 


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex justify-center overflow-hidden">
      
      {/* Mobile Container */}
      <div className="w-full max-w-md h-[100dvh] bg-slate-900 flex flex-col relative shadow-2xl border-x border-slate-800">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          
          {view === 'chats' && (
            <ChatList 
                currentUser={userProfile} 
                onSelectChat={(other, chatId) => {
                    setActiveChat({ otherUser: other, chatId });
                    setView('active_chat');
                }} 
            />
          )}

          {view === 'settings' && (
            <Settings currentUser={userProfile} />
          )}

          {view === 'active_chat' && activeChat && (
              <ChatRoom 
                currentUser={userProfile}
                initialOtherUser={activeChat.otherUser}
                chatId={activeChat.chatId}
                onBack={() => {
                    setView('chats');
                    setActiveChat(null);
                }}
              />
          )}
        </div>

        {/* Bottom Navigation (Hidden when in active chat) */}
        {view !== 'active_chat' && (
          <div className="h-20 bg-slate-800/90 backdrop-blur-lg border-t border-slate-700/50 flex justify-around items-center px-6 pb-2 absolute bottom-0 w-full z-10">
            <button 
                onClick={() => setView('chats')}
                className={`flex flex-col items-center gap-1 transition-colors ${view === 'chats'