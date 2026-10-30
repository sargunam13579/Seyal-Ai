import { useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { downsampleBuffer, encodeWavBlob } from './types';

export interface UseAudioRecorderOptions {
  recognitionLangRef: React.MutableRefObject<string>;
  isSpeakingRef: React.MutableRefObject<boolean>;
  isProcessingRef: React.MutableRefObject<boolean>;
  lastSpeechEndTimeRef: React.MutableRefObject<number>;
  voiceWsRef: React.MutableRefObject<WebSocket | null>;
  sendPcmChunk: (pcm16: Int16Array) => void;
  connectWebSocket: () => void;
  onSpeechDetected: () => void;
  onSilenceTimeout: () => void;
  onFinalTranscript: (text: string) => void;
  onError: (msg: string) => void;
  setInterimTranscript: (text: string) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions) {
  const {
    recognitionLangRef,
    isSpeakingRef,
    isProcessingRef,
    lastSpeechEndTimeRef,
    voiceWsRef,
    sendPcmChunk,
    connectWebSocket,
    onSpeechDetected,
    onSilenceTimeout,
    onFinalTranscript,
    onError,
    setInterimTranscript,
  } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferChunksRef = useRef<Float32Array[]>([]);
  const isAudioSpeakingDetectedRef = useRef<boolean>(false);
  const silenceDetectionTimerRef = useRef<any>(null);
  const isTranscribingBackendRef = useRef<boolean>(false);

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
    audioBufferChunksRef.current = [];
    isAudioSpeakingDetectedRef.current = false;
  }, []);

  const startAudioVADRecorder = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }

    const hasLiveTracks =
      mediaStreamRef.current &&
      mediaStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live');

    if (hasLiveTracks && audioContextRef.current && audioContextRef.current.state !== 'closed') {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
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
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          const settings = audioTrack.getSettings ? audioTrack.getSettings() : ({} as any);
          console.log('[VOICE AEC] Microphone AudioTrack active & verified:', {
            label: audioTrack.label,
            echoCancellation: settings.echoCancellation ?? 'enabled',
            noiseSuppression: settings.noiseSuppression ?? 'enabled',
            autoGainControl: settings.autoGainControl ?? 'enabled',
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
          });
          if (settings.echoCancellation === false) {
            console.warn('[VOICE AEC] System notice: Hardware/Browser reported echoCancellation is false. Relying on neural Silero VAD echo rejection.');
          }
        }

        try {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;

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

          // Connect WebSocket stream
          connectWebSocket();

          const source = audioCtx.createMediaStreamSource(stream);

          // Web Audio DSP Pre-filter Chain:
          // 1. High-Pass Filter at 120Hz: Eliminates desk vibration, laptop fan roar, and low-frequency electrical AC hum
          const highpass = audioCtx.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.setValueAtTime(120, audioCtx.currentTime);
          highpass.Q.setValueAtTime(0.7, audioCtx.currentTime);

          // 2. Low-Pass Filter at 3800Hz: Eliminates ultrasonic/coil-whine noise and isolates human vocal formant band (120Hz-3800Hz)
          const lowpass = audioCtx.createBiquadFilter();
          lowpass.type = 'lowpass';
          lowpass.frequency.setValueAtTime(3800, audioCtx.currentTime);
          lowpass.Q.setValueAtTime(0.7, audioCtx.currentTime);

          const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptNode;

          source.connect(highpass);
          highpass.connect(lowpass);
          lowpass.connect(scriptNode);

          console.log('[VOICE] Hardware microphone active & listening (DSP Bandpass: 120Hz - 3800Hz)');

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

            // 1. Full-Duplex Continuous Stream for Real-time Acoustic Barge-In:
            if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
              const targetRate = 16000;
              const downsampled = downsampleBuffer(inputData, audioCtx.sampleRate, targetRate);
              const pcm16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) {
                const s = Math.max(-1, Math.min(1, downsampled[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
              sendPcmChunk(pcm16);
            }

            // 2. Client-side offline fallback buffer management:
            if (isSpeakingRef.current || isProcessingRef.current) {
              audioBufferChunksRef.current = [];
              isAudioSpeakingDetectedRef.current = false;
              return;
            }

            // 3. Post-TTS Acoustic Hangover Guard for offline buffer: ignore residual speaker reverb
            if (Date.now() - lastSpeechEndTimeRef.current < 400) {
              audioBufferChunksRef.current = [];
              isAudioSpeakingDetectedRef.current = false;
              return;
            }

            // Sound detected above noise floor (0.012 catches natural, clear human speech)
            if (rms > 0.012) {
              if (!isAudioSpeakingDetectedRef.current) {
                isAudioSpeakingDetectedRef.current = true;
                if (!voiceWsRef.current || voiceWsRef.current.readyState !== WebSocket.OPEN) {
                  onSpeechDetected();
                }
              }
              if (!voiceWsRef.current || voiceWsRef.current.readyState !== WebSocket.OPEN) {
                audioBufferChunksRef.current.push(new Float32Array(inputData));
              }

              if (silenceDetectionTimerRef.current) {
                clearTimeout(silenceDetectionTimerRef.current);
                silenceDetectionTimerRef.current = null;
              }
            } else if (isAudioSpeakingDetectedRef.current) {
              // Trailing speech buffer to capture ending syllables
              if (!voiceWsRef.current || voiceWsRef.current.readyState !== WebSocket.OPEN) {
                audioBufferChunksRef.current.push(new Float32Array(inputData));
              }

              if (!silenceDetectionTimerRef.current) {
                silenceDetectionTimerRef.current = setTimeout(async () => {
                  isAudioSpeakingDetectedRef.current = false;
                  onSilenceTimeout();
                  silenceDetectionTimerRef.current = null;

                  const chunks = audioBufferChunksRef.current;
                  audioBufferChunksRef.current = [];

                  // Need at least ~0.25s of audio to be a real utterance
                  if (chunks.length < 2) {
                    return;
                  }

                  // If WebSocket is connected and streaming, let the WebSocket handle STT
                  if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
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
                      onFinalTranscript(res.text.trim());
                    } else {
                      setInterimTranscript('');
                      if (res && res.error) {
                        console.warn('[VOICE VAD] STT error:', res.error);
                        onError(`Speech recognition: ${res.error}`);
                      } else {
                        onError('Voice not clearly recognized. Please speak closer to microphone.');
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
          const silentGain = audioCtx.createGain();
          silentGain.gain.value = 0;
          scriptNode.connect(silentGain);
          silentGain.connect(audioCtx.destination);
        } catch (audioCtxErr) {
          console.warn('[VOICE] AudioContext initialization notice:', audioCtxErr);
        }
      })
      .catch((err) => {
        console.warn('[VOICE] Mic permission access error:', err);
      });
  }, [
    recognitionLangRef,
    isSpeakingRef,
    isProcessingRef,
    lastSpeechEndTimeRef,
    voiceWsRef,
    sendPcmChunk,
    connectWebSocket,
    onSpeechDetected,
    onSilenceTimeout,
    onFinalTranscript,
    onError,
    setInterimTranscript,
  ]);

  return {
    audioContextRef,
    mediaStreamRef,
    scriptProcessorRef,
    isAudioSpeakingDetectedRef,
    startAudioVADRecorder,
    stopAudioVADRecorder,
  };
}
