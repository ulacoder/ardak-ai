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
