import React from 'react';
import { Server, Eye, EyeOff } from 'lucide-react';
import type { ModelProviderConfig } from './types';

interface ModelProvidersListCardProps {
  providers: ModelProviderConfig[];
  activePrimaryProvider: string;
  visibleKeyId: string | null;
  testingId: string | null;
  onUpdateApiKey: (providerId: string, keyVal: string) => void;
  onSelectModel: (providerId: string, modelId: string) => void;
  onTestConnection: (providerId: string) => void;
  setVisibleKeyId: (id: string | null) => void;
}

export const ModelProvidersListCard: React.FC<ModelProvidersListCardProps> = ({
  providers,
  activePrimaryProvider,
  visibleKeyId,
  testingId,
  onUpdateApiKey,
  onSelectModel,
  onTestConnection,
  setVisibleKeyId,
}) => {
  return (
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
                    onClick={() => onTestConnection(provider.id)}
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
                    onChange={(e) => onSelectModel(provider.id, e.target.value)}
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
                        onChange={(e) => onUpdateApiKey(provider.id, e.target.value)}
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
  );
};
