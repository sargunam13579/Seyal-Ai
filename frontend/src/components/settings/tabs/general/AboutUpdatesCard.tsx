import React from 'react';
import {
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface AboutUpdatesCardProps {
  onExportHealthReport: () => void;
  isCheckingUpdate: boolean;
  onCheckUpdate: () => void;
  updateChannel: 'stable' | 'beta';
  setUpdateChannel: (channel: 'stable' | 'beta') => void;
  autoDownloadUpdates: boolean;
  setAutoDownloadUpdates: (val: boolean) => void;
  updateStatus: string | null;
  showChangelog: boolean;
  setShowChangelog: (val: boolean) => void;
  renderToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const AboutUpdatesCard: React.FC<AboutUpdatesCardProps> = ({
  onExportHealthReport,
  isCheckingUpdate,
  onCheckUpdate,
  updateChannel,
  setUpdateChannel,
  autoDownloadUpdates,
  setAutoDownloadUpdates,
  updateStatus,
  showChangelog,
  setShowChangelog,
  renderToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">About Seyal AI & Software Updates</h3>
            <p className="text-[11px] text-slate-400">
              Version verification, release channel preferences, and release notes
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExportHealthReport}
          className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3 h-3 text-cyan-400" />
          Export Health JSON
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Version & Update Check */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[11px] text-slate-400">Installed Version</span>
            <div className="text-sm font-bold text-white font-mono mt-0.5 flex items-center gap-2">
              <span>Seyal AI v1.4.2 Sovereign Edition</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Latest
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Built with Electron 30, React 19, Vite, and Python FastAPI
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={isCheckingUpdate}
              onClick={onCheckUpdate}
              className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/40 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-950/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              {isCheckingUpdate ? 'Checking GitHub Releases...' : 'Check for Updates Now'}
            </button>
          </div>
        </div>

        {/* Release Channel & Settings */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
          <div>
            <span className="text-[11px] text-slate-400">Release Channel</span>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setUpdateChannel('stable')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-left ${
                  updateChannel === 'stable'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>Stable (Recommended)</div>
                <span className="text-[10px] text-slate-500 block">Verified production releases</span>
              </button>

              <button
                type="button"
                onClick={() => setUpdateChannel('beta')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-left ${
                  updateChannel === 'beta'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>Beta Canary</div>
                <span className="text-[10px] text-slate-500 block">Early experimental tools</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-xs text-slate-300">Auto-download updates</span>
            {renderToggle(autoDownloadUpdates, setAutoDownloadUpdates)}
          </div>
        </div>
      </div>

      {updateStatus && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{updateStatus}</span>
        </div>
      )}

      {/* Changelog Accordion */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
        <button
          type="button"
          onClick={() => setShowChangelog(!showChangelog)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>What's New in Sovereign Edition v1.4.2</span>
          </div>
          {showChangelog ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showChangelog && (
          <div className="px-4 pb-4 space-y-2.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3 animate-fadeIn">
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-mono">✦</span>
              <div>
                <strong className="text-slate-200">AI Models & Providers Tab:</strong> BYOK support for Claude 3.5 Sonnet, GPT-4o, Google Gemini, and local offline Ollama models.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-mono">✦</span>
              <div>
                <strong className="text-slate-200">Model Context Protocol (MCP):</strong> Native server connectors for Brave Web Search, GitHub, and safe Filesystem tool discovery.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-mono">✦</span>
              <div>
                <strong className="text-slate-200">Pro Sovereign Plan ($0 Free):</strong> Full enterprise autonomous features granted without payment restrictions during early access.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 font-mono">✦</span>
              <div>
                <strong className="text-slate-200">Sub-millisecond Hotkeys & Telemetry:</strong> Instant global shortcut triggers and live Python RPC diagnostic probes.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* External Links */}
      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
        <a
          href="https://github.com/sargunam13579/Seyal-Ai"
          target="_blank"
          rel="noreferrer"
          className="hover:text-cyan-300 transition-colors flex items-center gap-1"
        >
          <span>GitHub Repository</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </a>
        <span className="text-slate-700">•</span>
        <span className="text-slate-500">License: MIT Open Source</span>
        <span className="text-slate-700">•</span>
        <span className="text-slate-500">Build: 2026.10-release</span>
      </div>
    </div>
  );
};
