import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVoice } from '../../../context/VoiceContext';
import { api } from '../../../services/api';
import {
  VOICE_PRESETS,
  VoiceStudioHeader,
  VoicePresentationHero,
  VoiceQuickPickerGrid,
  MicrophoneTesterCard,
  SpeechCadenceCard,
  ConversationalModesCard,
} from './voice';
import type { VoicePreset } from './voice';

export const VoiceTab: React.FC = () => {
  const {
    autoVoiceResponse,
    setAutoVoiceResponse,
    selectedVoiceName,
    setSelectedVoiceName,
    speechSpeed,
    setSpeechSpeed,
    isSpeaking,
    stopSpeaking,
    speakInstant,
    recognitionLang,
    setRecognitionLang,
    autoListen,
    setAutoListen,
  } = useVoice();

  const [activeCategory, setActiveCategory] = useState<'all' | 'tamil' | 'global' | 'indian'>('all');
  const [bargeInEnabled, setBargeInEnabled] = useState(true);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  // Audio analyser references for live mic meter
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentVoiceIndex = Math.max(
    0,
    VOICE_PRESETS.findIndex((v) => v.id === selectedVoiceName)
  );
  const currentVoice = VOICE_PRESETS[currentVoiceIndex] || VOICE_PRESETS[0];

  const filteredVoices = useMemo(() => {
    if (activeCategory === 'all') return VOICE_PRESETS;
    return VOICE_PRESETS.filter((v) => v.category === activeCategory);
  }, [activeCategory]);

  const syncVoiceWithBackend = (voiceId: string) => {
    setSelectedVoiceName(voiceId);
    api.updateVoiceConfig({ tts_voice: voiceId }).catch(() => {});
  };

  const handlePrevVoice = () => {
    const nextIdx = (currentVoiceIndex - 1 + VOICE_PRESETS.length) % VOICE_PRESETS.length;
    syncVoiceWithBackend(VOICE_PRESETS[nextIdx].id);
  };

  const handleNextVoice = () => {
    const nextIdx = (currentVoiceIndex + 1) % VOICE_PRESETS.length;
    syncVoiceWithBackend(VOICE_PRESETS[nextIdx].id);
  };

  const handleTogglePlaySample = (voice: VoicePreset) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      syncVoiceWithBackend(voice.id);
      speakInstant(voice.samplePhrase);
    }
  };

  // Live Mic Level Visualizer Test
  const toggleMicTest = async () => {
    if (isMicTesting) {
      // Stop testing
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setIsMicTesting(false);
      setMicVolume(0);
    } else {
      // Start testing
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setMicVolume(normalized);
          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        setIsMicTesting(true);
        updateMeter();
      } catch (err) {
        console.warn('Microphone permission or hardware access error:', err);
        setIsMicTesting(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <VoiceStudioHeader
        isSpeaking={isSpeaking}
        currentVoice={currentVoice}
        speechSpeed={speechSpeed}
        autoVoiceResponse={autoVoiceResponse}
      />

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col items-center px-6 sm:px-12 pt-6 pb-12 w-full max-w-4xl mx-auto space-y-6">
        {/* Central Voice Hero Presentation Card */}
        <VoicePresentationHero
          currentVoice={currentVoice}
          currentVoiceIndex={currentVoiceIndex}
          isSpeaking={isSpeaking}
          onPrevVoice={handlePrevVoice}
          onNextVoice={handleNextVoice}
          onSelectVoice={syncVoiceWithBackend}
          onTogglePlaySample={handleTogglePlaySample}
        />

        {/* Quick Voice Picker Grid */}
        <VoiceQuickPickerGrid
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          filteredVoices={filteredVoices}
          selectedVoiceName={selectedVoiceName}
          onSelectVoice={syncVoiceWithBackend}
          onTogglePlaySample={handleTogglePlaySample}
        />

        {/* Detailed Controls Sections */}
        <div className="w-full space-y-4 pt-2">
          {/* Section 1: Microphone Hardware & Live Audio Meter */}
          <MicrophoneTesterCard
            isMicTesting={isMicTesting}
            micVolume={micVolume}
            toggleMicTest={toggleMicTest}
          />

          {/* Section 2: Speech Cadence (Speed) & Presets */}
          <SpeechCadenceCard
            speechSpeed={speechSpeed}
            onSpeedChange={(val) => {
              setSpeechSpeed(val);
              api.updateVoiceConfig({ tts_speed: val }).catch(() => {});
            }}
            onResetSpeed={() => {
              setSpeechSpeed(0.88);
              api.updateVoiceConfig({ tts_speed: 0.88 }).catch(() => {});
            }}
          />

          {/* Section 3: Conversational Intelligence (Language & Interruption) */}
          <ConversationalModesCard
            recognitionLang={recognitionLang}
            setRecognitionLang={setRecognitionLang}
            bargeInEnabled={bargeInEnabled}
            setBargeInEnabled={setBargeInEnabled}
            autoListen={autoListen}
            setAutoListen={setAutoListen}
            autoVoiceResponse={autoVoiceResponse}
            setAutoVoiceResponse={setAutoVoiceResponse}
            onLanguageChange={(val) => {
              api.updateVoiceConfig({ language: val }).catch(() => {});
            }}
            onInteractionModeChange={(mode) => {
              api.updateVoiceConfig({ interaction_mode: mode }).catch(() => {});
            }}
          />
        </div>
      </div>
    </div>
  );
};
