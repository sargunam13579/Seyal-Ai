import React from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import { AVATAR_PRESETS } from './types';
import type { AvatarPreset } from './types';

interface OperatorBadgeAvatarCardProps {
  userNameInput: string;
  identityName?: string;
  email?: string;
  uid: string;
  copiedUid: boolean;
  selectedAvatarId: string;
  currentPreset: AvatarPreset;
  userInitial: string;
  onCopyUid: () => void;
  onSelectAvatar: (presetId: string) => void;
}

export const OperatorBadgeAvatarCard: React.FC<OperatorBadgeAvatarCardProps> = ({
  userNameInput,
  identityName,
  email,
  uid,
  copiedUid,
  selectedAvatarId,
  currentPreset,
  userInitial,
  onCopyUid,
  onSelectAvatar,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-slate-900 border border-cyan-500/30 shadow-lg shadow-cyan-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="flex items-center gap-5">
        {/* Avatar Circle */}
        <div className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${currentPreset.bg} flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-500/20 shrink-0 relative group`}>
          <span>{currentPreset.icon}</span>
          <span className="absolute -bottom-1 -right-1 text-xs bg-slate-900/90 border border-cyan-500/40 px-1.5 py-0.5 rounded-md font-mono text-cyan-300 font-bold">
            {userInitial}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-lg font-bold text-white font-mono">
              {userNameInput || identityName || 'Primary Operator'}
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              LOCAL OPERATOR
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          {/* Email / UID */}
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
            <span className="flex items-center gap-1 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              {email || 'local-operator@seyal.ai'}
            </span>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={onCopyUid}
              className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer group"
              title="Click to copy UID"
            >
              <span>UID: {uid.slice(0, 14)}...</span>
              {copiedUid ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              )}
            </button>
          </div>

          <p className="text-[11px] text-cyan-300/80 font-medium">
            System Role: Primary Administrator & Autonomous Agent Controller
          </p>
        </div>
      </div>

      {/* Quick Avatar Preset Selector */}
      <div className="space-y-1.5 w-full md:w-auto">
        <span className="text-[11px] text-slate-400 font-medium block">Persona Avatar</span>
        <div className="flex items-center gap-2 flex-wrap">
          {AVATAR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectAvatar(preset.id)}
              title={preset.label}
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${preset.bg} flex items-center justify-center text-sm transition-all cursor-pointer ${
                selectedAvatarId === preset.id
                  ? 'ring-2 ring-cyan-400 scale-105 shadow-md shadow-cyan-500/40'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
            >
              <span>{preset.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
