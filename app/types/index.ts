export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp?: Date;
}

export interface ApiResponse {
  text: string;
  error?: string;
}

export interface SpeechRecognitionConfig {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export interface AudioState {
  isListening: boolean;
  isSpeaking: boolean;
  isInitialized: boolean;
}

export interface ImageUploadResult {
  dataUrl: string;
  file: File;
  compressed: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatHistory {
  chats: Chat[];
  currentChatId: string | null;
}
