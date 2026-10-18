import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  Globe,
  Activity,
  RotateCcw,
  Radio,
  Check,
} from 'lucide-react';
import { useVoice } from '../../../context/VoiceContext';
import { api } from '../../../services/api';

interface VoicePreset {
  id: string;
  name: string;
  description: string;
  gender: 'Female' | 'Male';
  locale: string;
  category: 'global' | 'tamil' | 'indian';
  gradientClass: string;
  samplePhrase: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'en-US-AvaMultilingualNeural',
    name: 'Breeze',
    description: 'Animated & earnest — Universal Multilingual Female',
    gender: 'Female',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#5468ff] via-[#8fa5ff] to-[#ffffff]',
    samplePhrase: 'Hello! I am Breeze. Ready to assist you with tasks, code, and automations.',
  },
  {
    id: 'en-US-AndrewMultilingualNeural',
    name: 'Andrew',
    description: 'Polite & warm — Universal Multilingual Male',
    gender: 'Male',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#3b82f6] via-[#6366f1] to-[#cbd5e1]',
    samplePhrase: 'Greetings! I am Andrew, your desktop copilot. How can I help you today?',
  },
  {
    id: 'en-US-EmmaMultilingualNeural',
    name: 'Emma',
    description: 'Soft & thoughtful — Universal Multilingual Female',
    gender: 'Female',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#f472b6] via-[#c084fc] to-[#fdf2f8]',
    samplePhrase: 'Hi there! I am Emma. Looking forward to making your workflow smooth and effortless.',
  },
  {
    id: 'en-US-BrianMultilingualNeural',
    name: 'Brian',
    description: 'Crisp & expressive — Universal Multilingual Male',
    gender: 'Male',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#14b8a6] via-[#0284c7] to-[#e2e8f0]',
    samplePhrase: 'Hello! Brian here. Fast, concise, and focused on getting work done.',
  },
  {
    id: 'ta-IN-PallaviNeural',
    name: 'Pallavi',
    description: 'Natural & sweet — Tamil Master Neural Female',
    gender: 'Female',
    locale: 'Tamil (India)',
    category: 'tamil',
    gradientClass: 'from-[#10b981] via-[#06b6d4] to-[#c7d2fe]',
    samplePhrase: 'வணக்கம்! நான் பல்லவி. நீங்கள் கேட்கும் கேள்விகளுக்கு தமிழில் சரளமாக பதிலளிக்க தயாராக இருக்கிறேன்.',
  },
  {
    id: 'ta-IN-ValluvarNeural',
    name: 'Valluvar',
    description: 'Traditional & deep — Tamil Master Neural Male',
    gender: 'Male',
    locale: 'Tamil (India)',
    category: 'tamil',
    gradientClass: 'from-[#64748b] via-[#3b82f6] to-[#e2e8f0]',
    samplePhrase: 'வணக்கம் நண்பரே! நான் வள்ளுவர். உங்கள் பணிகளையும் கணினி இயக்கங்களையும் உடனடி கவனத்துடன் செய்து முடிப்போம்.',
  },
  {
    id: 'en-IN-NeerjaNeural',
    name: 'Neerja',
    description: 'Warm & conversational — Indian English Female',
    gender: 'Female',
    locale: 'Indian English',
    category: 'indian',
    gradientClass: 'from-[#ec4899] via-[#8b5cf6] to-[#fed7aa]',
    samplePhrase: 'Hello! I am Neerja. Proudly tuned for natural Indian English and conversational flow.',
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat',
    description: 'Articulate & clear — Indian English Male',
    gender: 'Male',
    locale: 'Indian English',
    category: 'indian',
    gradientClass: 'from-[#f97316] via-[#eab308] to-[#fef08a]',
    samplePhrase: 'Hello! Prabhat here. Clear, professional, and ready for all your system operations.',
  },
];

const SPEED_PRESETS = [
  { label: '🧘 Relaxed', value: 0.80 },
  { label: '🌿 Natural Human', value: 0.88 },
  { label: '⚡ Standard', value: 1.00 },
  { label: '🚀 Fast Coder', value: 1.15 },
];

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
      <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Voice & Speech Engine
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Neural Studio
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure voice identity, human cadence speed, language priority, and conversational interruption.
              </p>
            </div>
          </div>

          {/* Real-time Status Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium border ${
                isSpeaking
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/30'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'
                }`}
              />
              {isSpeaking ? 'SPEAKING LIVE' : 'VOICE ENGINE READY'}
            </span>
          </div>
        </div>

        {/* Top Mini HUD Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Selected Voice:</span>
            <span className="font-semibold text-cyan-300">{currentVoice.name}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Gender / Type:</span>
            <span className="font-semibold text-slate-200">{currentVoice.gender} Neural</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Cadence:</span>
            <span className="font-mono font-semibold text-cyan-300">{speechSpeed.toFixed(2)}x</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Auto Response:</span>
            <span
              className={`font-semibold ${
                autoVoiceResponse ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {autoVoiceResponse ? 'Enabled' : 'Muted'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col items-center px-6 sm:px-12 pt-6 pb-12 w-full max-w-4xl mx-auto space-y-6">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeCategory === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            🌟 All Studio Voices (8)
          </button>
          <button
            onClick={() => setActiveCategory('tamil')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeCategory === 'tamil'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            🇮🇳 Tamil Masters (Pallavi, Valluvar)
          </button>
          <button
            onClick={() => setActiveCategory('global')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeCategory === 'global'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            🌐 Multilingual Global (Breeze, Andrew, etc.)
          </button>
          <button
            onClick={() => setActiveCategory('indian')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeCategory === 'indian'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            🎙️ Indian English (Neerja, Prabhat)
          </button>
        </div>

        {/* Central Voice Hero Presentation Card */}
        <div className="w-full p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#070c18]/90 border border-cyan-500/30 shadow-xl shadow-cyan-950/30 flex flex-col items-center relative overflow-hidden">
          {/* Animated Glow Wave Backdrop */}
          <div
            className={`absolute w-44 h-44 rounded-full bg-gradient-to-tr ${currentVoice.gradientClass} opacity-30 blur-3xl transition-all duration-700 pointer-events-none ${
              isSpeaking ? 'scale-125 opacity-50 animate-pulse' : ''
            }`}
          />

          {/* Central Orb with Audio Equalizer Animation */}
          <div className="relative flex items-center justify-center mb-5">
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-tr ${currentVoice.gradientClass} shadow-2xl shadow-cyan-950/60 flex items-center justify-center transition-all duration-700 relative overflow-hidden`}
            >
              <div className="absolute inset-0 rounded-full bg-radial from-transparent via-white/10 to-black/30" />

              {/* Dynamic Equalizer Waves when speaking */}
              {isSpeaking ? (
                <div className="flex items-center gap-1.5 z-10">
                  <span className="w-1.5 h-8 bg-white/90 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-12 bg-white/90 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-6 bg-white/90 rounded-full animate-bounce [animation-delay:-0.4s]" />
                  <span className="w-1.5 h-10 bg-white/90 rounded-full animate-bounce" />
                </div>
              ) : (
                <Volume2 className="w-10 h-10 text-white/80 z-10 drop-shadow" />
              )}
            </div>
          </div>

          {/* Voice Title and Carousel Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md mb-2">
            <button
              type="button"
              onClick={handlePrevVoice}
              className="p-2.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-full transition-all shrink-0 cursor-pointer border border-transparent hover:border-cyan-500/30"
              title="Previous voice"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center min-w-[220px]">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-wide">
                  {currentVoice.name}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {currentVoice.gender}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-normal line-clamp-1">
                {currentVoice.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextVoice}
              className="p-2.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-full transition-all shrink-0 cursor-pointer border border-transparent hover:border-cyan-500/30"
              title="Next voice"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Sample Phrase Preview Text */}
          <p className="text-xs text-cyan-200/80 italic max-w-lg text-center mt-1 mb-4 px-4 py-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
            &quot;{currentVoice.samplePhrase}&quot;
          </p>

          {/* Live Preview Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleTogglePlaySample(currentVoice)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/50 hover:shadow-cyan-500/20'
              }`}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  Stop Voice
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Listen Sample Voice
                </>
              )}
            </button>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {VOICE_PRESETS.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                onClick={() => syncVoiceWithBackend(v.id)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentVoiceIndex
                    ? 'w-4 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                    : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
                title={v.name}
              />
            ))}
          </div>
        </div>

        {/* Quick Voice Picker Grid */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Voice Select Grid
            </span>
            <span className="text-[11px] text-slate-500 font-normal">Click to switch immediately</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {filteredVoices.map((v) => {
              const isSelected = v.id === selectedVoiceName;
              return (
                <div
                  key={v.id}
                  onClick={() => syncVoiceWithBackend(v.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {v.name}
                    </span>
                    {isSelected && (
                      <span className="p-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{v.locale}</span>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">{v.gender}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlaySample(v);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition-colors"
                      title="Play sample"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Controls Sections */}
        <div className="w-full space-y-4 pt-2">
          {/* Section 1: Microphone Hardware & Live Audio Meter */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Microphone Input & Hardware Level
                </span>
              </div>
              <button
                type="button"
                onClick={toggleMicTest}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
                  isMicTesting
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/40'
                }`}
              >
                {isMicTesting ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    Stop Mic Test
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Test Mic Input
                  </>
                )}
              </button>
            </div>

            {/* Live Audio Level Meter Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Input Sound Meter:</span>
                <span className="font-mono text-cyan-300">
                  {isMicTesting ? `${micVolume}% Input Decibel` : 'Click "Test Mic Input" to calibrate'}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-75"
                  style={{ width: `${isMicTesting ? Math.max(4, micVolume) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Speech Cadence (Speed) & Presets */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Speech Cadence & Speed
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-cyan-500/30">
                {speechSpeed.toFixed(2)}x {speechSpeed === 0.88 ? '• Natural Human' : ''}
              </span>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium">0.75x</span>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.01"
                value={speechSpeed}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeechSpeed(val);
                  api.updateVoiceConfig({ tts_speed: val }).catch(() => {});
                }}
                className="flex-1 h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
              <span className="text-[10px] text-slate-500 font-medium">1.25x</span>
            </div>

            {/* Speed Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
              <div className="flex flex-wrap gap-1.5">
                {SPEED_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setSpeechSpeed(p.value);
                      api.updateVoiceConfig({ tts_speed: p.value }).catch(() => {});
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                      Math.abs(speechSpeed - p.value) < 0.02
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSpeechSpeed(0.88);
                  api.updateVoiceConfig({ tts_speed: 0.88 }).catch(() => {});
                }}
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset (0.88x)
              </button>
            </div>
          </div>

          {/* Section 3: Conversational Intelligence (Language & Interruption) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Spoken Language Detection Mode */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">Recognition Language</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Choose primary speech understanding profile for voice queries.
              </p>
              <select
                value={recognitionLang || 'auto'}
                onChange={(e) => {
                  setRecognitionLang(e.target.value);
                  api.updateVoiceConfig({ language: e.target.value }).catch(() => {});
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="auto">⚡ Tanglish & English (Latin Letters / ஆங்கில எழுத்துக்கள்)</option>
                <option value="ta-IN">🇮🇳 Pure Tamil Script (தமிழ் எழுத்துக்கள் / Tamil Unicode)</option>
                <option value="en-IN">🇮🇳 Indian English (en-IN)</option>
                <option value="en-US">🌐 US English (en-US)</option>
              </select>
              <div className="text-[10px] text-cyan-400/90 font-mono flex items-center gap-1 mt-1 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20">
                <span>✦ Pesum bothum sari, send aagum bothum sari rendume same script & language-la synchronized-ah display aagum.</span>
              </div>
            </div>

            {/* Conversational Interruption (Barge-In) */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">Barge-In Interruption</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBargeInEnabled(!bargeInEnabled)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    bargeInEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Instantly silence Seyal AI&apos;s audio output if you speak while it is talking.
              </p>
            </div>

            {/* Interaction Mode (Push to talk vs Hands free) */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Interaction Trigger</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {autoListen ? 'Hands-Free VAD' : 'Push to Talk'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAutoListen(true);
                    api.updateVoiceConfig({ interaction_mode: 'hands_free' }).catch(() => {});
                  }}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    autoListen
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Continuous VAD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoListen(false);
                    api.updateVoiceConfig({ interaction_mode: 'push_to_talk' }).catch(() => {});
                  }}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    !autoListen
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Push-to-Talk (Ctrl+Space)
                </button>
              </div>
            </div>

            {/* Auto Voice Readout */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Auto Voice Response</span>
                <button
                  type="button"
                  onClick={() => setAutoVoiceResponse(!autoVoiceResponse)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    autoVoiceResponse ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Automatically synthesize audio for every incoming assistant response in chat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
