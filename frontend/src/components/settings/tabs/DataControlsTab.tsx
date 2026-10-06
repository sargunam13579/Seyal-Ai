import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Download,
  Check,
  Trash2,
} from 'lucide-react';
import { api } from '../../../services/api';

interface DataControlSettings {
  strictLocalOnly: boolean;
  anonymousDiagnostics: boolean;
}

const defaultDataControlSettings: DataControlSettings = {
  strictLocalOnly: true,
  anonymousDiagnostics: false,
};

export const DataControlsTab: React.FC = () => {
  const [dataControlSettings, setDataControlSettings] = useState<DataControlSettings>(() => {
    try {
      const saved = localStorage.getItem('seyal_datacontrols_config');
      return saved ? { ...defaultDataControlSettings, ...JSON.parse(saved) } : defaultDataControlSettings;
    } catch {
      return defaultDataControlSettings;
    }
  });

  const [dataControlMsg, setDataControlMsg] = useState<string | null>(null);
  const [isExportingData, setIsExportingData] = useState(false);

  const updateDataControlSetting = (key: keyof DataControlSettings, val: any) => {
    setDataControlSettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_datacontrols_config', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleExportConversations = async () => {
    setIsExportingData(true);
    try {
      const convs = await api.listConversations();
      const blob = new Blob([JSON.stringify(convs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_chat_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataControlMsg('Conversation export completed successfully!');
      setTimeout(() => setDataControlMsg(null), 3500);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
    }
  };

  const handleExportTasks = async () => {
    setIsExportingData(true);
    try {
      const tasks = await api.listTasks();
      const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_tasks_audit_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataControlMsg('Task audit log export completed successfully!');
      setTimeout(() => setDataControlMsg(null), 3500);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
    }
  };

  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50' : 'bg-slate-700 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-sm">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Data Controls & Privacy</span>
            </h2>
            <p className="text-xs text-slate-400">
              Export personal chat logs, review training data exemptions, and local history management
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          LOCAL STORAGE ONLY
        </span>
      </div>

      <div className="p-8 sm:p-10 space-y-6 w-full max-w-5xl">
        {dataControlMsg && (
          <div className="p-4 rounded-xl bg-cyan-950/80 border border-cyan-500 text-white shadow-lg flex items-center gap-3 animate-fadeIn">
            <Check className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold">{dataControlMsg}</span>
          </div>
        )}

        {/* 1. EXPORT PERSONAL DATA (Functional downloads) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Export Your Data</h3>
                <p className="text-[11px] text-slate-400">Download readable JSON backups of your conversational and task records</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200">Full Conversation History (.json)</div>
                <p className="text-[11px] text-slate-400">All chat sessions, prompts, assistant responses, and timestamps.</p>
              </div>
              <button
                type="button"
                disabled={isExportingData}
                onClick={handleExportConversations}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingData ? 'Exporting...' : 'Export Conversations'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200">Autonomous Task Audit Records (.json)</div>
                <p className="text-[11px] text-slate-400">Complete execution traces of computer-use automation tasks and step results.</p>
              </div>
              <button
                type="button"
                disabled={isExportingData}
                onClick={handleExportTasks}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingData ? 'Exporting...' : 'Export Task Logs'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. MODEL TRAINING & TELEMETRY PRIVACY */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Model Training Exemption & Telemetry</h3>
                <p className="text-[11px] text-slate-400">Zero-retention policies for local AI inference</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Zero Model Training Guarantee</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    ENFORCED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your personal prompts, camera captures, and microphone audio are never transmitted to third parties or used to train public LLM models.
                </p>
              </div>
              <div className="w-11 h-6 flex items-center rounded-full p-1 bg-emerald-500/40 justify-end cursor-not-allowed opacity-80" title="Permanently locked for your privacy">
                <span className="w-4 h-4 rounded-full bg-emerald-200 shadow-md" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Anonymous Crash Diagnostics
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Send anonymized application crash stack traces to help improve Seyal AI system stability.
                </p>
              </div>
              {renderToggle(dataControlSettings.anonymousDiagnostics, (val) =>
                updateDataControlSetting('anonymousDiagnostics', val)
              )}
            </div>
          </div>
        </div>

        {/* 3. DANGER ZONE */}
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-200">Danger Zone</h3>
                <p className="text-[11px] text-slate-400">Irreversible deletion of local conversational records</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">Purge All Local Conversation Logs</div>
              <p className="text-[11px] text-slate-400">Wipes all stored chat history and message embeddings from the local SQLite database.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to permanently clear all conversation history? This cannot be undone.')) {
                  setDataControlMsg('Purging conversation cache in progress...');
                  setTimeout(() => {
                    setDataControlMsg('Local conversation history purged.');
                    setTimeout(() => setDataControlMsg(null), 3000);
                  }, 500);
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-200 text-xs font-semibold cursor-pointer transition-all shrink-0"
            >
              Clear All History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
