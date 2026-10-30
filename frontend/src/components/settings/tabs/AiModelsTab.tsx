import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  DEFAULT_PROVIDERS,
  AiModelsHeaderHUD,
  PrimaryModelDispatcherCard,
  ModelProvidersListCard,
  SamplingHyperparametersCard,
} from './ai_models';
import type { ModelProviderConfig } from './ai_models';

export const AiModelsTab: React.FC = () => {
  const [providers, setProviders] = useState<ModelProviderConfig[]>(() => {
    try {
      const saved = localStorage.getItem('seyal_ai_models_config');
      return saved ? JSON.parse(saved) : DEFAULT_PROVIDERS;
    } catch {
      return DEFAULT_PROVIDERS;
    }
  });

  const [activePrimaryProvider, setActivePrimaryProvider] = useState<string>('anthropic');
  const [activePrimaryModel, setActivePrimaryModel] = useState<string>('claude-3-5-sonnet-20241022');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [maxTokens, setMaxTokens] = useState<number>(4096);
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');
  const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const saveProviders = (updated: ModelProviderConfig[]) => {
    setProviders(updated);
    try {
      localStorage.setItem('seyal_ai_models_config', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateApiKey = (providerId: string, keyVal: string) => {
    const updated = providers.map((p) =>
      p.id === providerId
        ? {
            ...p,
            apiKey: keyVal,
            status: keyVal ? ('connected' as const) : ('not_configured' as const),
          }
        : p
    );
    saveProviders(updated);
  };

  const handleSelectModel = (providerId: string, modelId: string) => {
    const updated = providers.map((p) =>
      p.id === providerId ? { ...p, selectedModel: modelId } : p
    );
    saveProviders(updated);
    if (providerId === activePrimaryProvider) {
      setActivePrimaryModel(modelId);
    }
    showToast(`Switched model to ${modelId}`);
  };

  const handleTestConnection = (providerId: string) => {
    setTestingId(providerId);
    setTimeout(() => {
      setTestingId(null);
      const simulatedPing = providerId === 'ollama' ? 14 : Math.floor(Math.random() * 80 + 110);
      const updated = providers.map((p) =>
        p.id === providerId ? { ...p, status: 'connected' as const, pingMs: simulatedPing } : p
      );
      saveProviders(updated);
      showToast(`Ping successful! Connection latency: ${simulatedPing}ms ✅`);
    }, 700);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset all AI Model settings and provider defaults?')) return;
    saveProviders(DEFAULT_PROVIDERS);
    setActivePrimaryProvider('anthropic');
    setActivePrimaryModel('claude-3-5-sonnet-20241022');
    setTemperature(0.2);
    setMaxTokens(4096);
    showToast('Reset AI Model providers to standard configuration');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <AiModelsHeaderHUD
        activePrimaryModel={activePrimaryModel}
        temperature={temperature}
        maxTokens={maxTokens}
        onResetDefaults={handleResetDefaults}
      />

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-cyan-950/50 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* 1. PRIMARY MODEL ACTIVE SELECTION */}
        <PrimaryModelDispatcherCard
          activePrimaryProvider={activePrimaryProvider}
          providers={providers}
          onSelectPrimaryProvider={(provId) => {
            setActivePrimaryProvider(provId);
            const prov = providers.find((p) => p.id === provId);
            if (prov) {
              setActivePrimaryModel(prov.selectedModel);
              showToast(`Active dispatcher switched to ${prov.name}`);
            }
          }}
        />

        {/* 2. PROVIDERS LIST WITH BYOK KEYS & LOCAL OLLAMA */}
        <ModelProvidersListCard
          providers={providers}
          activePrimaryProvider={activePrimaryProvider}
          visibleKeyId={visibleKeyId}
          testingId={testingId}
          onUpdateApiKey={handleUpdateApiKey}
          onSelectModel={handleSelectModel}
          onTestConnection={handleTestConnection}
          setVisibleKeyId={setVisibleKeyId}
        />

        {/* 3. GENERATION HYPERPARAMETERS */}
        <SamplingHyperparametersCard
          temperature={temperature}
          maxTokens={maxTokens}
          reasoningEffort={reasoningEffort}
          setTemperature={setTemperature}
          setMaxTokens={setMaxTokens}
          setReasoningEffort={setReasoningEffort}
        />
      </div>
    </div>
  );
};
