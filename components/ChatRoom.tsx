import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { sendMessage } from '../services/chatService';
import { motion } from 'framer-motion';
import { Send, ArrowLeft } from 'lucide-react';

interface ChatRoomProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  chatId: string;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, otherUser, chatId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to messages for this chat
    const messagesRef = collection(db, 'messages');
    
    // CRITICAL FIX: We removed 'orderBy' from the Firestore query.
    // Firestore requires a specific composite index for WHERE + ORDER BY.
    // By removing it, we ensure the app works immediately without console configuration.
    // We will sort the messages in the JavaScript code below instead.
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

      // Client-side sorting (Reliable fix for "messages not showing")
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputText.trim() || isSending) return;
    
    const text = inputText;
    setInputText(''); // Clear input immediately for better UX
    setIsSending(true);
    
    try {
      await sendMessage(chatId, text, currentUser);
    } catch (err) {
      console.error("Failed to send", err);
      setInputText(text); // Restore text if failed
      alert("Failed to send message. Check your connection.");
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

  return (
    <div className="flex flex-col h-full bg-slate-900 absolute inset-0 z-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="relative">
            <img 
              src={otherUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} 
              alt={otherUser.username}
              className="w-10 h-10 rounded-full bg-slate-700 object-cover border border-slate-600"
            />
            {/* Online indicator (Visual only for now) */}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
          </div>
          <div>
            <h3 className="font-semibold text-white leading-tight">{otherUser.displayName}</h3>
            <p className="text-xs text-slate-400">{otherUser.username}</p>
          </div>
        </div>
        
        {/* Call buttons removed as requested */}
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
          // Add spacing if the previous message was from a different user
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
    </div>
  );
};