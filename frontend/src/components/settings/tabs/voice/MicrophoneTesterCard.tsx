import React from 'react';
import { Mic, MicOff, Activity } from 'lucide-react';

interface MicrophoneTesterCardProps {
  isMicTesting: boolean;
  micVolume: number;
  toggleMicTest: () => void;
}

export const MicrophoneTesterCard: React.FC<MicrophoneTesterCardProps> = ({
  isMicTesting,
  micVolume,
  toggleMicTest,
}) => {
  return (
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
  );
};
