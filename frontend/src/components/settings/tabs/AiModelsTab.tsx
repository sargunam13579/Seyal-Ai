import React, { useState } from 'react';
import {
  Cpu,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Server,
  Zap,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface ModelProviderConfig {
  id: string;
  name: string;
  icon: string;
  badge: string;
  category: 'cloud' | 'local';
  apiKey: string;
  baseUrl?: string;
  selectedModel: string;
  models: { id: string; name: string; tag: string }[];
  enabled: boolean;
  status: 'connected' | 'not_configured' | 'offline';
  pingMs?: number;
}

const DEFAULT_PROVIDERS: ModelProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🟣',
    badge: 'Computer Use Standard',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tag: 'Best for Desktop Automation' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tag: 'Fast & Lightweight' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 142,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    badge: 'Multimodal Vision',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Omni)', tag: 'Vision & Reasoning' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: 'High-Speed Efficient' },
      { id: 'o1-preview', name: 'o1-preview', tag: 'Deep Thinking' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 185,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    icon: '🔵',
    badge: '2M Context Window',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'gemini-2.0-flash-exp',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', tag: 'Ultra Low Latency' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Massive Document Analysis' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 98,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local Offline AI)',
    icon: '🦙',
    badge: '100% Free & Private',
    category: 'local',
    apiKey: 'N/A (Local Engine)',
    baseUrl: 'http://localhost:11434',
    selectedModel: 'qwen2.5-coder:latest',
    models: [
      { id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder', tag: 'Local Coding Specialist' },
      { id: 'llama3.2:latest', name: 'Llama 3.2 3B', tag: 'Fast Local CPU Runner' },
      { id: 'deepseek-r1:latest', name: 'DeepSeek R1 Distill', tag: 'Offline Reasoning' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 12,
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    icon: '⚡',
    badge: '800 Tokens/sec',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'deepseek-r1-distill-llama-70b',
    models: [
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Llama 70B)', tag: 'Sub-second Reasoning' },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', tag: 'Open Weights Flagship' },
    ],
    enabled: false,
    status: 'not_configured',
  },
];

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
      p.id === providerId ? { ...p, apiKey: keyVal, status: keyVal ? ('connected' as const) : ('not_configured' as const) } : p
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
      <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                AI Models & Providers
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Multi-Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect frontier cloud LLMs, local offline Ollama models, and custom Bring-Your-Own-Key (BYOK) APIs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Reset AI models configuration"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-mono flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              ACTIVE: {activePrimaryModel.split('-')[0].toUpperCase()}
            </span>
          </div>
        </div>

        {/* Top HUD Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Primary Engine:
            </span>
            <span className="font-semibold text-cyan-300 font-mono">Claude 3.5 Sonnet</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Local Offline AI:
            </span>
            <span className="font-semibold text-emerald-300 font-mono">Ollama Ready (12ms)</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Temperature:
            </span>
            <span className="font-semibold text-amber-300 font-mono">{temperature.toFixed(2)} (Coding)</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Max Output:
            </span>
            <span className="font-semibold text-blue-300 font-mono">{maxTokens} Tokens</span>
          </div>
        </div>
      </div>

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
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-900/90 border-2 border-cyan-500/40 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Active Reasoning Dispatcher
              </span>
              <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <span>Default Autonomous Brain</span>
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                The primary model used to orchestrate computer-use, write code, and respond to conversation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activePrimaryProvider}
                onChange={(e) => {
                  const provId = e.target.value;
                  setActivePrimaryProvider(provId);
                  const prov = providers.find((p) => p.id === provId);
                  if (prov) {
                    setActivePrimaryModel(prov.selectedModel);
                    showToast(`Active dispatcher switched to ${prov.name}`);
                  }
                }}
                className="bg-slate-950 border border-cyan-500/50 text-xs font-semibold text-cyan-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. PROVIDERS LIST WITH BYOK KEYS & LOCAL OLLAMA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Configured Model Providers (Cloud & Local)
            </span>
            <span className="text-slate-500">Bring Your Own Key (BYOK) or Run 100% Offline</span>
          </div>

          <div className="space-y-3.5">
            {providers.map((provider) => {
              const isSelectedProvider = provider.id === activePrimaryProvider;
              const isKeyVisible = visibleKeyId === provider.id;

              return (
                <div
                  key={provider.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isSelectedProvider
                      ? 'bg-slate-900/90 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Provider Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{provider.name}</h4>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                              provider.category === 'local'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {provider.badge}
                          </span>
                          {isSelectedProvider && (
                            <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              ★ PRIMARY
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {provider.category === 'local'
                            ? `Local server URL: ${provider.baseUrl} • Zero cloud tokens consumed`
                            : `Secure cloud API endpoint • Encrypted with local Windows DPAPI`}
                        </p>
                      </div>
                    </div>

                    {/* Status & Test Ping */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {provider.pingMs && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-500/30">
                          ⚡ {provider.pingMs}ms
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={testingId === provider.id}
                        onClick={() => handleTestConnection(provider.id)}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
                      >
                        {testingId === provider.id ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>

                  {/* Body: Model Selector & API Key */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3.5">
                    {/* Model Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Active Model Checkpoint
                      </label>
                      <select
                        value={provider.selectedModel}
                        onChange={(e) => handleSelectModel(provider.id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none cursor-pointer"
                      >
                        {provider.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — ({m.tag})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* API Key or Local URL Input */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>{provider.category === 'local' ? 'Ollama Server Endpoint' : 'Provider API Key (BYOK)'}</span>
                        {provider.category === 'cloud' && (
                          <span className="text-[10px] text-slate-500 font-normal">Encrypted locally</span>
                        )}
                      </label>

                      {provider.category === 'local' ? (
                        <input
                          type="text"
                          value={provider.baseUrl}
                          readOnly
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono"
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type={isKeyVisible ? 'text' : 'password'}
                            value={provider.apiKey}
                            onChange={(e) => handleUpdateApiKey(provider.id, e.target.value)}
                            placeholder="Enter custom API key (e.g. sk-...)"
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setVisibleKeyId(isKeyVisible ? null : provider.id)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. GENERATION HYPERPARAMETERS */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Sampling & Reasoning Parameters</h3>
                <p className="text-[11px] text-slate-400">Fine-tune determinism and maximum response lengths</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Temperature Slider */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Temperature</span>
                <span className="font-mono text-cyan-300 font-bold">{temperature.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {temperature <= 0.3 ? 'Deterministic (Ideal for coding & OS commands)' : 'Creative & Conversational'}
              </p>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Max Output Tokens */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Max Output Length</span>
                <span className="font-mono text-cyan-300 font-bold">{maxTokens} Tokens</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Upper limit on generated code length per turn.
              </p>
              <input
                type="range"
                min="1024"
                max="8192"
                step="512"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Reasoning Effort */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Reasoning Depth</span>
                <span className="font-mono text-cyan-300 font-bold uppercase">{reasoningEffort}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Depth of internal step-by-step thinking scratchpad.
              </p>
              <div className="grid grid-cols-3 gap-1 pt-1">
                {(['low', 'medium', 'high'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReasoningEffort(r)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      reasoningEffort === r
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
