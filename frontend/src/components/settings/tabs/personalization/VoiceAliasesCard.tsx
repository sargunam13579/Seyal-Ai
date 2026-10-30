import React from 'react';
import { Mic, Plus, Radio, Trash2 } from 'lucide-react';
import { POPULAR_ALIAS_CHIPS } from './types';
import type { VoiceStatusResponse } from '../../../../types';

interface VoiceAliasesCardProps {
  identity: any;
  voiceStatus: VoiceStatusResponse | null;
  voicePipelineActive: boolean;
  newAlias: string;
  setNewAlias: (val: string) => void;
  isAddingAlias: boolean;
  onToggleVoicePipeline: () => void;
  onAddAlias: (aliasToAdd?: string) => void;
  onRemoveAlias: (alias: string) => void;
}

export const VoiceAliasesCard: React.FC<VoiceAliasesCardProps> = ({
  identity,
  voiceStatus,
  voicePipelineActive,
  newAlias,
  setNewAlias,
  isAddingAlias,
  onToggleVoicePipeline,
  onAddAlias,
  onRemoveAlias,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Voice Pipeline & Callsign Aliases</h3>
            <p className="text-[11px] text-slate-400">Manage alternative wake words recognized by the local voice engine</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleVoicePipeline}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            voicePipelineActive
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{voicePipelineActive ? 'Stop Voice Detection' : 'Start Voice Detection'}</span>
        </button>
      </div>

      {/* Status info bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <span className="text-slate-400 block text-[11px]">Primary Wake Word</span>
          <span className="font-mono text-cyan-300 font-bold text-sm mt-0.5 block">
            "{identity?.wake_word || 'hey seyal'}"
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <span className="text-slate-400 block text-[11px]">Voice Engine State</span>
          <span
            className={`font-mono font-bold text-sm mt-0.5 flex items-center gap-1.5 ${
              voicePipelineActive ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${voicePipelineActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {voicePipelineActive ? 'LISTENING (VAD ACTIVE)' : 'IDLE / OFF'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <span className="text-slate-400 block text-[11px]">TTS Speech Synthesis</span>
          <span className="font-mono text-slate-300 text-xs mt-0.5 block truncate">
            {voiceStatus?.pipeline?.tts_provider || 'Microsoft Edge Neural'}
          </span>
        </div>
      </div>

      {/* Quick Alias Chips */}
      <div className="space-y-2 pt-2">
        <label className="block text-xs font-medium text-slate-300">
          Quick 1-Click Alias Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ALIAS_CHIPS.map((chip) => {
            const alreadyExists = identity?.aliases?.some((a: string) => a.toLowerCase() === chip.toLowerCase());
            return (
              <button
                key={chip}
                type="button"
                disabled={alreadyExists || isAddingAlias}
                onClick={() => onAddAlias(chip)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  alreadyExists
                    ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-default opacity-50'
                    : 'bg-slate-950/60 border-slate-800 text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-900'
                }`}
              >
                <Plus className="w-3 h-3 text-cyan-400" />
                <span>{chip}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Alias Input */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">
          Register Custom Callsign Alias
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder="Type new alias (e.g. computer, system, friday)..."
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none font-mono"
            onKeyDown={(e) => e.key === 'Enter' && onAddAlias()}
          />
          <button
            type="button"
            disabled={!newAlias.trim() || isAddingAlias}
            onClick={() => onAddAlias()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Alias</span>
          </button>
        </div>

        {/* Aliases List */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!identity?.aliases || identity.aliases.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">
              No secondary wake callsigns configured yet.
            </div>
          ) : (
            identity.aliases.map((alias: string) => (
              <span
                key={alias}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-200 flex items-center gap-2"
              >
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>"{alias}"</span>
                <button
                  type="button"
                  onClick={() => onRemoveAlias(alias)}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer ml-1"
                  title="Remove alias"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
