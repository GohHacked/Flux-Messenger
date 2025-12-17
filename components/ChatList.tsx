import React, { useState, useEffect } from 'react';
import { UserProfile, ChatSession } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { searchUserByUsername, getChatId, getRecentUsers } from '../services/chatService';
import { Search, MessageSquare, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatListProps {
  currentUser: UserProfile;
  onSelectChat: (otherUser: UserProfile, chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ currentUser, onSelectChat }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searchError, setSearchError] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);

  // Listen to chats involved with current user
  useEffect(() => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const loadedChats = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as ChatSession;
        // Identify the other participant
        const otherUid = data.participants.find(uid => uid !== currentUser.uid);
        if (otherUid) {
            const userDoc = await getDoc(doc(db, 'users', otherUid));
            if (userDoc.exists()) {
                data.participantDetails = userDoc.data() as UserProfile;
            }
        }
        return data;
      }));
      // Sort by last message time locally
      setChats(loadedChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)));
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load Suggested Users (Recent joins)
  useEffect(() => {
    const fetchSuggestions = async () => {
        try {
            const users = await getRecentUsers(5);
            // Filter out self
            setSuggestedUsers(users.filter(u => u.uid !== currentUser.uid));
        } catch (e) {
            console.error("Failed to load recent users", e);
        }
    };
    fetchSuggestions();
  }, [currentUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const user = await searchUserByUsername(searchQuery);
      if (user) {
        if (user.uid === currentUser.uid) {
            setSearchError("You can't chat with yourself.");
        } else {
            setSearchResult(user);
        }
      } else {
        setSearchError('User not found. Make sure to use the correct @handle.');
      }
    } catch (err) {
      setSearchError('Error searching user.');
    } finally {
      setIsSearching(false);
    }
  };

  const startChat = (otherUser: UserProfile) => {
    const chatId = getChatId(currentUser.uid, otherUser.uid);
    onSelectChat(otherUser, chatId);
    setSearchQuery('');
    setSearchResult(null);
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Chats</h1>
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-8">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Find user by @handle"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-lg"
        />
        {searchQuery && (
            <button type="submit" className="absolute right-3 top-2 bg-blue-600 p-1.5 rounded-lg text-white text-xs">
                Find
            </button>
        )}
      </form>

      {/* Search Result */}
      {isSearching && (
        <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-blue-500" />
        </div>
      )}
      
      {searchError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
            {searchError}
        </div>
      )}

      {searchResult && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800/80 border border-blue-500/30 p-4 rounded-xl mb-6 shadow-xl cursor-pointer hover:bg-slate-700 transition-colors"
            onClick={() => startChat(searchResult)}
        >
            <p className="text-xs text-blue-400 font-semibold mb-2 uppercase tracking-wider">Search Result</p>
            <div className="flex items-center gap-3">
                <img 
                    src={searchResult.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchResult.username}`}
                    className="w-12 h-12 rounded-full" 
                />
                <div>
                    <p className="text-white font-semibold">{searchResult.displayName}</p>
                    <p className="text-slate-400 text-sm">{searchResult.username}</p>
                </div>
                <div className="ml-auto bg-blue-600 p-2 rounded-full">
                    <MessageSquare className="w-4 h-4 text-white" />
                </div>
            </div>
        </motion.div>
      )}

      {/* Suggested Users / Discovery (Only if not searching) */}
      {!searchResult && !isSearching && suggestedUsers.length > 0 && (
         <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-3 h-3" /> New Members
            </h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {suggestedUsers.map(user => (
                    <motion.div 
                        key={user.uid}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startChat(user)}
                        className="flex-shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer group"
                    >
                         <div className="relative">
                            <img 
                                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 group-hover:border-blue-500 transition-colors object-cover" 
                            />
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                         </div>
                         <p className="text-[10px] text-slate-300 text-center truncate w-full">{user.displayName.split(' ')[0]}</p>
                    </motion.div>
                ))}
            </div>
         </div>
      )}

      {/* Chat List */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Chats</h2>
        {chats.length === 0 && !searchResult && (
            <div className="text-center text-slate-500 mt-8 py-8 border-2 border-dashed border-slate-800 rounded-2xl">
                <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 opacity-50" />
                </div>
                <p>No active chats.</p>
                <p className="text-sm">Pick a user from above to start!</p>
            </div>
        )}
        
        {chats.map(chat => {
            const other = chat.participantDetails;
            if (!other) return null; // Loading or error

            return (
                <motion.div
                    key={chat.chatId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startChat(other)}
                    className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 cursor-pointer transition-all flex items-center gap-4"
                >
                     <img 
                        src={other.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${other.username}`}
                        className="w-12 h-12 rounded-full object-cover bg-slate-700" 
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <h3 className="text-white font-medium truncate">{other.displayName}</h3>
                            {chat.lastMessageTime && (
                                <span className="text-[10px] text-slate-500">
                                    {new Date(chat.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            )}
                        </div>
                        <p className="text-slate-400 text-sm truncate">{chat.lastMessage || <span className="italic text-slate-600">No messages yet</span>}</p>
                    </div>
                </motion.div>
            )
        })}
      </div>
    </div>
  );
};