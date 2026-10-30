import React from 'react';
import { User } from 'lucide-react';

interface LiveInterimVoiceBubbleProps {
  interimTranscript: string;
  userProfileAvatar?: string | null;
}

export const LiveInterimVoiceBubble: React.FC<LiveInterimVoiceBubbleProps> = ({
  interimTranscript,
  userProfileAvatar,
}) => {
  if (!interimTranscript || !interimTranscript.trim()) return null;

  return (
    <div className="flex items-start gap-3.5 justify-end animate-fadeIn w-full">
      <div className="relative max-w-[85%] p-5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/30 border border-cyan-400/40">
        <div className="flex items-center flex-wrap gap-2 text-sm sm:text-base leading-relaxed">
          <span className="font-normal text-white tracking-wide">
            {interimTranscript.trim()}
          </span>
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-cyan-200 animate-pulse align-middle" />
        </div>
      </div>

      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-cyan-400 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-2 ring-cyan-400/30">
        {userProfileAvatar ? (
          <img
            src={userProfileAvatar}
            alt="User"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <User className="w-4.5 h-4.5" />
        )}
      </div>
    </div>
  );
};
