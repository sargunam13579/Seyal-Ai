export type VoiceStateType = 'idle' | 'listening' | 'processing' | 'speaking';
export type VoiceStyleType = 'auto' | 'tamil_indian' | 'english';

export interface AvailableVoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender?: string;
  isNeural?: boolean;
}

export interface VoiceContextType {
  voiceState: VoiceStateType;
  isListening: boolean;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
  isProcessing: boolean;
  voiceModeEnabled: boolean;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
  autoListen: boolean;
  setAutoListen: (auto: boolean) => void;
  autoVoiceResponse: boolean;
  recognitionLang: string;
  setRecognitionLang: (lang: string) => void;
  voiceStyle: VoiceStyleType;
  selectedVoiceName: string;
  availableVoices: AvailableVoiceInfo[];
  transcript: string;
  interimTranscript: string;
  error: string | null;
  activeTurnId: number;
  speechSpeed: number;
  setSpeechSpeed: (speed: number) => void;
  setVoiceStyle: (style: VoiceStyleType) => void;
  setSelectedVoiceName: (voiceName: string) => void;
  setAutoVoiceResponse: (enabled: boolean) => void;
  setVoiceModeEnabled: (enabled: boolean) => void;
  toggleVoiceMode: () => void;
  startListening: (onFinalTranscript?: (text: string) => void, lang?: string) => void;
  startContinuousListening: () => void;
  stopListening: () => void;
  speakText: (text: string, onEnd?: () => void) => Promise<void>;
  speakInstant: (
    text: string,
    onEnd?: () => void,
    onProgress?: (revealedText: string) => void
  ) => void;
  speakAssistantResponse: (
    text: string,
    turnId: number,
    onEnd?: () => void,
    onStart?: (durationSec?: number) => void,
    onProgress?: (revealedText: string) => void,
    overrideVoiceId?: string,
    preloadedAudioBlob?: Blob | null
  ) => Promise<void>;
  preloadAssistantAudio: (text: string, overrideVoiceId?: string) => Promise<Blob | null>;
  cancelCurrentSpeech: (reason?: string) => void;
  stopSpeaking: () => void;
  isSpeechPaused: boolean;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  testVoice: (voiceName?: string) => Promise<void>;
  getNextTurnId: () => number;
  getCurrentTurnId: () => number;
  invalidateTurn: () => number;
  registerTranscriptHandler: (handler: (text: string) => void) => () => void;
  registerBargeInHandler: (handler: () => void) => () => void;
  setProcessing: (processing: boolean) => void;
}

export const LOCAL_STORAGE_VOICE_KEY = 'seyal_preferred_voice_name';
export const LOCAL_STORAGE_SPEED_KEY = 'seyal_speech_speed';
export const DEFAULT_HUMAN_SPEED = 0.88; // Relaxed, crystal-clear, natural human cadence

// Curated list of pristine, crystal-clear studio Multilingual and Regional Neural voices
export const DEFAULT_NEURAL_VOICES: AvailableVoiceInfo[] = [
  {
    id: 'en-US-AvaMultilingualNeural',
    name: 'Breeze (Universal Multilingual - Studio Female)',
    lang: 'en-US',
    gender: 'Female',
    isNeural: true,
  },
  {
    id: 'en-US-AndrewMultilingualNeural',
    name: 'Andrew (Universal Multilingual - Studio Male)',
    lang: 'en-US',
    gender: 'Male',
    isNeural: true,
  },
  {
    id: 'en-US-EmmaMultilingualNeural',
    name: 'Emma (Universal Multilingual - Expressive Female)',
    lang: 'en-US',
    gender: 'Female',
    isNeural: true,
  },
  {
    id: 'en-US-BrianMultilingualNeural',
    name: 'Brian (Universal Multilingual - Crisp Male)',
    lang: 'en-US',
    gender: 'Male',
    isNeural: true,
  },
  {
    id: 'ta-IN-PallaviNeural',
    name: 'Pallavi (Tamil Natural Neural Female)',
    lang: 'ta-IN',
    gender: 'Female',
    isNeural: true,
  },
  {
    id: 'ta-IN-ValluvarNeural',
    name: 'Valluvar (Tamil Natural Neural Male)',
    lang: 'ta-IN',
    gender: 'Male',
    isNeural: true,
  },
  {
    id: 'hi-IN-SwaraNeural',
    name: 'Swara (Hindi Natural Neural Female)',
    lang: 'hi-IN',
    gender: 'Female',
    isNeural: true,
  },
  {
    id: 'hi-IN-MadhurNeural',
    name: 'Madhur (Hindi Natural Neural Male)',
    lang: 'hi-IN',
    gender: 'Male',
    isNeural: true,
  },
  {
    id: 'ml-IN-SobhanaNeural',
    name: 'Sobhana (Malayalam Natural Neural Female)',
    lang: 'ml-IN',
    gender: 'Female',
    isNeural: true,
  },
  {
    id: 'ml-IN-MidhunNeural',
    name: 'Midhun (Malayalam Natural Neural Male)',
    lang: 'ml-IN',
    gender: 'Male',
    isNeural: true,
  },
  {
    id: 'en-IN-NeerjaNeural',
    name: 'Neerja (Indian English Natural Female)',
    lang: 'en-IN',
    gender: 'Female',
    isNeural: true,
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat (Indian English Natural Male)',
    lang: 'en-IN',
    gender: 'Male',
    isNeural: true,
  },
];

/**
 * Pristine speech text cleaner:
 * Eliminates all markdown syntax, bullets, asterisks, hashtags, isolated dots,
 * and weird punctuation that cause speech synthesizers to pronounce "dot", "bullet", or make click sounds.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove multi-line code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code tags
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip URLs
    .replace(/https?:\/\/\S+/g, '')
    // Strip all emojis and unicode pictographs
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    // Remove JSON structures
    .replace(/\{[^{}]*\}/g, '')
    // Strip markdown formatting symbols (asterisks, hashtags, underscores, bullets, brackets, tildes, slashes, pipes)
    .replace(/[*_#~^|\\[\]<>{}=+]/g, ' ')
    // Replace multiple dots / ellipses (...) with a single period
    .replace(/\.{2,}/g, '. ')
    // Remove isolated single dots surrounded by whitespace (prevents saying "dot")
    .replace(/\s+\.\s+/g, ' ')
    // Remove leading list numbers/bullets e.g. "1. ", "2. ", "- ", "• "
    .replace(/^\s*(\d+\.|[-•–—])\s*/gm, '')
    // Clean up double quotes and stray symbols
    .replace(/["'`]/g, '')
    // Clean up punctuation spacing
    .replace(/\s+([,.!?])/g, '$1 ')
    // Convert paragraph/newlines into natural punctuation pauses so the speaker takes natural breaths
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    // Collapse multiple whitespaces into a single clean space
    .replace(/\s+/g, ' ')
    .trim();
}

/** Check if text contains pure Tamil Unicode script (U+0B80 to U+0BFF) */
export function containsTamilScript(text: string): boolean {
  if (!text) return false;
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Downsamples Float32Array PCM from input sampleRate (e.g. 48000Hz) to targetRate (16000Hz).
 */
export function downsampleBuffer(buffer: Float32Array, inputRate: number, targetRate = 16000): Float32Array {
  if (inputRate === targetRate || inputRate <= 0) return buffer;
  const ratio = inputRate / targetRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.floor(i * ratio)];
  }
  return result;
}

/**
 * Encodes Float32Array PCM audio buffer into standard 16-bit Mono WAV Blob.
 */
export function encodeWavBlob(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit samples
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}
