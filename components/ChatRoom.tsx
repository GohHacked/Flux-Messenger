import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { sendMessage } from '../services/chatService';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';

interface ChatRoomProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  chatId: string;
  onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, otherUser, chatId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to messages for this chat
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const text = inputText;
    setInputText(''); // Optimistic clear
    
    try {
      await sendMessage(chatId, text, currentUser);
    } catch (err) {
      console.error("Failed to send", err);
      setInputText(text); // Restore on failure
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 absolute inset-0 z-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <img 
            src={otherUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} 
            alt={otherUser.username}
            className="w-10 h-10 rounded-full bg-slate-700 object-cover"
          />
          <div>
            <h3 className="font-semibold text-white">{otherUser.displayName}</h3>
            <p className="text-xs text-slate-400">{otherUser.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button className="p-2 text-slate-400 hover:text-white"><Phone className="w-5 h-5"/></button>
            <button className="p-2 text-slate-400 hover:text-white"><Video className="w-5 h-5"/></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                <p>No messages yet.</p>
                <p className="text-sm">Start the conversation!</p>
            </div>
        )}
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser.uid;
          const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
            >
              <div className={`flex max-w-[80%] md:max-w-[60%] items-end gap-2`}>
                {!isMe && (
                    <div className="w-8 flex-shrink-0">
                         {showAvatar && (
                            <img 
                            src={otherUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} 
                            className="w-8 h-8 rounded-full" 
                            />
                        )}
                    </div>
                )}
                
                <div
                  className={`p-3 rounded-2xl ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!inputText.trim()}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
