import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';

export type VoiceStateType = 'idle' | 'listening' | 'processing' | 'speaking';
export type VoiceStyleType = 'auto' | 'tamil_indian' | 'english';

export interface AvailableVoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender?: string;
  isNeural?: boolean;
}

interface VoiceContextType {
  voiceState: VoiceStateType;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  voiceModeEnabled: boolean;
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
    overrideVoiceId?: string
  ) => Promise<void>;
  cancelCurrentSpeech: (reason?: string) => void;
  stopSpeaking: () => void;
  testVoice: (voiceName?: string) => Promise<void>;
  getNextTurnId: () => number;
  getCurrentTurnId: () => number;
  invalidateTurn: () => number;
  registerTranscriptHandler: (handler: (text: string) => void) => () => void;
  setProcessing: (processing: boolean) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const LOCAL_STORAGE_VOICE_KEY = 'seyal_preferred_voice_name';
const LOCAL_STORAGE_SPEED_KEY = 'seyal_speech_speed';
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
  const sampleRateRatio = inputRate / targetRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
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

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [voiceState, setVoiceState] = useState<VoiceStateType>('idle');
  const [voiceModeEnabled, setVoiceModeEnabledState] = useState<boolean>(false);
  const [autoVoiceResponse, setAutoVoiceResponse] = useState<boolean>(true);
  const [recognitionLang, setRecognitionLangState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('seyal_recognition_lang');
      if (!stored || stored === 'en-IN' || stored === 'en-US') {
        localStorage.setItem('seyal_recognition_lang', 'auto');
        return 'auto';
      }
      return stored;
    }
    return 'auto';
  });
  const recognitionLangRef = useRef<string>(recognitionLang);
  const [speechSpeed, setSpeechSpeedState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_SPEED_KEY);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 0.7 && val <= 1.3) return val;
      }
    }
    return DEFAULT_HUMAN_SPEED;
  });
  const speechSpeedRef = useRef<number>(speechSpeed);

  const setSpeechSpeed = useCallback((speed: number) => {
    const clamped = Math.max(0.7, Math.min(1.3, Number(speed.toFixed(2))));
    speechSpeedRef.current = clamped;
    setSpeechSpeedState(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_SPEED_KEY, clamped.toString());
    }
  }, []);

  const [voiceStyle, setVoiceStyleState] = useState<VoiceStyleType>('auto');
  const [selectedVoiceName, setSelectedVoiceNameState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_VOICE_KEY);
      if (stored) {
        if (stored === 'en-US-AvaNeural') return 'en-US-AvaMultilingualNeural';
        if (stored === 'en-US-AndrewNeural') return 'en-US-AndrewMultilingualNeural';
        if (stored === 'en-US-EmmaNeural') return 'en-US-EmmaMultilingualNeural';
        if (stored === 'en-US-BrianNeural') return 'en-US-BrianMultilingualNeural';
        return stored;
      }
      return 'en-US-AvaMultilingualNeural';
    }
    return 'en-US-AvaMultilingualNeural';
  });
  const [availableVoices, setAvailableVoices] = useState<AvailableVoiceInfo[]>(DEFAULT_NEURAL_VOICES);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const setRecognitionLang = useCallback((lang: string) => {
    recognitionLangRef.current = lang;
    setRecognitionLangState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seyal_recognition_lang', lang);
    }
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const recognitionRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const transcriptHandlerRef = useRef<((text: string) => void) | null>(null);
  const transcriptListenersRef = useRef<Set<(text: string) => void>>(new Set());
  const silenceTimerRef = useRef<any>(null);

  // Web Audio VAD & Direct WAV Stream Recording (Works in Electron, Chrome, Edge)
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferChunksRef = useRef<Float32Array[]>([]);
  const isAudioSpeakingDetectedRef = useRef<boolean>(false);
  const silenceDetectionTimerRef = useRef<any>(null);
  const isTranscribingBackendRef = useRef<boolean>(false);
  const voiceWsRef = useRef<WebSocket | null>(null);

  // Turn management: single source of truth for request synchronization
  const activeTurnIdRef = useRef<number>(0);
  const [activeTurnId, setActiveTurnId] = useState<number>(0);

  const getNextTurnId = useCallback(() => {
    activeTurnIdRef.current += 1;
    setActiveTurnId(activeTurnIdRef.current);
    return activeTurnIdRef.current;
  }, []);

  const getCurrentTurnId = useCallback(() => {
    return activeTurnIdRef.current;
  }, []);

  const invalidateTurn = useCallback(() => {
    activeTurnIdRef.current += 1;
    setActiveTurnId(activeTurnIdRef.current);
    return activeTurnIdRef.current;
  }, []);

  // Synchronization refs to eliminate state race conditions across rapid speech cycles
  const voiceModeEnabledRef = useRef<boolean>(false);
  const selectedVoiceNameRef = useRef<string>(selectedVoiceName);
  const isSpeakingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const restartTimerRef = useRef<any>(null);
  const lastProcessedTranscriptRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const lastAssistantSpokenTextRef = useRef<string>('');
  const lastSpeechEndTimeRef = useRef<number>(0);

  useEffect(() => {
    selectedVoiceNameRef.current = selectedVoiceName;
  }, [selectedVoiceName]);

  const setSelectedVoiceName = useCallback((voiceName: string) => {
    selectedVoiceNameRef.current = voiceName;
    setSelectedVoiceNameState(voiceName);
    if (typeof window !== 'undefined') {
      if (voiceName) {
        localStorage.setItem(LOCAL_STORAGE_VOICE_KEY, voiceName);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_VOICE_KEY);
      }
    }
  }, []);

  const setVoiceStyle = useCallback((style: VoiceStyleType) => {
    setVoiceStyleState(style);
  }, []);

  const setVoiceModeEnabled = useCallback((enabled: boolean) => {
    voiceModeEnabledRef.current = enabled;
    setVoiceModeEnabledState(enabled);
    if (!enabled) {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      isRecognitionActiveRef.current = false;
      setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
    }
  }, []);

  const toggleVoiceMode = useCallback(() => {
    setVoiceModeEnabled(!voiceModeEnabledRef.current);
  }, [setVoiceModeEnabled]);

  const setProcessing = useCallback((processing: boolean) => {
    isProcessingRef.current = processing;
    if (processing) {
      setVoiceState('processing');
    } else if (isSpeakingRef.current) {
      setVoiceState('speaking');
    } else if (voiceModeEnabledRef.current && isRecognitionActiveRef.current) {
      setVoiceState('listening');
    } else {
      setVoiceState('idle');
    }
  }, []);

  const registerTranscriptHandler = useCallback((handler: (text: string) => void) => {
    transcriptListenersRef.current.add(handler);
    return () => {
      transcriptListenersRef.current.delete(handler);
    };
  }, []);

  // Pre-load available voices from browser & merge with Neural voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadBrowserVoices = () => {
        const browserVoices = window.speechSynthesis.getVoices() || [];
        const browserMapped: AvailableVoiceInfo[] = browserVoices.map((v) => ({
          id: v.name,
          name: `${v.name} (${v.lang})`,
          lang: v.lang,
          gender: 'Neutral',
          isNeural: v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'),
        }));

        // Combine Neural defaults + Browser local voices
        const combined = [...DEFAULT_NEURAL_VOICES];
        for (const bv of browserMapped) {
          if (!combined.some((c) => c.id === bv.id)) {
            combined.push(bv);
          }
        }
        setAvailableVoices(combined);
      };

      loadBrowserVoices();
      window.speechSynthesis.onvoiceschanged = loadBrowserVoices;
    }
  }, []);

  const cancelCurrentSpeech = useCallback((reason = 'manual') => {
    console.log(`[TTS CANCELLED] reason=${reason} turnId=${activeTurnIdRef.current}`);
    isSpeakingRef.current = false;
    lastSpeechEndTimeRef.current = Date.now();

    if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
      try {
        voiceWsRef.current.send(JSON.stringify({ type: 'assistant_speaking', status: false }));
      } catch {
        // ignore
      }
    }

    // 1. Stop HTML5 audio
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
      activeAudioRef.current = null;
    }

    if (activeAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      } catch {
        // ignore
      }
      activeAudioUrlRef.current = null;
    }

    // 2. Stop browser speechSynthesis
    if (activeUtteranceRef.current) {
      try {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    activeUtteranceRef.current = null;
    (window as any).__seyal_active_utterance = null;

    if (!isProcessingRef.current) {
      setVoiceState((prev) => (prev === 'speaking' ? (voiceModeEnabledRef.current ? 'listening' : 'idle') : prev));
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    cancelCurrentSpeech('stop_request');
  }, [cancelCurrentSpeech]);

  const startContinuousListeningRef = useRef<() => void>(() => { });

  const stopAudioVADRecorder = useCallback(() => {
    if (silenceDetectionTimerRef.current) {
      clearTimeout(silenceDetectionTimerRef.current);
      silenceDetectionTimerRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // ignore
      }
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
    if (voiceWsRef.current) {
      try {
        voiceWsRef.current.close();
      } catch {
        // ignore
      }
      voiceWsRef.current = null;
    }
    audioBufferChunksRef.current = [];
    isAudioSpeakingDetectedRef.current = false;
  }, []);

  const startContinuousListening = useCallback(() => {
    voiceModeEnabledRef.current = true;
    setVoiceModeEnabledState(true);

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    isProcessingRef.current = false;

    const dispatchFinalTranscript = (spokenText: string) => {
      let cleanText = spokenText.trim();
      if (!cleanText) return;

      // Filter out any JSON or pseudo-JSON wrappers (e.g. {text: ...} or {"text": ...})
      const jsonMatch = cleanText.match(/["']?text["']?\s*:\s*["']?(.*?)(?:["']?\s*,\s*["']?language|["']?\s*\}|$)/is);
      if (jsonMatch && jsonMatch[1] && jsonMatch[1].trim()) {
        cleanText = jsonMatch[1].trim();
      }
      cleanText = cleanText.replace(/^[{\["']+|[}\]"'\s]+$/g, '').trim();
      if (!cleanText) return;

      // Filter out standalone timestamp hallucinations like "00:00", "00:00:00", "[00:00.000]", "0:00"
      if (/^\[?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\]?$/i.test(cleanText)) {
        console.log('[VOICE] Discarded acoustic timestamp hallucination:', cleanText);
        return;
      }

      // Filter out common STT hallucination artifacts on silence or truncated noise
      if (/^(subtitles? by|closed captions?|thank you for watching|amara\.org|subtitles created by|transcription by|captioning by)\b/i.test(cleanText)) {
        console.log('[VOICE] Discarded STT background artifact:', cleanText);
        return;
      }

      const now = Date.now();

      // Normalize helper: strips all punctuation, casing, and excessive spaces for exact semantic comparison
      const normalize = (t: string) =>
        t
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const normInput = normalize(cleanText);
      const normLast = normalize(lastProcessedTranscriptRef.current?.text || '');

      // Acoustic Speaker Echo & Self-Hearing Guard:
      // If assistant was speaking recently (< 1800ms) or is currently speaking, reject echo of assistant words
      if (isSpeakingRef.current || (now - lastSpeechEndTimeRef.current < 1800)) {
        const lastAssistantWords = normalize(lastAssistantSpokenTextRef.current || '');

        if (
          lastAssistantWords &&
          normInput &&
          (lastAssistantWords.includes(normInput) ||
            normInput.includes(lastAssistantWords) ||
            (normInput.length < 40 && lastAssistantWords.indexOf(normInput) !== -1))
        ) {
          console.log('[VOICE ECHO GUARD] Rejected speaker self-hearing acoustic echo (fallback):', cleanText);
          return;
        }
      }

      // Robust Deduplication guard against rapid identical or punctuation-varied transcripts from parallel streams
      if (
        normInput &&
        normLast &&
        normInput === normLast &&
        now - lastProcessedTranscriptRef.current.time < 2200
      ) {
        console.log('[VOICE] Ignoring duplicate normalized transcript:', cleanText);
        return;
      }

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      lastProcessedTranscriptRef.current = { text: cleanText, time: now };
      console.log('[VOICE] Final transcript accepted & dispatching:', cleanText);
      setTranscript(cleanText);
      setInterimTranscript('');
      setError(null);

      // Stop current recognition so old results aren't accumulated for the next sentence
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      if (transcriptHandlerRef.current) {
        try {
          transcriptHandlerRef.current(cleanText);
        } catch (handlerErr) {
          console.error('[VOICE] Transcript handler error:', handlerErr);
        }
      }
      transcriptListenersRef.current.forEach((listener) => {
        try {
          listener(cleanText);
        } catch (listenerErr) {
          console.error('[VOICE] Transcript listener error:', listenerErr);
        }
      });
    };

    // 1. Start Hardware Microphone AudioContext VAD (100% Reliable in Electron and Chrome)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const hasLiveTracks = mediaStreamRef.current && mediaStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live');
      if (hasLiveTracks && audioContextRef.current && audioContextRef.current.state !== 'closed') {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
        if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
          try {
            voiceWsRef.current.send(JSON.stringify({ type: 'config', language: recognitionLangRef.current || 'auto' }));
          } catch {
            // ignore
          }
        }
        setVoiceState('listening');
        return;
      }

      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {
          // ignore
        }
        mediaStreamRef.current = null;
      }

      navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        .then(async (stream) => {
          mediaStreamRef.current = stream;
          try {
            const AudioContextClass =
              window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;

            // Close existing AudioContext if open
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              try {
                audioContextRef.current.close();
              } catch {
                // ignore
              }
            }

            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            console.log(`[VOICE] AudioContext active at native sampleRate=${audioCtx.sampleRate}Hz`);

            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }

            // Initialize Realtime WebSocket Connection (/api/voice/ws) with dynamic port & heartbeat
            let pingInterval: any = null;
            const connectWebSocket = () => {
              try {
                if (voiceWsRef.current && (voiceWsRef.current.readyState === WebSocket.OPEN || voiceWsRef.current.readyState === WebSocket.CONNECTING)) {
                  return;
                }
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = window.location.hostname || 'localhost';
                // Dynamically resolve port: Dev server port 5173 proxies or connects to backend 8000; otherwise use active location port
                const wsPort = window.location.port === '5173' ? '8000' : (window.location.port || '8000');
                const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/api/voice/ws`;
                const ws = new WebSocket(wsUrl);
                ws.binaryType = 'arraybuffer';

                ws.onopen = () => {
                  console.log('[VOICE WS] Connected to Realtime WebSocket at', wsUrl);
                  ws.send(JSON.stringify({ type: 'config', language: recognitionLangRef.current || 'auto' }));
                  if (pingInterval) clearInterval(pingInterval);
                  pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                      try {
                        ws.send(JSON.stringify({ type: 'ping' }));
                      } catch {
                        // ignore
                      }
                    }
                  }, 15000);
                };

                ws.onmessage = (event) => {
                  try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'barge_in') {
                      console.log('[REALTIME BARGE-IN] Server barge-in detected! Stopping assistant speech immediately.');
                      cancelCurrentSpeech('realtime_ws_barge_in');
                    } else if (data.event === 'transcript' && data.text) {
                      console.log('[REALTIME STT] Server transcript received:', data.text);
                      dispatchFinalTranscript(data.text);
                    } else if (data.event === 'stt_empty') {
                      console.warn('[REALTIME STT] Server reported empty speech transcript.');
                      setError('Voice not recognized. Please speak closer or try again.');
                    } else if (data.event === 'stt_error') {
                      console.warn('[REALTIME STT] Server STT error:', data.error);
                    }
                  } catch {
                    // ignore non-json
                  }
                };

                ws.onclose = () => {
                  if (pingInterval) {
                    clearInterval(pingInterval);
                    pingInterval = null;
                  }
                  if (voiceModeEnabledRef.current && isRecognitionActiveRef.current) {
                    setTimeout(() => {
                      if (voiceModeEnabledRef.current) connectWebSocket();
                    }, 2500);
                  }
                };

                ws.onerror = () => {
                  if (pingInterval) {
                    clearInterval(pingInterval);
                    pingInterval = null;
                  }
                };

                voiceWsRef.current = ws;
              } catch (wsErr) {
                console.debug('[VOICE WS] Notice:', wsErr);
              }
            };
            connectWebSocket();

            const source = audioCtx.createMediaStreamSource(stream);
            const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptNode;

            isRecognitionActiveRef.current = true;
            setVoiceState('listening');
            console.log('[VOICE] Hardware microphone active & listening');

            scriptNode.onaudioprocess = (e) => {
              if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
              }
              if (isProcessingRef.current || isTranscribingBackendRef.current) {
                return;
              }

              const inputData = e.inputBuffer.getChannelData(0);

              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);

              // 1. Audio-Level Echo & Full-Duplex Gate:
              // If assistant is actively preparing, synthesizing, or outputting speech from laptop speakers
              if (isSpeakingRef.current || isProcessingRef.current) {
                audioBufferChunksRef.current = [];
                isAudioSpeakingDetectedRef.current = false;
                // Gate audio: assistant speaker output is NEVER streamed to STT
                return;
              }

              // 2. Post-TTS Acoustic Hangover Decay Guard: ignore speaker reverberation for 500ms after assistant finishes speaking
              if (Date.now() - lastSpeechEndTimeRef.current < 500) {
                audioBufferChunksRef.current = [];
                isAudioSpeakingDetectedRef.current = false;
                return;
              }

              // 3. Audio is genuine user environment speech: downsample native audio (e.g. 48kHz) to 16kHz for backend VAD & STT
              if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
                const targetRate = 16000;
                const downsampled = downsampleBuffer(inputData, audioCtx.sampleRate, targetRate);
                const pcm16 = new Int16Array(downsampled.length);
                for (let i = 0; i < downsampled.length; i++) {
                  const s = Math.max(-1, Math.min(1, downsampled[i]));
                  pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                try {
                  voiceWsRef.current.send(pcm16.buffer);
                } catch {
                  // ignore
                }
              }

              // Sound detected above noise floor (0.008 catches natural, soft human speech)
              if (rms > 0.008) {
                if (!isAudioSpeakingDetectedRef.current) {
                  isAudioSpeakingDetectedRef.current = true;
                }
                audioBufferChunksRef.current.push(new Float32Array(inputData));

                if (silenceDetectionTimerRef.current) {
                  clearTimeout(silenceDetectionTimerRef.current);
                  silenceDetectionTimerRef.current = null;
                }
              } else if (isAudioSpeakingDetectedRef.current) {
                // Trailing speech buffer to capture ending syllables
                audioBufferChunksRef.current.push(new Float32Array(inputData));

                if (!silenceDetectionTimerRef.current) {
                  silenceDetectionTimerRef.current = setTimeout(async () => {
                    isAudioSpeakingDetectedRef.current = false;
                    silenceDetectionTimerRef.current = null;

                    const chunks = audioBufferChunksRef.current;
                    audioBufferChunksRef.current = [];

                    // Need at least ~0.25s of audio to be a real utterance
                    if (chunks.length < 2) {
                      setInterimTranscript('');
                      return;
                    }

                    // If WebSocket is connected and streaming, let the WebSocket handle STT
                    // to prevent duplicate parallel HTTP transcription collisions
                    if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
                      setInterimTranscript('');
                      return;
                    }

                    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
                    const merged = new Float32Array(totalLength);
                    let offset = 0;
                    for (const c of chunks) {
                      merged.set(c, offset);
                      offset += c.length;
                    }

                    try {
                      isTranscribingBackendRef.current = true;
                      const targetRate = 16000;
                      const downsampled = downsampleBuffer(merged, audioCtx.sampleRate, targetRate);
                      const wavBlob = encodeWavBlob(downsampled, targetRate);
                      const targetLang = recognitionLangRef.current || 'auto';
                      const res = await api.transcribeAudio(wavBlob, targetLang);

                      if (res && res.text && res.text.trim()) {
                        console.log('[VOICE VAD] Backend STT result:', res.text);
                        dispatchFinalTranscript(res.text.trim());
                      } else {
                        setInterimTranscript('');
                        if (res && res.error) {
                          console.warn('[VOICE VAD] STT error:', res.error);
                          setError(`Speech recognition: ${res.error}`);
                        } else {
                          setError('Voice not clearly recognized. Please speak closer to microphone.');
                        }
                      }
                    } catch (err) {
                      console.debug('[VOICE VAD] Transcription notice:', err);
                      setInterimTranscript('');
                    } finally {
                      isTranscribingBackendRef.current = false;
                    }
                  }, 750);
                }
              }
            };

            // Connect through silent GainNode (gain=0) to keep AudioContext active in Chromium
            // without routing live microphone feed back into the laptop speakers (eliminates acoustic loop)
            const silentGain = audioCtx.createGain();
            silentGain.gain.value = 0;
            source.connect(scriptNode);
            scriptNode.connect(silentGain);
            silentGain.connect(audioCtx.destination);
          } catch (audioCtxErr) {
            console.warn('[VOICE] AudioContext initialization notice:', audioCtxErr);
          }
        })
        .catch((err) => {
          console.warn('[VOICE] Mic permission access error:', err);
        });
    }

    // 2. Start Web Speech API Recognition in parallel (Browser fallback only; never in Electron or when WebSocket is healthy)
    const isElectron = typeof window !== 'undefined' && (
      window.navigator.userAgent.toLowerCase().includes('electron') ||
      !!(window as any).process?.versions?.electron
    );

    const isWsActive = voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN;

    const SpeechRecognition = (!isElectron && !isWsActive) ? (
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    ) : null;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onstart = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = (!recognitionLangRef.current || recognitionLangRef.current === 'auto') ? 'en-IN' : recognitionLangRef.current;

        recognition.onstart = () => {
          isRecognitionActiveRef.current = true;
          isProcessingRef.current = false;
          setVoiceState('listening');
          setError(null);
          console.log('[VOICE] Live microphone active (lang: ' + recognition.lang + ')');
        };

        recognition.onresult = (event: any) => {
          const now = Date.now();

          let accumulatedFinal = '';
          let accumulatedInterim = '';

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            const textChunk = res[0].transcript.trim();
            if (res.isFinal) {
              accumulatedFinal += (accumulatedFinal ? ' ' : '') + textChunk;
            } else {
              accumulatedInterim += (accumulatedInterim ? ' ' : '') + textChunk;
            }
          }

          const combinedTranscript = (
            accumulatedFinal + (accumulatedInterim ? (accumulatedFinal ? ' ' : '') + accumulatedInterim : '')
          ).trim();

          // 1. If assistant is currently speaking:
          if (isSpeakingRef.current) {
            // Check if user spoke an explicit interruption command
            const isInterruption = /^(stop|wait|cancel|hold on|pause|quit|niruthu|podhum|போதும்|நிறுத்து|रुको|रुक)/i.test(combinedTranscript);
            if (isInterruption) {
              console.log('[VOICE] Intentional user interruption detected:', combinedTranscript);
              cancelCurrentSpeech('barge_in');
              return;
            }
            // Otherwise, it's the assistant's own speaker audio picked up by the microphone -> discard!
            console.log('[VOICE] Discarding speaker audio during assistant speaking:', combinedTranscript);
            return;
          }

          // 2. Post-TTS acoustic hangover window (400ms): discard residual speaker reverb
          if (now - lastSpeechEndTimeRef.current < 400) {
            console.log('[VOICE] Discarding post-TTS acoustic hangover:', combinedTranscript);
            return;
          }

          if (combinedTranscript.length > 0) {
            setInterimTranscript(combinedTranscript);
            console.log('[VOICE] Live speech detected:', combinedTranscript);

            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }

            // Natural human pause threshold (750ms): prevents premature cutoff of multi-word phrases
            silenceTimerRef.current = setTimeout(() => {
              if (combinedTranscript.length > 0) {
                console.log('[VOICE] Speech pause detected -> committing speech:', combinedTranscript);
                dispatchFinalTranscript(combinedTranscript);
              }
            }, 750);
          }
        };

        recognition.onerror = (event: any) => {
          console.log('[VOICE] Recognition notice / error:', event.error);
          if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
            if (voiceModeEnabledRef.current) {
              setTimeout(() => {
                if (startContinuousListeningRef.current) {
                  startContinuousListeningRef.current();
                }
              }, 100);
            }
            return;
          }
          if (event.error === 'not-allowed') {
            setError('Microphone permission was denied. Please allow microphone access in your settings.');
            setVoiceModeEnabled(false);
            isRecognitionActiveRef.current = false;
            setVoiceState('idle');
            return;
          }
        };

        recognition.onend = () => {
          isRecognitionActiveRef.current = false;

          // Never restart recognition if assistant is actively speaking!
          if (voiceModeEnabledRef.current && !isSpeakingRef.current) {
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
              if (startContinuousListeningRef.current && !isSpeakingRef.current) {
                startContinuousListeningRef.current();
              }
            }, 100);
          } else {
            setVoiceState(isSpeakingRef.current ? 'speaking' : 'idle');
          }
        };

        recognition.start();
      } catch (err: any) {
        isRecognitionActiveRef.current = false;
        console.warn('Could not start recognition:', err);
      }
    } else {
      isRecognitionActiveRef.current = true;
      setVoiceState('listening');
    }
  }, [cancelCurrentSpeech]);

  useEffect(() => {
    startContinuousListeningRef.current = startContinuousListening;
  }, [startContinuousListening]);

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopAudioVADRecorder();
    isRecognitionActiveRef.current = false;
    setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
  }, [stopAudioVADRecorder]);

  /**
   * High-Definition Neural Speech Synthesizer:
   * 1. Uses Edge-TTS Neural backend for pristine, studio-quality MP3 audio (zero clicking, zero robotic artifacts).
   * 2. Automatically falls back to high-grade browser SpeechSynthesis if offline.
   */
  const speakAssistantResponse = useCallback(
    async (
      text: string,
      turnId: number,
      onEnd?: () => void,
      onStart?: (durationSec?: number) => void,
      onProgress?: (revealedText: string) => void,
      overrideVoiceId?: string
    ) => {
      // 1. Turn validation: check that this turn is still the active/latest request
      if (turnId !== activeTurnIdRef.current) {
        console.warn(`[STALE RESPONSE IGNORED] id=${turnId} activeTurnId=${activeTurnIdRef.current}`);
        if (onEnd) onEnd();
        return;
      }

      if (!text || !text.trim()) {
        if (onEnd) onEnd();
        return;
      }

      // 2. Clean text from all markdown, asterisks, emojis, and stray dots
      const cleanSpoken = cleanTextForSpeech(text);
      if (!cleanSpoken) {
        if (onEnd) onEnd();
        return;
      }

      // 3. Pause microphone to eliminate speaker feedback & false barge-ins
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      isRecognitionActiveRef.current = false;

      // 4. Cancel any currently playing speech
      cancelCurrentSpeech('new_response');

      // The Settings voice is strictly the single source of truth for all speech output!
      const storedVoice = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_VOICE_KEY) : null;
      let chosenVoiceId = (overrideVoiceId && overrideVoiceId.trim())
        ? overrideVoiceId
        : (storedVoice || selectedVoiceNameRef.current || selectedVoiceName || 'en-US-AvaMultilingualNeural');

      // Dynamic Tamil Script Routing:
      // An English voice (Ava/David/Zira) completely skips Tamil Unicode characters and only reads English words.
      // If text contains Tamil script, automatically route to Tamil neural voice so every Tamil word is spoken!
      if (containsTamilScript(cleanSpoken) && !chosenVoiceId.toLowerCase().startsWith('ta-')) {
        const isMale = chosenVoiceId.toLowerCase().includes('male') ||
          chosenVoiceId.toLowerCase().includes('andrew') ||
          chosenVoiceId.toLowerCase().includes('brian') ||
          chosenVoiceId.toLowerCase().includes('valluvar') ||
          chosenVoiceId.toLowerCase().includes('prabhat');
        chosenVoiceId = isMale ? 'ta-IN-ValluvarNeural' : 'ta-IN-PallaviNeural';
      }

      lastAssistantSpokenTextRef.current = cleanSpoken.toLowerCase();
      console.log(`[TTS START] turnId=${turnId} voice="${chosenVoiceId}" speed=${speechSpeedRef.current} text="${cleanSpoken.slice(0, 70)}"`);

      // Immediately gate mic input while synthesis and playback are active
      isSpeakingRef.current = true;
      setVoiceState('speaking');
      if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
        try {
          voiceWsRef.current.send(JSON.stringify({ type: 'assistant_speaking', status: true }));
        } catch {
          // ignore
        }
      }

      const rawWords = text.trim().split(/\s+/);

      const handleSpeechComplete = () => {
        isSpeakingRef.current = false;
        lastSpeechEndTimeRef.current = Date.now();

        if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
          try {
            voiceWsRef.current.send(JSON.stringify({ type: 'assistant_speaking', status: false }));
          } catch {
            // ignore
          }
        }

        activeAudioRef.current = null;
        activeUtteranceRef.current = null;
        (window as any).__seyal_active_utterance = null;

        if (activeAudioUrlRef.current) {
          try {
            URL.revokeObjectURL(activeAudioUrlRef.current);
          } catch {
            // ignore
          }
          activeAudioUrlRef.current = null;
        }

        if (onProgress) {
          onProgress(text);
        }

        if (onEnd) {
          try {
            onEnd();
          } catch (e) {
            console.error('onEnd callback error:', e);
          }
        }

        // Once speaking finishes, automatically resume live listening!
        if (voiceModeEnabledRef.current && !isProcessingRef.current) {
          setVoiceState('listening');
          setTimeout(() => {
            if (startContinuousListeningRef.current) {
              startContinuousListeningRef.current();
            }
          }, 120);
        } else if (!isProcessingRef.current) {
          setVoiceState('idle');
        }
      };

      // Try Backend High-Definition Edge Neural TTS with configured human cadence (speechSpeed)
      let backendSuccess = false;
      try {
        const currentSpeed = speechSpeedRef.current || DEFAULT_HUMAN_SPEED;
        let audioBlob: Blob | null = null;

        // Try synthesis with generous 15s timeout; avoids premature abort on multi-sentence paragraphs
        try {
          const synthPromise = api.synthesizeSpeech(cleanSpoken, chosenVoiceId, currentSpeed);
          const timeoutPromise = new Promise<Blob | null>((resolve) => setTimeout(() => resolve(null), 15000));
          audioBlob = await Promise.race([synthPromise, timeoutPromise]);
        } catch (fetchErr) {
          console.warn('[TTS] Synthesis network notice:', fetchErr);
        }

        if (audioBlob && audioBlob.size > 100) {
          if (turnId !== activeTurnIdRef.current) {
            console.warn(`[STALE AUDIO DROPPED] turnId=${turnId}`);
            return;
          }

          const audioUrl = URL.createObjectURL(audioBlob);
          activeAudioUrlRef.current = audioUrl;

          const audio = new Audio(audioUrl);
          activeAudioRef.current = audio;

          let progressInterval: any = null;

          audio.onplay = () => {
            isSpeakingRef.current = true;
            setVoiceState('speaking');

            if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
              try {
                voiceWsRef.current.send(JSON.stringify({ type: 'assistant_speaking', status: true }));
              } catch {
                // ignore
              }
            }
            if (onStart) {
              try {
                const estimatedSec = cleanSpoken.split(' ').length * 0.32;
                onStart(audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : estimatedSec);
              } catch (startErr) {
                console.warn('onStart error:', startErr);
              }
            }

            // Simultaneous word-by-word streaming in exact sync with audio playback
            if (onProgress && rawWords.length > 0) {
              let lastWordCount = 0;
              const duration = (audio.duration && !isNaN(audio.duration) && audio.duration > 0)
                ? audio.duration
                : rawWords.length * 0.35;

              progressInterval = setInterval(() => {
                if (audio.paused || audio.ended) {
                  clearInterval(progressInterval);
                  onProgress(text);
                  return;
                }
                const ratio = Math.min(1, Math.max(0, audio.currentTime / duration));
                const wordCount = Math.min(rawWords.length, Math.max(1, Math.ceil(ratio * rawWords.length)));
                if (wordCount > lastWordCount) {
                  lastWordCount = wordCount;
                  onProgress(rawWords.slice(0, wordCount).join(' '));
                }
              }, 100);
            }
          };

          audio.onended = () => {
            if (progressInterval) clearInterval(progressInterval);
            handleSpeechComplete();
          };

          audio.onerror = (err) => {
            if (progressInterval) clearInterval(progressInterval);
            console.warn('Audio playback notice:', err);
            handleSpeechComplete();
          };

          isSpeakingRef.current = true;
          setVoiceState('speaking');
          try {
            await audio.play();
            backendSuccess = true;
          } catch (playErr: any) {
            if (playErr?.name === 'NotAllowedError') {
              console.log('[TTS] Autoplay policy prevented playback until user interaction — queueing playback on first gesture');
              const onGesture = () => {
                audio.play().catch(() => {});
                window.removeEventListener('click', onGesture);
                window.removeEventListener('keydown', onGesture);
                window.removeEventListener('pointerdown', onGesture);
              };
              window.addEventListener('click', onGesture, { once: true });
              window.addEventListener('keydown', onGesture, { once: true });
              window.addEventListener('pointerdown', onGesture, { once: true });
              backendSuccess = true; // Handled cleanly, do not drop to robotic David!
            } else {
              throw playErr;
            }
          }
        }
      } catch (synthErr) {
        console.warn('[TTS] Backend synthesis notice:', synthErr);
        backendSuccess = false;
      }

      // Fallback: Browser Web Speech Synthesis (0ms start delay & native word boundary event)
      if (!backendSuccess) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(cleanSpoken);
            const rawVoices = window.speechSynthesis.getVoices() || [];

            // Match preferred browser voice strictly preserving the language and gender of chosenVoiceId
            const isTamil = chosenVoiceId.toLowerCase().startsWith('ta');
            const isHindi = chosenVoiceId.toLowerCase().startsWith('hi');
            const isMalayalam = chosenVoiceId.toLowerCase().startsWith('ml');
            const isMale = chosenVoiceId.toLowerCase().includes('andrew') ||
              chosenVoiceId.toLowerCase().includes('brian') ||
              chosenVoiceId.toLowerCase().includes('valluvar') ||
              chosenVoiceId.toLowerCase().includes('madhur') ||
              chosenVoiceId.toLowerCase().includes('midhun') ||
              chosenVoiceId.toLowerCase().includes('prabhat');

            let matchedVoice = rawVoices.find((v) => v.name === chosenVoiceId);
            if (!matchedVoice && isTamil) {
              matchedVoice = rawVoices.find((v) => v.lang.startsWith('ta')) ||
                             rawVoices.find((v) => v.lang.includes('ta'));
            }
            if (!matchedVoice && isHindi) {
              matchedVoice = rawVoices.find((v) => v.lang.startsWith('hi')) ||
                             rawVoices.find((v) => v.lang.includes('hi'));
            }
            if (!matchedVoice && isMalayalam) {
              matchedVoice = rawVoices.find((v) => v.lang.startsWith('ml')) ||
                             rawVoices.find((v) => v.lang.includes('ml'));
            }
            if (!matchedVoice) {
              if (isMale) {
                matchedVoice = rawVoices.find(
                  (v) =>
                    v.lang.startsWith('en') &&
                    (v.name.includes('David') || v.name.includes('Guy') || v.name.includes('Male') || v.name.includes('Andrew') || v.name.includes('Brian'))
                ) || rawVoices.find((v) => v.lang.startsWith('en'));
              } else {
                matchedVoice = rawVoices.find(
                  (v) =>
                    v.lang.startsWith('en') &&
                    (v.name.includes('Zira') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Female') || v.name.includes('Ava') || v.name.includes('Emma'))
                ) || rawVoices.find((v) => v.lang.startsWith('en'));
              }
            }
            if (!matchedVoice) {
              matchedVoice = rawVoices[0];
            }

            if (matchedVoice) {
              utterance.voice = matchedVoice;
            }
            utterance.lang = matchedVoice?.lang || (isTamil ? 'ta-IN' : isHindi ? 'hi-IN' : isMalayalam ? 'ml-IN' : 'en-US');
            utterance.rate = speechSpeedRef.current || DEFAULT_HUMAN_SPEED;
            utterance.pitch = 1.0;

            utterance.onstart = () => {
              if (turnId !== activeTurnIdRef.current) {
                window.speechSynthesis.cancel();
                return;
              }
              isSpeakingRef.current = true;
              setVoiceState('speaking');

              if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
                try {
                  voiceWsRef.current.send(JSON.stringify({ type: 'assistant_speaking', status: true }));
                } catch {
                  // ignore
                }
              }
              if (onProgress && rawWords.length > 0) {
                onProgress(rawWords[0]);
              }
              if (onStart) {
                try {
                  const estSec = cleanSpoken.split(' ').length * 0.28;
                  onStart(estSec);
                } catch (startErr) {
                  console.warn('onStart error:', startErr);
                }
              }
            };

            // Hardware-level word-by-word boundary synchronization!
            utterance.onboundary = (event: any) => {
              if (event.name === 'word' && onProgress) {
                const charIndex = event.charIndex ?? 0;
                const charLength = event.charLength ?? 0;
                const revealed = text.slice(0, Math.min(text.length, charIndex + charLength + 1)).trim();
                if (revealed) {
                  onProgress(revealed);
                }
              }
            };

            utterance.onend = handleSpeechComplete;
            utterance.onerror = (e) => {
              if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.warn('SpeechSynthesis error event:', e.error);
              }
              handleSpeechComplete();
            };

            activeUtteranceRef.current = utterance;
            (window as any).__seyal_active_utterance = utterance;
            isSpeakingRef.current = true;
            setVoiceState('speaking');

            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.warn('Speech synthesis error:', err);
            handleSpeechComplete();
          }
        } else {
          handleSpeechComplete();
        }
      }
    },
    [cancelCurrentSpeech]
  );

  const speakText = useCallback(
    async (text: string, onEnd?: () => void) => {
      const turnId = getNextTurnId();
      await speakAssistantResponse(text, turnId, onEnd);
    },
    [getNextTurnId, speakAssistantResponse]
  );

  const speakInstant = useCallback(
    (text: string, onEnd?: () => void, onProgress?: (revealedText: string) => void) => {
      if (!text || !text.trim()) {
        if (onEnd) onEnd();
        return;
      }
      const turnId = getNextTurnId();
      speakAssistantResponse(text, turnId, onEnd, undefined, onProgress);
    },
    [getNextTurnId, speakAssistantResponse]
  );


  const testVoice = useCallback(
    async (voiceName?: string) => {
      const targetVoice = voiceName || selectedVoiceNameRef.current;
      const turnId = getNextTurnId();
      const testText = "Hello, Seyal AI voice system is active with crystal clear studio audio.";
      if (targetVoice) {
        selectedVoiceNameRef.current = targetVoice;
      }
      await speakAssistantResponse(testText, turnId);
    },
    [getNextTurnId, speakAssistantResponse]
  );

  const startListeningLegacy = useCallback(
    (onFinalTranscript?: (text: string) => void, lang?: string) => {
      if (lang) {
        recognitionLangRef.current = lang;
        setRecognitionLangState(lang);
      }
      if (onFinalTranscript) {
        transcriptHandlerRef.current = onFinalTranscript;
      }
      setVoiceModeEnabled(true);
      startContinuousListening();
    },
    [setVoiceModeEnabled, startContinuousListening]
  );

  return (
    <VoiceContext.Provider
      value={{
        voiceState,
        isListening: voiceState === 'listening',
        isSpeaking: voiceState === 'speaking',
        isProcessing: voiceState === 'processing',
        voiceModeEnabled,
        autoVoiceResponse,
        recognitionLang,
        setRecognitionLang,
        voiceStyle,
        selectedVoiceName,
        availableVoices,
        transcript,
        interimTranscript,
        error,
        activeTurnId,
        speechSpeed,
        setSpeechSpeed,
        setVoiceStyle,
        setSelectedVoiceName,
        setAutoVoiceResponse,
        setVoiceModeEnabled,
        toggleVoiceMode,
        startListening: startListeningLegacy,
        startContinuousListening,
        stopListening,
        speakText,
        speakInstant,
        speakAssistantResponse,
        cancelCurrentSpeech,
        stopSpeaking,
        testVoice,
        getNextTurnId,
        getCurrentTurnId,
        invalidateTurn,
        registerTranscriptHandler,
        setProcessing,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
