import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  type VoiceStateType,
  type VoiceStyleType,
  type AvailableVoiceInfo,
  type VoiceContextType,
  LOCAL_STORAGE_VOICE_KEY,
  LOCAL_STORAGE_SPEED_KEY,
  DEFAULT_HUMAN_SPEED,
  DEFAULT_NEURAL_VOICES,
} from './voice/types';
import { useVoiceWebSocket } from './voice/useVoiceWebSocket';
import { useAudioPlayback } from './voice/useAudioPlayback';
import { useAudioRecorder } from './voice/useAudioRecorder';

export * from './voice/types';

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [voiceState, setVoiceState] = useState<VoiceStateType>('idle');
  const [voiceModeEnabled, setVoiceModeEnabledState] = useState<boolean>(false);
  const [autoVoiceResponse, setAutoVoiceResponse] = useState<boolean>(true);
  const [recognitionLang, setRecognitionLangState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('seyal_recognition_lang');
      if (stored) return stored;
    }
    return 'auto';
  });
  const recognitionLangRef = useRef<string>(recognitionLang);
  useEffect(() => {
    recognitionLangRef.current = recognitionLang;
  }, [recognitionLang]);

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
  const [interimTranscript, setInterimTranscriptState] = useState<string>('');
  const interimTranscriptRef = useRef<string>('');
  const setInterimTranscript = useCallback((val: string | ((prev: string) => string)) => {
    setInterimTranscriptState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      interimTranscriptRef.current = next;
      return next;
    });
  }, []);

  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Global Master Microphone Mute & Auto-Listen State
  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('seyal_mic_muted') === 'true';
    } catch {
      return false;
    }
  });
  const isMutedRef = useRef<boolean>(isMuted);

  const [autoListen, setAutoListenState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('seyal_auto_listen') === 'true';
    } catch {
      return false;
    }
  });
  const autoListenRef = useRef<boolean>(autoListen);

  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const transcriptHandlerRef = useRef<((text: string) => void) | null>(null);
  const transcriptListenersRef = useRef<Set<(text: string) => void>>(new Set());
  const bargeInListenersRef = useRef<Set<() => void>>(new Set());
  const silenceTimerRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);

  // Turn management
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

  // Synchronization refs
  const voiceModeEnabledRef = useRef<boolean>(false);
  const selectedVoiceNameRef = useRef<string>(selectedVoiceName);
  const isProcessingRef = useRef<boolean>(false);
  const lastProcessedTranscriptRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const startContinuousListeningRef = useRef<() => void>(() => {});

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

  const registerTranscriptHandler = useCallback((handler: (text: string) => void) => {
    transcriptListenersRef.current.add(handler);
    return () => {
      transcriptListenersRef.current.delete(handler);
    };
  }, []);

  const registerBargeInHandler = useCallback((handler: () => void) => {
    bargeInListenersRef.current.add(handler);
    return () => {
      bargeInListenersRef.current.delete(handler);
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
          isNeural:
            v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'),
        }));

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

  // Final transcript processing & dispatch logic
  const dispatchFinalTranscript = useCallback((spokenText: string) => {
    let cleanText = spokenText.trim();
    if (!cleanText) return;

    // Filter out JSON wrappers
    const jsonMatch = cleanText.match(
      /["']?text["']?\s*:\s*["']?(.*?)(?:["']?\s*,\s*["']?language|["']?\s*\}|$)/is
    );
    if (jsonMatch && jsonMatch[1] && jsonMatch[1].trim()) {
      cleanText = jsonMatch[1].trim();
    }
    cleanText = cleanText.replace(/^[{\["']+|[}\]"'\s]+$/g, '').trim();
    if (!cleanText) return;

    // Filter out timestamp hallucinations
    if (/^\[?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\]?$/i.test(cleanText)) {
      console.log('[VOICE] Discarded acoustic timestamp hallucination:', cleanText);
      return;
    }

    // Filter out common STT hallucination artifacts
    if (
      /^(subtitles? by|closed captions?|thank you for watching|amara\.org|subtitles created by|transcription by|captioning by|can you call|tamil news|இனி தான்)$/i.test(
        cleanText.trim()
      )
    ) {
      console.log('[VOICE] Discarded STT background artifact or noise prior:', cleanText);
      return;
    }

    // Hardware mic silence guard
    if (
      !audioRecorder.isAudioSpeakingDetectedRef.current &&
      (!voiceWs.voiceWsRef.current || voiceWs.voiceWsRef.current.readyState !== WebSocket.OPEN)
    ) {
      console.log('[VOICE] Discarded transcript because hardware mic reported silence:', cleanText);
      return;
    }

    const now = Date.now();
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normInput = normalize(cleanText);
    const normLast = normalize(lastProcessedTranscriptRef.current?.text || '');

    // Acoustic Speaker Echo & Self-Hearing Guard
    if (
      playback.isSpeakingRef.current ||
      now - playback.lastSpeechEndTimeRef.current < 1800
    ) {
      const lastAssistantWords = normalize(playback.lastAssistantSpokenTextRef.current || '');

      if (lastAssistantWords && normInput) {
        if (
          lastAssistantWords.includes(normInput) ||
          normInput.includes(lastAssistantWords) ||
          (normInput.length < 40 && lastAssistantWords.indexOf(normInput) !== -1)
        ) {
          console.log('[VOICE ECHO GUARD] Rejected speaker self-hearing acoustic echo (fallback):', cleanText);
          return;
        }

        const assistantWordList = lastAssistantWords.split(' ');
        for (let len = Math.min(4, assistantWordList.length); len >= 1; len--) {
          const tailPhrase = assistantWordList.slice(-len).join(' ');
          if (normInput === tailPhrase) {
            console.log('[VOICE ECHO GUARD] Rejected exact assistant tail echo:', cleanText);
            return;
          }
          if (normInput.startsWith(tailPhrase + ' ')) {
            const stripped = normInput.slice(tailPhrase.length).trim();
            console.log(`[VOICE ECHO GUARD] Stripped assistant tail echo "${tailPhrase}", remaining user input: "${stripped}"`);
            if (!stripped) return;
            cleanText = stripped;
            break;
          }
        }
      }
    }

    // Deduplication guard
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

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
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

    setInterimTranscript('');
    setIsUserSpeaking(false);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hook 1: Realtime Voice WebSocket
  const voiceWs = useVoiceWebSocket({
    recognitionLangRef,
    voiceModeEnabledRef,
    isRecognitionActiveRef,
    onBargeIn: () => {
      playback.cancelCurrentSpeech('realtime_ws_barge_in');
      setIsUserSpeaking(true);
      setVoiceState('listening');
    },
    onSpeechStarted: () => {
      setIsUserSpeaking(true);
    },
    onInterimTranscript: (text) => {
      setIsUserSpeaking(true);
      setInterimTranscript(text);
    },
    onTranscript: (text) => {
      setIsUserSpeaking(false);
      setInterimTranscript('');
      dispatchFinalTranscript(text);
    },
    onSttEmpty: () => {
      setIsUserSpeaking(false);
      setInterimTranscript('');
    },
    onSttError: (errMsg) => {
      setIsUserSpeaking(false);
      setInterimTranscript('');
      setError(`STT: ${errMsg}`);
    },
  });

  // Hook 2: Audio Playback (Edge-TTS & WebSpeech synthesis)
  const playback = useAudioPlayback({
    activeTurnIdRef,
    getNextTurnId,
    selectedVoiceNameRef,
    selectedVoiceName,
    speechSpeedRef,
    voiceModeEnabledRef,
    recognitionRef,
    isRecognitionActiveRef,
    bargeInListenersRef,
    sendAssistantSpeaking: voiceWs.sendAssistantSpeaking,
    setVoiceState,
    startContinuousListeningRef,
  });

  // Hook 3: Audio Recorder (Web Audio VAD & linear PCM downsampling)
  const audioRecorder = useAudioRecorder({
    recognitionLangRef,
    isSpeakingRef: playback.isSpeakingRef,
    isProcessingRef,
    lastSpeechEndTimeRef: playback.lastSpeechEndTimeRef,
    voiceWsRef: voiceWs.voiceWsRef,
    sendPcmChunk: voiceWs.sendPcmChunk,
    connectWebSocket: voiceWs.connectWebSocket,
    onSpeechDetected: () => {
      setIsUserSpeaking(true);
    },
    onSilenceTimeout: () => {
      setIsUserSpeaking(false);
    },
    onFinalTranscript: dispatchFinalTranscript,
    onError: (msg) => setError(msg),
    setInterimTranscript,
  });

  const setRecognitionLang = useCallback(
    (lang: string) => {
      recognitionLangRef.current = lang;
      setRecognitionLangState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('seyal_recognition_lang', lang);
      }
      voiceWs.sendConfig(lang);
      if (recognitionRef.current && isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    },
    [voiceWs]
  );

  const setProcessing = useCallback(
    (processing: boolean) => {
      isProcessingRef.current = processing;
      if (processing) {
        setVoiceState('processing');
      } else if (playback.isSpeakingRef.current) {
        setVoiceState('speaking');
      } else if (voiceModeEnabledRef.current && isRecognitionActiveRef.current) {
        setVoiceState('listening');
      } else {
        setVoiceState('idle');
      }
    },
    [playback.isSpeakingRef]
  );

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

  const startContinuousListening = useCallback(() => {
    if (isMutedRef.current) {
      console.log('[VOICE] startContinuousListening skipped: microphone is muted.');
      return;
    }
    voiceModeEnabledRef.current = true;
    setVoiceModeEnabledState(true);

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    isProcessingRef.current = false;

    // 1. Start Hardware Microphone AudioContext VAD
    audioRecorder.startAudioVADRecorder();

    // 2. Start Web Speech API Recognition in parallel for instant live interim words
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const selectedProfile = (recognitionLangRef.current || 'auto').toLowerCase();
        let activeLang = 'en-IN';
        if (selectedProfile === 'ta-in' || selectedProfile === 'ta' || selectedProfile === 'tamil') {
          activeLang = 'ta-IN';
        } else if (selectedProfile === 'en-us') {
          activeLang = 'en-US';
        } else if (selectedProfile === 'en-in') {
          activeLang = 'en-IN';
        } else {
          activeLang = 'en-IN';
        }

        if (recognitionRef.current && isRecognitionActiveRef.current) {
          if (recognitionRef.current.lang === activeLang) {
            return;
          }
        }

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
          recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = activeLang;

        recognition.onstart = () => {
          isRecognitionActiveRef.current = true;
          isProcessingRef.current = false;
          setVoiceState('listening');
          setError(null);
          console.log('[VOICE] Live microphone active (lang: ' + recognition.lang + ')');
        };

        recognition.onresult = (event: any) => {
          const now = Date.now();
          let hasSufficientConfidence = true;
          let accumulatedFinal = '';
          let accumulatedInterim = '';

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            const textChunk = res[0]?.transcript?.trim() || '';
            const conf = res[0]?.confidence;
            if (typeof conf === 'number' && conf > 0 && conf < 0.40) {
              hasSufficientConfidence = false;
            }
            if (res.isFinal) {
              accumulatedFinal += (accumulatedFinal ? ' ' : '') + textChunk;
            } else {
              accumulatedInterim += (accumulatedInterim ? ' ' : '') + textChunk;
            }
          }

          if (!hasSufficientConfidence) {
            console.log('[VOICE] Discarded low-confidence speech recognition hallucination');
            return;
          }

          const combinedTranscript = (
            accumulatedFinal +
            (accumulatedInterim ? (accumulatedFinal ? ' ' : '') + accumulatedInterim : '')
          ).trim();

          if (!combinedTranscript) return;

          // Gating: ensure hardware vocal energy detected
          if (!audioRecorder.isAudioSpeakingDetectedRef.current) {
            console.log(
              '[VOICE] Discarding WebSpeech on silent hardware mic (noise phantom):',
              combinedTranscript
            );
            return;
          }

          if (playback.isSpeakingRef.current) {
            const normalize = (t: string) =>
              t
                .toLowerCase()
                .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            const normTranscript = normalize(combinedTranscript);
            const lastAssistantWords = normalize(playback.lastAssistantSpokenTextRef.current || '');

            const isEcho = Boolean(
              lastAssistantWords &&
                normTranscript &&
                (lastAssistantWords.includes(normTranscript) ||
                  (normTranscript.length < 35 &&
                    lastAssistantWords.indexOf(normTranscript) !== -1))
            );

            if (isEcho) {
              console.log(
                '[VOICE] Discarding speaker audio echo during assistant speaking:',
                combinedTranscript
              );
              return;
            }

            console.log(
              '[VOICE] Genuine user interruption detected during assistant speaking:',
              combinedTranscript
            );
            playback.cancelCurrentSpeech('barge_in');
          }

          if (now - playback.lastSpeechEndTimeRef.current < 1200) {
            console.log('[VOICE] Discarding post-TTS acoustic hangover:', combinedTranscript);
            return;
          }

          if (combinedTranscript.length > 0) {
            setIsUserSpeaking(true);
            setInterimTranscript(combinedTranscript);
            console.log('[VOICE] Live speech detected:', combinedTranscript);

            if (voiceWs.voiceWsRef.current && voiceWs.voiceWsRef.current.readyState === WebSocket.OPEN) {
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              return;
            }

            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }

            silenceTimerRef.current = setTimeout(() => {
              if (combinedTranscript.length > 0 && audioRecorder.isAudioSpeakingDetectedRef.current) {
                console.log(
                  '[VOICE OFFLINE] Speech pause detected -> committing speech:',
                  combinedTranscript
                );
                dispatchFinalTranscript(combinedTranscript);
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.abort();
                  } catch {
                    // ignore
                  }
                }
              }
            }, 1100);
          }
        };

        recognition.onerror = (event: any) => {
          console.log('[VOICE] Recognition notice / error:', event.error);
          isRecognitionActiveRef.current = false;
          if (event.error === 'not-allowed') {
            setError(
              'Microphone permission was denied. Please allow microphone access in your settings.'
            );
            setVoiceModeEnabled(false);
          }
          setVoiceState('idle');
        };

        recognition.onend = () => {
          isRecognitionActiveRef.current = false;
          setVoiceState(playback.isSpeakingRef.current ? 'speaking' : 'idle');
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
  }, [audioRecorder, dispatchFinalTranscript, playback, setInterimTranscript, setVoiceModeEnabled, voiceWs.voiceWsRef]);

  useEffect(() => {
    startContinuousListeningRef.current = startContinuousListening;
  }, [startContinuousListening]);

  const stopListening = useCallback(() => {
    voiceModeEnabledRef.current = false;
    setVoiceModeEnabledState(false);
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
    audioRecorder.stopAudioVADRecorder();
    voiceWs.closeWebSocket(true);
    isRecognitionActiveRef.current = false;
    setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
  }, [audioRecorder, voiceWs]);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      try {
        localStorage.setItem('seyal_mic_muted', String(next));
      } catch {}
      if (next) {
        stopListening();
      } else {
        if (autoListenRef.current && startContinuousListeningRef.current) {
          startContinuousListeningRef.current();
        }
      }
      return next;
    });
  }, [stopListening]);

  const setIsMuted = useCallback(
    (muted: boolean) => {
      isMutedRef.current = muted;
      setIsMutedState(muted);
      try {
        localStorage.setItem('seyal_mic_muted', String(muted));
      } catch {}
      if (muted) {
        stopListening();
      } else {
        if (autoListenRef.current && startContinuousListeningRef.current) {
          startContinuousListeningRef.current();
        }
      }
    },
    [stopListening]
  );

  const setAutoListen = useCallback(
    (enabled: boolean) => {
      autoListenRef.current = enabled;
      setAutoListenState(enabled);
      try {
        localStorage.setItem('seyal_auto_listen', String(enabled));
      } catch {}
      if (!enabled && !isMutedRef.current) {
        stopListening();
      } else if (enabled && !isMutedRef.current && startContinuousListeningRef.current) {
        startContinuousListeningRef.current();
      }
    },
    [stopListening]
  );

  useEffect(() => {
    if (autoListenRef.current && !isMutedRef.current) {
      const timer = setTimeout(() => {
        if (autoListenRef.current && !isMutedRef.current && startContinuousListeningRef.current) {
          console.log('[VOICE] Initializing continuous listening on app load...');
          startContinuousListeningRef.current();
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, []);

  const startListeningLegacy = useCallback(
    (onFinalTranscript?: (text: string) => void, lang?: string) => {
      if (isMutedRef.current) {
        console.log('[VOICE] startListening skipped: microphone is muted.');
        return;
      }
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
        isUserSpeaking: isUserSpeaking || Boolean(interimTranscript),
        isProcessing: voiceState === 'processing',
        voiceModeEnabled,
        isMuted,
        setIsMuted,
        toggleMute,
        autoListen,
        setAutoListen,
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
        speakText: playback.speakText,
        speakInstant: playback.speakInstant,
        speakAssistantResponse: playback.speakAssistantResponse,
        preloadAssistantAudio: playback.preloadAssistantAudio,
        cancelCurrentSpeech: playback.cancelCurrentSpeech,
        stopSpeaking: playback.stopSpeaking,
        isSpeechPaused: playback.isSpeechPaused,
        pauseSpeech: playback.pauseSpeech,
        resumeSpeech: playback.resumeSpeech,
        testVoice: playback.testVoice,
        getNextTurnId,
        getCurrentTurnId,
        invalidateTurn,
        registerTranscriptHandler,
        registerBargeInHandler,
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
