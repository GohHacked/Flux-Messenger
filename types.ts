export interface UserProfile {
  uid: string;
  email: string;
  username: string; // The @handle
  displayName: string;
  photoURL?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  chatId: string;
}

export interface ChatSession {
  chatId: string;
  participants: string[]; // UIDs
  lastMessage?: string;
  lastMessageTime?: number;
  participantDetails?: UserProfile; // Hydrated for UI
}

export type ViewState = 'auth' | 'chats' | 'settings' | 'active_chat';
