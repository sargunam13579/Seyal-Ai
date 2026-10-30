import React, { useState, useEffect } from 'react';
import { Sliders, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';
import type { VoiceStatusResponse } from '../../../types';
import { FrequentTaskShortcutsManager } from '../FrequentTaskShortcutsManager';
import {
  defaultPersonalizationConfig,
  CommunicationToneCard,
  CustomInstructionsCard,
  BehavioralProactivityCard,
  VoiceAliasesCard,
} from './personalization';
import type { PersonalizationConfig } from './personalization';

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

    api
      .getPersonalization()
      .then((res) => {
        if (res) {
          setConfig((prev) => ({ ...prev, ...res }));
          if (res.customInstructions !== undefined) {
            setInstructionsInput(res.customInstructions);
          }
        }
      })
      .catch((err) => console.warn('Could not load personalization config from backend:', err));
  }, []);

  const updateConfig = <K extends keyof PersonalizationConfig>(key: K, val: PersonalizationConfig[K]) => {
    setConfig((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_personalization_config', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save personalization config:', e);
      }
      api.updatePersonalization(updated).catch((err) => {
        console.warn('Failed to sync personalization with backend:', err);
      });
      return updated;
    });
  };

  const handleSaveInstructions = async () => {
    setIsSavingInstructions(true);
    const updated = { ...config, customInstructions: instructionsInput.trim() };
    setConfig(updated);
    try {
      localStorage.setItem('seyal_personalization_config', JSON.stringify(updated));
      await api.updatePersonalization(updated);
      setFeedbackMsg('Custom instructions successfully saved and injected into Seyal AI Brain context.');
      addActivity({
        type: 'identity',
        title: 'Custom Instructions Updated',
        detail: 'Injected personal prompt rules into autonomous reasoning context',
        status: 'success',
      });
    } catch (err) {
      console.warn('Could not sync instructions to backend:', err);
      setFeedbackMsg('Saved to local storage, backend sync will retry.');
    } finally {
      setIsSavingInstructions(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
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
        <CommunicationToneCard
          currentTone={config.communicationTone}
          onSelectTone={(tone) => updateConfig('communicationTone', tone)}
        />

        {/* 2. CUSTOM INSTRUCTIONS (PERMANENT SYSTEM DIRECTIVES) */}
        <CustomInstructionsCard
          instructionsInput={instructionsInput}
          setInstructionsInput={setInstructionsInput}
          isSavingInstructions={isSavingInstructions}
          onSaveInstructions={handleSaveInstructions}
        />

        {/* 3. PROACTIVITY & BEHAVIORAL TOGGLES */}
        <BehavioralProactivityCard
          proactiveSuggestions={config.proactiveSuggestions}
          languageAutoSwitching={config.languageAutoSwitching}
          onToggleProactive={(val) => updateConfig('proactiveSuggestions', val)}
          onToggleLanguageAutoSwitch={(val) => updateConfig('languageAutoSwitching', val)}
        />

        {/* 4. WAKE WORD STATUS & CALLSIGN ALIASES */}
        <VoiceAliasesCard
          identity={identity}
          voiceStatus={voiceStatus}
          voicePipelineActive={voicePipelineActive}
          newAlias={newAlias}
          setNewAlias={setNewAlias}
          isAddingAlias={isAddingAlias}
          onToggleVoicePipeline={handleToggleVoicePipeline}
          onAddAlias={handleAddAlias}
          onRemoveAlias={handleRemoveAlias}
        />

        {/* 5. FREQUENT TASK SHORTCUTS & MACROS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <FrequentTaskShortcutsManager />
        </div>
      </div>
    </div>
  );
};
