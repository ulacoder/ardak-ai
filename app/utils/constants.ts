// API Configuration
export const API_CONFIG = {
  GEMINI_MODEL: 'gemini-2.0-flash-exp',
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7,
} as const;

// Speech Recognition Settings
export const SPEECH_CONFIG = {
  LANG: 'en-US',
  CONTINUOUS: true,
  INTERIM_RESULTS: true,
  MAX_ALTERNATIVES: 1,
} as const;

// UI Constants
export const UI_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  TYPING_SPEED: 50,
  AUTO_SCROLL_THRESHOLD: 100,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  SPEECH_NOT_SUPPORTED: 'Speech recognition is not supported in your browser',
  API_ERROR: 'Failed to get AI response. Please try again.',
  IMAGE_TOO_LARGE: 'Image size must be less than 5MB',
  INVALID_IMAGE_TYPE: 'Only JPEG and PNG images are supported',
} as const;
