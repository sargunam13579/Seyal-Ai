import { useState, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import {
  cleanTextForSpeech,
  containsTamilScript,
  DEFAULT_HUMAN_SPEED,
  LOCAL_STORAGE_VOICE_KEY,
  type VoiceStateType,
} from './types';

export interface UseAudioPlaybackOptions {
  activeTurnIdRef: React.MutableRefObject<number>;
  getNextTurnId: () => number;
  selectedVoiceNameRef: React.MutableRefObject<string>;
  selectedVoiceName: string;
  speechSpeedRef: React.MutableRefObject<number>;
  voiceModeEnabledRef: React.MutableRefObject<boolean>;
  recognitionRef: React.MutableRefObject<any>;
  isRecognitionActiveRef: React.MutableRefObject<boolean>;
  bargeInListenersRef: React.MutableRefObject<Set<() => void>>;
  sendAssistantSpeaking: (status: boolean) => void;
  setVoiceState: React.Dispatch<React.SetStateAction<VoiceStateType>>;
  startContinuousListeningRef: React.MutableRefObject<() => void>;
}

export function useAudioPlayback(options: UseAudioPlaybackOptions) {
  const {
    activeTurnIdRef,
    getNextTurnId,
    selectedVoiceNameRef,
    selectedVoiceName,
    speechSpeedRef,
    voiceModeEnabledRef,
    recognitionRef,
    isRecognitionActiveRef,
    bargeInListenersRef,
    sendAssistantSpeaking,
    setVoiceState,
    startContinuousListeningRef,
  } = options;

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState<boolean>(false);
  const isSpeechPausedRef = useRef<boolean>(false);
  const lastSpeechEndTimeRef = useRef<number>(0);
  const lastAssistantSpokenTextRef = useRef<string>('');

  const cancelCurrentSpeech = useCallback(
    (reason = 'manual') => {
      console.log(`[TTS CANCELLED] reason=${reason} turnId=${activeTurnIdRef.current}`);
      isSpeakingRef.current = false;
      isSpeechPausedRef.current = false;
      setIsSpeechPaused(false);
      lastSpeechEndTimeRef.current = Date.now();

      // If speech was cancelled due to barge-in, immediately alert all registered view listeners
      if (reason && reason.includes('barge_in')) {
        bargeInListenersRef.current.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            console.error('[BARGE IN HANDLER ERROR]', e);
          }
        });
      }

      sendAssistantSpeaking(false);

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

      setVoiceState((prev) =>
        prev === 'speaking' ? (voiceModeEnabledRef.current ? 'listening' : 'idle') : prev
      );
    },
    [activeTurnIdRef, bargeInListenersRef, sendAssistantSpeaking, setVoiceState, voiceModeEnabledRef]
  );

  const stopSpeaking = useCallback(() => {
    cancelCurrentSpeech('stop_request');
  }, [cancelCurrentSpeech]);

  const pauseSpeech = useCallback(() => {
    if (activeAudioRef.current && !activeAudioRef.current.paused) {
      try {
        activeAudioRef.current.pause();
        isSpeakingRef.current = false;
        isSpeechPausedRef.current = true;
        setIsSpeechPaused(true);
        setVoiceState('idle');
      } catch (err) {
        console.error('Failed to pause audio playback:', err);
      }
    } else if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.speaking &&
      !window.speechSynthesis.paused
    ) {
      try {
        window.speechSynthesis.pause();
        isSpeakingRef.current = false;
        isSpeechPausedRef.current = true;
        setIsSpeechPaused(true);
        setVoiceState('idle');
      } catch (err) {
        console.error('Failed to pause speech synthesis:', err);
      }
    }
  }, [setVoiceState]);

  const resumeSpeech = useCallback(() => {
    if (activeAudioRef.current && isSpeechPausedRef.current) {
      try {
        activeAudioRef.current.play();
        isSpeakingRef.current = true;
        isSpeechPausedRef.current = false;
        setIsSpeechPaused(false);
        setVoiceState('speaking');
      } catch (err) {
        console.error('Failed to resume audio playback:', err);
      }
    } else if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.paused
    ) {
      try {
        window.speechSynthesis.resume();
        isSpeakingRef.current = true;
        isSpeechPausedRef.current = false;
        setIsSpeechPaused(false);
        setVoiceState('speaking');
      } catch (err) {
        console.error('Failed to resume speech synthesis:', err);
      }
    }
  }, [setVoiceState]);

  const preloadAssistantAudio = useCallback(
    async (text: string, overrideVoiceId?: string): Promise<Blob | null> => {
      if (!text || !text.trim()) return null;
      const cleanSpoken = cleanTextForSpeech(text);
      if (!cleanSpoken) return null;

      const storedVoice =
        typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_VOICE_KEY) : null;
      let chosenVoiceId =
        overrideVoiceId && overrideVoiceId.trim()
          ? overrideVoiceId
          : storedVoice ||
            selectedVoiceNameRef.current ||
            selectedVoiceName ||
            'en-US-AvaMultilingualNeural';

      if (containsTamilScript(cleanSpoken) && !chosenVoiceId.toLowerCase().startsWith('ta-')) {
        const isMale =
          chosenVoiceId.toLowerCase().includes('male') ||
          chosenVoiceId.toLowerCase().includes('andrew') ||
          chosenVoiceId.toLowerCase().includes('brian') ||
          chosenVoiceId.toLowerCase().includes('valluvar') ||
          chosenVoiceId.toLowerCase().includes('prabhat');
        chosenVoiceId = isMale ? 'ta-IN-ValluvarNeural' : 'ta-IN-PallaviNeural';
      }

      const currentSpeed = speechSpeedRef.current || DEFAULT_HUMAN_SPEED;
      try {
        const synthPromise = api.synthesizeSpeech(cleanSpoken, chosenVoiceId, currentSpeed);
        const timeoutPromise = new Promise<Blob | null>((resolve) =>
          setTimeout(() => resolve(null), 12000)
        );
        const blob = await Promise.race([synthPromise, timeoutPromise]);
        if (blob && blob.size > 100) {
          return blob;
        }
      } catch (err) {
        console.warn('[TTS PRELOAD] Background audio synthesis warning:', err);
      }
      return null;
    },
    [selectedVoiceName, selectedVoiceNameRef, speechSpeedRef]
  );

  const speakAssistantResponse = useCallback(
    async (
      text: string,
      turnId: number,
      onEnd?: () => void,
      onStart?: (durationSec?: number) => void,
      onProgress?: (revealedText: string) => void,
      overrideVoiceId?: string,
      preloadedAudioBlob?: Blob | null
    ) => {
      // 1. Turn validation
      if (turnId !== activeTurnIdRef.current) {
        console.warn(`[STALE RESPONSE IGNORED] id=${turnId} activeTurnId=${activeTurnIdRef.current}`);
        if (onEnd) onEnd();
        return;
      }

      if (!text || !text.trim()) {
        if (onEnd) onEnd();
        return;
      }

      // 2. Clean text
      const cleanSpoken = cleanTextForSpeech(text);
      if (!cleanSpoken) {
        if (onEnd) onEnd();
        return;
      }

      // 3. Pause microphone to eliminate speaker feedback
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

      const storedVoice =
        typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_VOICE_KEY) : null;
      let chosenVoiceId =
        overrideVoiceId && overrideVoiceId.trim()
          ? overrideVoiceId
          : storedVoice ||
            selectedVoiceNameRef.current ||
            selectedVoiceName ||
            'en-US-AvaMultilingualNeural';

      if (containsTamilScript(cleanSpoken) && !chosenVoiceId.toLowerCase().startsWith('ta-')) {
        const isMale =
          chosenVoiceId.toLowerCase().includes('male') ||
          chosenVoiceId.toLowerCase().includes('andrew') ||
          chosenVoiceId.toLowerCase().includes('brian') ||
          chosenVoiceId.toLowerCase().includes('valluvar') ||
          chosenVoiceId.toLowerCase().includes('prabhat');
        chosenVoiceId = isMale ? 'ta-IN-ValluvarNeural' : 'ta-IN-PallaviNeural';
      }

      lastAssistantSpokenTextRef.current = cleanSpoken.toLowerCase();
      console.log(
        `[TTS START] turnId=${turnId} voice="${chosenVoiceId}" speed=${speechSpeedRef.current} text="${cleanSpoken.slice(0, 70)}"`
      );

      isSpeakingRef.current = true;
      setVoiceState('speaking');
      sendAssistantSpeaking(true);

      const rawWords = text.trim().split(/\s+/);

      const handleSpeechComplete = () => {
        isSpeakingRef.current = false;
        lastSpeechEndTimeRef.current = Date.now();

        sendAssistantSpeaking(false);

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

        if (voiceModeEnabledRef.current) {
          setVoiceState('listening');
          setTimeout(() => {
            if (startContinuousListeningRef.current) {
              startContinuousListeningRef.current();
            }
          }, 120);
        } else {
          setVoiceState('idle');
        }
      };

      // Try Backend Edge Neural TTS
      let backendSuccess = false;
      try {
        const currentSpeed = speechSpeedRef.current || DEFAULT_HUMAN_SPEED;
        let audioBlob: Blob | null =
          preloadedAudioBlob && preloadedAudioBlob.size > 100 ? preloadedAudioBlob : null;

        if (!audioBlob) {
          try {
            const synthPromise = api.synthesizeSpeech(cleanSpoken, chosenVoiceId, currentSpeed);
            const timeoutPromise = new Promise<Blob | null>((resolve) =>
              setTimeout(() => resolve(null), 3500)
            );
            audioBlob = await Promise.race([synthPromise, timeoutPromise]);
          } catch (fetchErr) {
            console.warn('[TTS] Synthesis network notice:', fetchErr);
          }
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
            sendAssistantSpeaking(true);

            if (onStart) {
              try {
                const estimatedSec = cleanSpoken.split(' ').length * 0.32;
                onStart(
                  audio.duration && !isNaN(audio.duration) && audio.duration > 0
                    ? audio.duration
                    : estimatedSec
                );
              } catch (startErr) {
                console.warn('onStart error:', startErr);
              }
            }

            if (onProgress && rawWords.length > 0) {
              let lastWordCount = 0;
              progressInterval = setInterval(() => {
                if (audio.paused || audio.ended) {
                  clearInterval(progressInterval);
                  onProgress(text);
                  return;
                }
                const actualDuration =
                  audio.duration && !isNaN(audio.duration) && audio.duration > 0
                    ? audio.duration
                    : rawWords.length * 0.35;
                const ratio = Math.min(1, Math.max(0, audio.currentTime / actualDuration));
                const wordCount = Math.min(
                  rawWords.length,
                  Math.max(1, Math.ceil(ratio * rawWords.length))
                );
                if (wordCount > lastWordCount) {
                  lastWordCount = wordCount;
                  onProgress(rawWords.slice(0, wordCount).join(' '));
                }
              }, 50);
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
              console.log(
                '[TTS] Autoplay policy prevented playback until user interaction — queueing playback on first gesture'
              );
              const onGesture = () => {
                audio.play().catch(() => {});
                window.removeEventListener('click', onGesture);
                window.removeEventListener('keydown', onGesture);
                window.removeEventListener('pointerdown', onGesture);
              };
              window.addEventListener('click', onGesture, { once: true });
              window.addEventListener('keydown', onGesture, { once: true });
              window.addEventListener('pointerdown', onGesture, { once: true });
              backendSuccess = true;
            } else {
              throw playErr;
            }
          }
        }
      } catch (synthErr) {
        console.warn('[TTS] Backend synthesis notice:', synthErr);
        backendSuccess = false;
      }

      // Fallback: Browser Web Speech Synthesis
      if (!backendSuccess) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(cleanSpoken);
            const rawVoices = window.speechSynthesis.getVoices() || [];

            const isTamil = chosenVoiceId.toLowerCase().startsWith('ta');
            const isHindi = chosenVoiceId.toLowerCase().startsWith('hi');
            const isMalayalam = chosenVoiceId.toLowerCase().startsWith('ml');
            const isMale =
              chosenVoiceId.toLowerCase().includes('andrew') ||
              chosenVoiceId.toLowerCase().includes('brian') ||
              chosenVoiceId.toLowerCase().includes('valluvar') ||
              chosenVoiceId.toLowerCase().includes('madhur') ||
              chosenVoiceId.toLowerCase().includes('midhun') ||
              chosenVoiceId.toLowerCase().includes('prabhat');

            let matchedVoice = rawVoices.find((v) => v.name === chosenVoiceId);
            if (!matchedVoice && isTamil) {
              matchedVoice =
                rawVoices.find((v) => v.lang.startsWith('ta')) ||
                rawVoices.find((v) => v.lang.includes('ta'));
            }
            if (!matchedVoice && isHindi) {
              matchedVoice =
                rawVoices.find((v) => v.lang.startsWith('hi')) ||
                rawVoices.find((v) => v.lang.includes('hi'));
            }
            if (!matchedVoice && isMalayalam) {
              matchedVoice =
                rawVoices.find((v) => v.lang.startsWith('ml')) ||
                rawVoices.find((v) => v.lang.includes('ml'));
            }
            if (!matchedVoice) {
              if (isMale) {
                matchedVoice =
                  rawVoices.find(
                    (v) =>
                      v.lang.startsWith('en') &&
                      (v.name.includes('David') ||
                        v.name.includes('Guy') ||
                        v.name.includes('Male') ||
                        v.name.includes('Andrew') ||
                        v.name.includes('Brian'))
                  ) || rawVoices.find((v) => v.lang.startsWith('en'));
              } else {
                matchedVoice =
                  rawVoices.find(
                    (v) =>
                      v.lang.startsWith('en') &&
                      (v.name.includes('Zira') ||
                        v.name.includes('Jenny') ||
                        v.name.includes('Aria') ||
                        v.name.includes('Female') ||
                        v.name.includes('Ava') ||
                        v.name.includes('Emma'))
                  ) || rawVoices.find((v) => v.lang.startsWith('en'));
              }
            }
            if (!matchedVoice) {
              matchedVoice = rawVoices[0];
            }

            if (matchedVoice) {
              utterance.voice = matchedVoice;
            }
            utterance.lang =
              matchedVoice?.lang ||
              (isTamil ? 'ta-IN' : isHindi ? 'hi-IN' : isMalayalam ? 'ml-IN' : 'en-US');
            utterance.rate = speechSpeedRef.current || DEFAULT_HUMAN_SPEED;
            utterance.pitch = 1.0;

            utterance.onstart = () => {
              if (turnId !== activeTurnIdRef.current) {
                window.speechSynthesis.cancel();
                return;
              }
              isSpeakingRef.current = true;
              setVoiceState('speaking');
              sendAssistantSpeaking(true);

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

            utterance.onboundary = (event: any) => {
              if (event.name === 'word' && onProgress) {
                const charIndex = event.charIndex ?? 0;
                const charLength = event.charLength ?? 0;
                const revealed = text
                  .slice(0, Math.min(text.length, charIndex + charLength + 1))
                  .trim();
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
    [
      activeTurnIdRef,
      cancelCurrentSpeech,
      isRecognitionActiveRef,
      recognitionRef,
      selectedVoiceName,
      selectedVoiceNameRef,
      sendAssistantSpeaking,
      setVoiceState,
      speechSpeedRef,
      startContinuousListeningRef,
      voiceModeEnabledRef,
    ]
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
      const testText = 'Hello, Seyal AI voice system is active with crystal clear studio audio.';
      if (targetVoice) {
        selectedVoiceNameRef.current = targetVoice;
      }
      await speakAssistantResponse(testText, turnId);
    },
    [getNextTurnId, selectedVoiceNameRef, speakAssistantResponse]
  );

  return {
    activeAudioRef,
    activeAudioUrlRef,
    activeUtteranceRef,
    isSpeakingRef,
    isSpeechPaused,
    isSpeechPausedRef,
    lastSpeechEndTimeRef,
    lastAssistantSpokenTextRef,
    cancelCurrentSpeech,
    stopSpeaking,
    pauseSpeech,
    resumeSpeech,
    preloadAssistantAudio,
    speakAssistantResponse,
    speakText,
    speakInstant,
    testVoice,
  };
}
