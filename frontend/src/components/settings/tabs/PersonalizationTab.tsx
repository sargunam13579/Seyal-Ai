import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Mic,
  Plus,
  Trash2,
  Sparkles,
  Bot,
  Check,
  CheckCircle2,
  Zap,
  Save,
  Languages,
  Lightbulb,
  Radio,
  BookOpen,
} from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';
import type { VoiceStatusResponse } from '../../../types';
import { FrequentTaskShortcutsManager } from '../FrequentTaskShortcutsManager';

interface PersonalizationConfig {
  communicationTone: 'action' | 'executive' | 'copilot' | 'mentor';
  customInstructions: string;
  proactiveSuggestions: boolean;
  languageAutoSwitching: boolean;
  conciseCodeOnly: boolean;
}

const defaultPersonalizationConfig: PersonalizationConfig = {
  communicationTone: 'action',
  customInstructions:
    'Prefer Tamil when speaking aloud, English when writing code. Always write modular Python & TypeScript. Prefer PowerShell syntax for Windows commands.',
  proactiveSuggestions: true,
  languageAutoSwitching: true,
  conciseCodeOnly: false,
};

const TONE_PRESETS = [
  {
    id: 'action',
    name: 'Action-First Operator',
    tag: 'Direct & Rapid Execution (Default)',
    desc: 'Zero pleasantries, immediate execution, concise status updates.',
    icon: '⚡',
  },
  {
    id: 'executive',
    name: 'Executive Advisor',
    tag: 'Structured & Formal',
    desc: 'Polished briefings, bulleted action items, executive tone.',
    icon: '💼',
  },
  {
    id: 'copilot',
    name: 'Pair-Programmer & Co-Pilot',
    tag: 'Friendly Tech Collaborator',
    desc: 'Pragmatic coding companion, architectural insights.',
    icon: '🤝',
  },
  {
    id: 'mentor',
    name: 'Detailed Mentor',
    tag: 'Explanatory & Educational',
    desc: 'Step-by-step reasoning, helpful background context.',
    icon: '🎓',
  },
];

const POPULAR_ALIAS_CHIPS = ['Seyal', 'Computer', 'Aria', 'Friday', 'Nova', 'Assistant'];

export const PersonalizationTab: React.FC = () => {
  const { identity, refreshState, addActivity } = useSeyalAi();

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatusResponse | null>(null);
  const [voicePipelineActive, setVoicePipelineActive] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [isAddingAlias, setIsAddingAlias] = useState(false);

  // Personalization settings
  const [config, setConfig] = useState<PersonalizationConfig>(() => {
    try {
      const saved = localStorage.getItem('seyal_personalization_config');
      return saved ? { ...defaultPersonalizationConfig, ...JSON.parse(saved) } : defaultPersonalizationConfig;
    } catch {
      return defaultPersonalizationConfig;
    }
  });

  const [instructionsInput, setInstructionsInput] = useState(() => config.customInstructions);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .getVoiceStatus()
      .then((res) => {
        setVoiceStatus(res);
        setVoicePipelineActive(res.pipeline.running);
      })
      .catch((err) => console.warn('Could not load voice status in personalization:', err));
  }, []);

  const updateConfig = <K extends keyof PersonalizationConfig>(key: K, val: PersonalizationConfig[K]) => {
    setConfig((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_personalization_config', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save personalization config:', e);
      }
      return updated;
    });
  };

  const handleSaveInstructions = () => {
    setIsSavingInstructions(true);
    updateConfig('customInstructions', instructionsInput.trim());
    setTimeout(() => {
      setIsSavingInstructions(false);
      setFeedbackMsg('Custom prompt instructions saved. Seyal AI will apply these across all conversations.');
      addActivity({
        type: 'identity',
        title: 'Custom Instructions Updated',
        detail: 'Injected personal prompt rules into autonomous reasoning context',
        status: 'success',
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }, 400);
  };

  const handleToggleVoicePipeline = async () => {
    try {
      if (voicePipelineActive) {
        await api.stopVoice();
        setVoicePipelineActive(false);
      } else {
        await api.startVoice();
        setVoicePipelineActive(true);
      }
      const updated = await api.getVoiceStatus();
      setVoiceStatus(updated);
    } catch (err: any) {
      alert(`Voice toggle failed: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleAddAlias = async (aliasToAdd?: string) => {
    const alias = (aliasToAdd || newAlias).trim().toLowerCase();
    if (!alias) return;
    setIsAddingAlias(true);
    try {
      await api.addAlias(alias);
      setNewAlias('');
      addActivity({
        type: 'identity',
        title: 'Wake Word Alias Registered',
        detail: `Callsign alias '${alias}' registered with voice pipeline`,
        status: 'success',
      });
      await refreshState();
      setFeedbackMsg(`Alias '${alias}' registered.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      alert(`Add alias failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsAddingAlias(false);
    }
  };

  const handleRemoveAlias = async (alias: string) => {
    try {
      await api.removeAlias(alias);
      addActivity({
        type: 'identity',
        title: 'Wake Word Alias Removed',
        detail: `Alias '${alias}' revoked`,
        status: 'info',
      });
      await refreshState();
      setFeedbackMsg(`Alias '${alias}' revoked.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      alert(`Remove alias failed: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer shrink-0 ${
        checked
          ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50'
          : 'bg-slate-700/80 justify-start hover:bg-slate-600'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Personalization & Behavior Directives</span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize AI communication tone, permanent prompt instructions, wake callsigns, and task macros
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          PERSONA ACTIVE
        </span>
      </div>

      <div className="p-8 sm:p-10 space-y-7 w-full max-w-5xl">
        {feedbackMsg && (
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fadeIn shadow-md">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* 1. COMMUNICATION TONE & BEHAVIOR PRESETS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">AI Communication Tone & Persona</h3>
                <p className="text-[11px] text-slate-400">
                  Select the personality and phrasing style Seyal AI uses during voice and text interactions
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TONE_PRESETS.map((t) => {
              const isSelected = config.communicationTone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updateConfig('communicationTone', t.id as any)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/60 text-white shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span className="text-base">{t.icon}</span>
                        <span>{t.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] font-semibold text-cyan-400/90 block">{t.tag}</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{t.desc}</p>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded w-fit ${
                      isSelected
                        ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isSelected ? 'Active Tone' : 'Select'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. CUSTOM INSTRUCTIONS (PERMANENT SYSTEM DIRECTIVES) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Permanent Custom Instructions</h3>
                <p className="text-[11px] text-slate-400">
                  Directives injected into the AI's reasoning context across every conversation and autonomous plan
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
              PROMPT DIRECTIVES
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>What should Seyal AI always keep in mind when responding or operating?</span>
              <span className="text-[10px] text-slate-500 font-mono">Auto-injected into System Prompt</span>
            </label>
            <textarea
              rows={4}
              value={instructionsInput}
              onChange={(e) => setInstructionsInput(e.target.value)}
              placeholder="e.g. Always write clean Python/TypeScript code. Speak concisely in Tamil and English. Prioritize keyboard shortcuts over mouse clicks when automating windows..."
              className="w-full bg-slate-950/70 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-sans leading-relaxed"
            />

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={isSavingInstructions}
                onClick={handleSaveInstructions}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingInstructions ? 'Saving...' : 'Save Directives'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. PROACTIVITY & BEHAVIORAL TOGGLES */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Proactivity & Language Adaptation</h3>
                <p className="text-[11px] text-slate-400">Autonomous suggestions and dynamic language mirroring</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Proactive Suggestions */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Proactive Follow-Up Suggestions
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  After finishing a task, suggest logical next steps, shortcuts, or related system automations.
                </p>
              </div>
              {renderToggle(config.proactiveSuggestions, (val) => updateConfig('proactiveSuggestions', val))}
            </div>

            {/* Dynamic Language Auto-Switching */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  Dynamic Language Mirroring (Tamil / English)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically match your spoken language and dialect (English, Tamil, Tanglish) without requiring manual language switching.
                </p>
              </div>
              {renderToggle(config.languageAutoSwitching, (val) => updateConfig('languageAutoSwitching', val))}
            </div>
          </div>
        </div>

        {/* 4. WAKE WORD STATUS & CALLSIGN ALIASES */}
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
              onClick={handleToggleVoicePipeline}
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
                const alreadyExists = identity?.aliases?.some((a) => a.toLowerCase() === chip.toLowerCase());
                return (
                  <button
                    key={chip}
                    type="button"
                    disabled={alreadyExists || isAddingAlias}
                    onClick={() => handleAddAlias(chip)}
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
                onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
              />
              <button
                type="button"
                disabled={!newAlias.trim() || isAddingAlias}
                onClick={() => handleAddAlias()}
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
                identity.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-200 flex items-center gap-2"
                  >
                    <Radio className="w-3 h-3 text-cyan-400" />
                    <span>"{alias}"</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(alias)}
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

        {/* 5. FREQUENT TASK SHORTCUTS & MACROS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <FrequentTaskShortcutsManager />
        </div>
      </div>
    </div>
  );
};
