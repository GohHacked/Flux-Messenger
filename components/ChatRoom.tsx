import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit, doc } from 'firebase/firestore';
import { sendMessage } from '../services/chatService';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Info, X, Clock, Calendar } from 'lucide-react';

interface ChatRoomProps {
  currentUser: UserProfile;
  initialOtherUser: UserProfile; 
  chatId: string;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, initialOtherUser, chatId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Real-time user data for status
  const [otherUser, setOtherUser] = useState<UserProfile>(initialOtherUser);
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  
  // Local time state to force re-evaluation of "Online" status even if DB doesn't update
  const [now, setNow] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Update local "now" every 30 seconds to catch stale online users in real-time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Listen for real-time updates to the OTHER USER'S profile
  useEffect(() => {
    const userRef = doc(db, 'users', initialOtherUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            setOtherUser(docSnap.data() as UserProfile);
        }
    });
    return () => unsubscribe();
  }, [initialOtherUser.uid]);

  // 3. Listen for messages
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;
    
    const text = inputText;
    setInputText(''); 
    setIsSending(true);
    
    try {
      await sendMessage(chatId, text, currentUser);
    } catch (err) {
      console.error("Failed to send", err);
      setInputText(text);
      alert("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // SMART STATUS CHECK
  // Even if database says "isOnline: true", we check if the heartbeat (lastSeen) is fresh.
  // If lastSeen is older than 2 minutes (120000ms), we consider them offline.
  const isUserReallyOnline = (user: UserProfile) => {
    if (!user.isOnline) return false;
    if (!user.lastSeen) return false;
    return (now - user.lastSeen) < 120000; 
  };

  const isOnline = isUserReallyOnline(otherUser);

  // Status Formatter
  const getStatusText = (user: UserProfile) => {
    if (isOnline) return "Online";
    if (!user.lastSeen) return "Offline";

    const diff = now - user.lastSeen;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 2) return "был(а) только что"; // Covers the gap between online and 2 mins
    if (minutes < 60) return `был(а) ${minutes} мин. назад`;
    if (hours < 24) {
        const timeStr = new Date(user.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return `был(а) сегодня в ${timeStr}`;
    }
    if (days < 2) return "был(а) вчера";
    
    return `был(а) ${new Date(user.lastSeen).toLocaleDateString()}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 absolute inset-0 z-20">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 shadow-sm z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300 flex-shrink-0">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {/* Clickable Header for Profile Info */}
          <div 
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
            onClick={() => setShowProfileInfo(true)}
          >
            <div className="relative flex-shrink-0">
              <img 
                src={otherUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} 
                alt={otherUser.username}
                className="w-10 h-10 rounded-full bg-slate-700 object-cover border border-slate-600"
              />
              {/* Online Indicator Dot - Uses SMART check */}
              {isOnline && (
                 <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white leading-tight truncate">{otherUser.displayName}</h3>
              <p className={`text-xs truncate ${isOnline ? 'text-blue-400 font-medium' : 'text-slate-400'}`}>
                {getStatusText(otherUser)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-900">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-3/4 text-slate-500 opacity-50">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                     <span className="text-2xl">👋</span>
                </div>
                <p>No messages yet.</p>
                <p className="text-sm">Say hello to {otherUser.displayName.split(' ')[0]}!</p>
            </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser.uid;
          const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);
          const addMarginTop = index > 0 && messages[index - 1].senderId !== msg.senderId;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${addMarginTop ? 'mt-4' : ''}`}
            >
              <div className={`flex max-w-[85%] md:max-w-[70%] items-end gap-2 group`}>
                {!isMe && (
                    <div className="w-8 flex-shrink-0">
                         {showAvatar ? (
                            <img 
                            src={otherUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} 
                            className="w-8 h-8 rounded-full shadow-md" 
                            />
                        ) : <div className="w-8" />}
                    </div>
                )}
                
                <div
                  className={`px-4 py-2.5 shadow-md break-words relative text-sm md:text-base ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  <p className={`text-[9px] mt-1 text-right opacity-70 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} className="pt-2" />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSend} className="flex gap-2 items-end bg-slate-800/50 p-1.5 rounded-[24px] border border-slate-700/50">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
              className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:ring-0 focus:outline-none resize-none max-h-32 min-h-[44px] no-scrollbar placeholder:text-slate-500"
              style={{ height: 'auto' }} 
              onInput={(e) => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className={`mb-1 mr-1 p-2.5 rounded-full transition-all duration-200 flex items-center justify-center
                ${inputText.trim() 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 transform hover:scale-105 active:scale-95' 
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
        </form>
      </div>

      {/* Profile Details Modal Overlay */}
      <AnimatePresence>
        {showProfileInfo && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
                onClick={() => setShowProfileInfo(false)}
            >
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:w-[90%] sm:max-w-sm bg-slate-800 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-700 shadow-2xl overflow-hidden"
                >
                    <div className="relative h-32 bg-gradient-to-br from-blue-600 to-purple-700">
                        <button 
                            onClick={() => setShowProfileInfo(false)}
                            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white backdrop-blur-md transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="px-6 pb-8 -mt-12 relative">
                        <img 
                             src={otherUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} 
                             className="w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-800 shadow-lg object-cover mb-4"
                        />
                        
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white">{otherUser.displayName}</h2>
                            <p className={`text-sm font-medium mt-1 ${isOnline ? 'text-blue-400' : 'text-slate-400'}`}>
                                {getStatusText(otherUser)}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Info className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Username</p>
                                    <p className="text-white font-medium text-lg">{otherUser.username}</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Calendar className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Joined</p>
                                    <p className="text-slate-300">
                                        {new Date(otherUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};