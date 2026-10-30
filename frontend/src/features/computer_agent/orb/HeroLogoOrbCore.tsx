import React from 'react';
import appLogo from '../../../assets/app-logo.png';

interface HeroLogoOrbCoreProps {
  voiceState: string;
  isListening: boolean;
  isRadialOpen: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const HeroLogoOrbCore: React.FC<HeroLogoOrbCoreProps> = ({
  voiceState,
  isListening,
  isRadialOpen,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  return (
    <>
      {/* Center Multi-Layer Glow & Soundwave Effects */}
      <div className="relative flex items-center justify-center group cursor-grab active:cursor-grabbing z-20">
        {/* Layer 1: Ambient Aura */}
        <div
          className={`absolute -inset-10 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
            voiceState === 'speaking'
              ? 'bg-gradient-to-r from-cyan-500/40 via-blue-500/50 to-purple-500/40 opacity-90 scale-125'
              : isListening
              ? 'bg-gradient-to-r from-rose-500/40 via-pink-500/50 to-cyan-500/40 opacity-90 scale-120 animate-pulse'
              : voiceState === 'processing'
              ? 'bg-gradient-to-r from-amber-500/40 via-cyan-500/40 to-blue-500/40 opacity-80 animate-spin-slow'
              : 'bg-cyan-500/25 opacity-70 group-hover:opacity-100 group-hover:scale-110'
          }`}
        />

        {/* Layer 2: Concentric Reactive Soundwave Rings */}
        {isListening && (
          <>
            <div className="absolute -inset-6 rounded-full border border-rose-500/40 animate-ping pointer-events-none" />
            <div className="absolute -inset-12 rounded-full border border-pink-400/30 animate-pulse pointer-events-none" />
          </>
        )}

        {voiceState === 'speaking' && (
          <>
            <div className="absolute -inset-8 rounded-full border-2 border-cyan-400/50 animate-ping pointer-events-none" />
            <div className="absolute -inset-14 rounded-full border border-blue-400/30 animate-pulse pointer-events-none" />
          </>
        )}

        {/* Layer 3: Rotating Cyber Segmented Orbital Ring */}
        <div
          className={`absolute -inset-4 rounded-full border-2 border-dashed border-cyan-400/40 pointer-events-none transition-all duration-500 ${
            isRadialOpen
              ? 'animate-[spin_6s_linear_infinite] border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
              : voiceState === 'processing'
              ? 'animate-[spin_3s_linear_infinite] border-cyan-300'
              : 'animate-[spin_24s_linear_infinite] group-hover:border-cyan-400/70'
          }`}
        />

        {/* Layer 4: Main Center Hero Logo Disc */}
        <div
          role="button"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 bg-slate-950 transition-all duration-300 touch-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
            isRadialOpen
              ? 'border-cyan-300 shadow-[0_0_50px_rgba(0,240,255,0.8)] scale-105'
              : 'border-cyan-400/70 shadow-[0_0_40px_rgba(0,240,255,0.45)] group-hover:shadow-[0_0_60px_rgba(0,240,255,0.7)] group-hover:scale-105 active:scale-95'
          }`}
          title={
            isRadialOpen
              ? 'Click center logo to collapse wheel • Drag to dismiss'
              : 'Click center logo to open 8 radial buttons • Drag to dismiss'
          }
        >
          {/* Logo Image */}
          <img
            src={appLogo}
            alt="Seyal AI Hero Logo"
            draggable={false}
            className={`w-full h-full object-cover rounded-full pointer-events-none transition-transform duration-700 ${
              isDragging ? 'scale-105' : 'group-hover:scale-105'
            }`}
          />

          {/* Holographic Sheen Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/15 via-transparent to-white/20 pointer-events-none" />

          {/* Radial Open State Glow Ring */}
          {isRadialOpen && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-300 shadow-[inset_0_0_25px_rgba(0,240,255,0.6)] animate-pulse pointer-events-none" />
          )}

          {/* Dynamic Voice State Ring Indicator */}
          <div
            className={`absolute inset-0 rounded-full border-2 transition-colors duration-300 pointer-events-none ${
              voiceState === 'speaking'
                ? 'border-cyan-300 shadow-[inset_0_0_20px_rgba(0,240,255,0.5)]'
                : isListening
                ? 'border-rose-400 shadow-[inset_0_0_20px_rgba(244,63,94,0.5)]'
                : 'border-transparent'
            }`}
          />
        </div>
      </div>

      {/* Dynamic Status Pill & Hint */}
      {!isRadialOpen && (
        <div className="absolute top-full mt-4 flex flex-col items-center pointer-events-none whitespace-nowrap">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 shadow-lg shadow-cyan-950/40 backdrop-blur-md transition-all duration-300">
            <span
              className={`w-2 h-2 rounded-full ${
                voiceState === 'speaking'
                  ? 'bg-cyan-400 animate-ping'
                  : isListening
                  ? 'bg-rose-400 animate-ping'
                  : voiceState === 'processing'
                  ? 'bg-amber-400 animate-bounce'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="font-mono text-xs font-bold tracking-wider uppercase text-cyan-200">
              {voiceState === 'speaking'
                ? 'Assistant Speaking'
                : isListening
                ? 'Listening to Voice...'
                : voiceState === 'processing'
                ? 'Thinking & Processing...'
                : 'Seyal AI Ready'}
            </span>
          </div>
        </div>
      )}
    </>
  );
};
