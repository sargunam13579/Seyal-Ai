import React from 'react';
import { Bot, CheckCircle2, Info, MessageSquare, Sliders, Volume2 } from 'lucide-react';
import { PERSONA_PRESETS } from './types';
import type { GeneralSettings } from './types';

interface PersonaAssistantCardProps {
  assistantName: string;
  targetName: string;
  setTargetName: (name: string) => void;
  isChangingName: boolean;
  nameChangeStatus: string | null;
  onNameChangeRequest: (nameOverride?: string) => void;
  settings: GeneralSettings;
  updateSetting: <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => void;
  renderToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const PersonaAssistantCard: React.FC<PersonaAssistantCardProps> = ({
  assistantName,
  targetName,
  setTargetName,
  isChangingName,
  nameChangeStatus,
  onNameChangeRequest,
  settings,
  updateSetting,
  renderToggle,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. ASSISTANT IDENTITY & PERSONA */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Assistant Persona & Callsign</h3>
              <p className="text-[11px] text-slate-400">
                Primary name and identity recognized by the local voice engine and chat agent
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-md bg-slate-800 text-cyan-400 border border-cyan-500/20">
            Active Call Sign: {assistantName || 'Seyal AI'}
          </span>
        </div>

        {/* Current Name Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-900 border border-cyan-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Currently Active Persona</span>
            <div className="text-xl font-bold text-white tracking-wider font-tech flex items-center gap-2 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              {assistantName || 'Seyal AI'}
            </div>
          </div>
          <span className="text-xs text-cyan-400/80 font-mono bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
            System Wake Target
          </span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Quick 1-Click Name Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {PERSONA_PRESETS.map((p) => {
              const isActive = (assistantName || 'Seyal AI').toLowerCase() === p.name.toLowerCase();
              return (
                <button
                  key={p.name}
                  type="button"
                  disabled={isActive || isChangingName}
                  onClick={() => onNameChangeRequest(p.name)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                  } disabled:opacity-50`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{p.tag}</span>
                  </div>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Rename Input */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-medium text-slate-300">
            Custom Persona Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="Type a custom name (e.g. Orion, Nova, Aria)..."
              className="flex-1 bg-slate-950/70 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
            <button
              type="button"
              disabled={!targetName.trim() || isChangingName}
              onClick={() => onNameChangeRequest()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm shadow-cyan-500/20"
            >
              {isChangingName ? 'Updating...' : 'Set Callsign'}
            </button>
          </div>
          {nameChangeStatus && (
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mt-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{nameChangeStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. RESPONSE & CHAT BEHAVIOR */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Interaction & Response Behavior</h3>
              <p className="text-[11px] text-slate-400">
                Configure output verbosity and reasoning display
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Response Verbosity */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-xs font-semibold text-slate-200">
              Default Response Verbosity
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'concise', label: 'Action-First & Concise', desc: 'Fast answers, direct executions' },
                { id: 'balanced', label: 'Balanced', desc: 'Standard conversational depth' },
                { id: 'detailed', label: 'Detailed & Explanatory', desc: 'Comprehensive step-by-step guides' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => updateSetting('responseVerbosity', v.id as any)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    settings.responseVerbosity === v.id
                      ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                      : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{v.label}</div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Show Thinking Steps */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                Display AI Reasoning & Thinking Steps
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Show the model's intermediate planning steps and tool execution logs in the conversation view.
              </p>
            </div>
            {renderToggle(settings.showThinkingSteps, (val) => updateSetting('showThinkingSteps', val))}
          </div>

          {/* Audio Chime on Complete */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                Earcon Chime on Workflow Completion
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Play a subtle acoustic notification when long-running background tasks finish.
              </p>
            </div>
            {renderToggle(settings.soundChimeOnComplete, (val) => updateSetting('soundChimeOnComplete', val))}
          </div>
        </div>
      </div>
    </div>
  );
};
