import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  orderBy, 
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Message, ChatSession } from '../types';

// Helper to generate a unique Chat ID based on two user IDs
export const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

// Check if username exists
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  // Ensure we check case-insensitively if possible, but Firestore is case sensitive.
  // We enforce lowercase on creation, so we check against the exact string here.
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Create User Profile in Firestore
export const createUserProfile = async (user: UserProfile) => {
  await setDoc(doc(db, 'users', user.uid), user);
};

// Get Recent Users (Discovery Mode)
export const getRecentUsers = async (limitCount: number = 10): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserProfile);
};

// Search user by username
export const searchUserByUsername = async (username: string): Promise<UserProfile | null> => {
  // Normalize: trim, lowercase. Ensure it starts with @.
  let cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername.startsWith('@')) {
    cleanUsername = `@${cleanUsername}`;
  }
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', cleanUsername));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) return null;
  return querySnapshot.docs[0].data() as UserProfile;
};

// Send Message
export const sendMessage = async (chatId: string, text: string, sender: UserProfile) => {
  const messagesRef = collection(db, 'messages');
  await addDoc(messagesRef, {
    text,
    senderId: sender.uid,
    senderName: sender.displayName,
    chatId,
    createdAt: Date.now() // Use client time for immediate sort, could use serverTimestamp
  });

  // Update or create chat session metadata (for list view)
  const chatRef = doc(db, 'chats', chatId);
  // We simple store the last message info
  await setDoc(chatRef, {
    chatId,
    participants: chatId.split('_'),
    lastMessage: text,
    lastMessageTime: Date.now()
  }, { merge: true });
};