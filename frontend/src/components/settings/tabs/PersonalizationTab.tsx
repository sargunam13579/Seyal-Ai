import React, { useState, useEffect } from 'react';
import { Sliders, Mic, Plus, Trash2 } from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';
import type { VoiceStatusResponse } from '../../../types';
import { FrequentTaskShortcutsManager } from '../FrequentTaskShortcutsManager';

export const PersonalizationTab: React.FC = () => {
  const { identity, refreshState, addActivity } = useSeyalAi();

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatusResponse | null>(null);
  const [voicePipelineActive, setVoicePipelineActive] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [isAddingAlias, setIsAddingAlias] = useState(false);

  useEffect(() => {
    api
      .getVoiceStatus()
      .then((res) => {
        setVoiceStatus(res);
        setVoicePipelineActive(res.pipeline.running);
      })
      .catch((err) => console.warn('Could not load voice status in personalization:', err));
  }, []);

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

  const handleAddAlias = async () => {
    if (!newAlias.trim()) return;
    setIsAddingAlias(true);
    try {
      await api.addAlias(newAlias.trim());
      setNewAlias('');
      addActivity({
        type: 'identity',
        title: 'Wake Word Alias Added',
        detail: `Alias '${newAlias}' registered`,
        status: 'success',
      });
      await refreshState();
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
    } catch (err: any) {
      alert(`Remove alias failed: ${err?.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center gap-2.5">
        <Sliders className="w-5 h-5 text-indigo-400" />
        <h2 className="text-base font-semibold text-slate-100">Personalization & Wake Words</h2>
      </div>

      <div className="p-8 sm:p-10 space-y-6 w-full max-w-4xl">
        {/* Status card */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Primary Wake Word:</span>
            <span className="font-mono text-cyan-300 font-bold">
              "{identity?.wake_word || 'hey seyal'}"
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Voice Pipeline Status:</span>
            <span className={`font-mono font-bold ${voicePipelineActive ? 'text-emerald-400' : 'text-slate-500'}`}>
              {voicePipelineActive ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">TTS Synthesis Engine:</span>
            <span className="font-mono text-slate-300">
              {voiceStatus?.pipeline?.tts_provider || 'Microsoft Edge Neural'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-slate-300">Continuous Voice Detection</span>
          <button
            type="button"
            onClick={handleToggleVoicePipeline}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              voicePipelineActive
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            {voicePipelineActive ? 'Stop Pipeline' : 'Start Pipeline'}
          </button>
        </div>

        {/* Wake Word Aliases */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider">
            Wake Word Aliases ({identity?.aliases?.length || 0})
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="Add new alias (e.g. computer, system)..."
              className="flex-1 bg-slate-900/80 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-mono"
            />
            <button
              type="button"
              disabled={!newAlias.trim() || isAddingAlias}
              onClick={handleAddAlias}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/40 disabled:opacity-40 text-xs font-medium text-slate-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {!identity?.aliases || identity.aliases.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                No secondary aliases configured.
              </div>
            ) : (
              identity.aliases.map((alias) => (
                <div
                  key={alias}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs font-mono"
                >
                  <span className="text-slate-200">"{alias}"</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAlias(alias)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    title="Remove Alias"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION: Frequent Task Shortcuts */}
        <div className="pt-6 border-t border-slate-800/80">
          <FrequentTaskShortcutsManager />
        </div>
      </div>
    </div>
  );
};
