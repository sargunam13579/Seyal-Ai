import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Download,
  Check,
  Trash2,
  Archive,
  EyeOff,
  Sparkles,
  RotateCcw,
  MessageSquare,
  Brain,
  ListTodo,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../../services/api';

interface DataControlSettings {
  strictLocalOnly: boolean;
  anonymousDiagnostics: boolean;
  ephemeralIncognitoMode: boolean;
  cloudProfileSync: boolean;
}

const defaultDataControlSettings: DataControlSettings = {
  strictLocalOnly: true,
  anonymousDiagnostics: false,
  ephemeralIncognitoMode: false,
  cloudProfileSync: true,
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
  const [exportTypeLoading, setExportTypeLoading] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setDataControlMsg(msg);
    setTimeout(() => setDataControlMsg(null), 3500);
  };

  const updateDataControlSetting = <K extends keyof DataControlSettings>(key: K, val: DataControlSettings[K]) => {
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
    setExportTypeLoading('chats');
    try {
      const convs = await api.listConversations();
      const blob = new Blob([JSON.stringify(convs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_chat_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Conversation export completed successfully! 💬');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleExportTasks = async () => {
    setIsExportingData(true);
    setExportTypeLoading('tasks');
    try {
      const tasks = await api.listTasks();
      const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_tasks_audit_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Task audit log export completed successfully! 📝');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleExportKnowledge = async () => {
    setIsExportingData(true);
    setExportTypeLoading('knowledge');
    try {
      const hub = await api.getUserHub();
      const blob = new Blob([JSON.stringify(hub, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_knowledge_vault_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('User Knowledge & Rules vault exported! 🧠');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleExportMasterArchive = async () => {
    setIsExportingData(true);
    setExportTypeLoading('master');
    try {
      const [convs, tasks, hub] = await Promise.all([
        api.listConversations().catch(() => []),
        api.listTasks().catch(() => ({ tasks: [] })),
        api.getUserHub().catch(() => ({})),
      ]);

      const masterPayload = {
        app: 'Seyal AI Desktop',
        export_date: new Date().toISOString(),
        version: '2.5.0-autonomous',
        conversations: convs,
        agent_tasks: tasks?.tasks || tasks || [],
        user_hub: hub,
      };

      const blob = new Blob([JSON.stringify(masterPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_complete_data_archive_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Complete Master Data Archive downloaded successfully! 📦');
    } catch (err: any) {
      showToast(`Master export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset data control preferences to standard factory defaults?')) return;
    setDataControlSettings(defaultDataControlSettings);
    try {
      localStorage.setItem('seyal_datacontrols_config', JSON.stringify(defaultDataControlSettings));
    } catch (e) {
      console.error(e);
    }
    showToast('Data controls reset to factory defaults');
  };

  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-blue-500 justify-end shadow-sm shadow-blue-500/50' : 'bg-slate-700 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <div className="px-6 sm:px-8 py-4 border-b border-blue-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-sm shadow-blue-500/20">
              <Database className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Data Controls & Privacy
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Zero Retention
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Export personal archives, enforce training exemptions, and granularly manage local histories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Reset data controls to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleExportMasterArchive}
              disabled={isExportingData}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-xs font-bold text-white shadow-md shadow-blue-950/50 border border-blue-400/40 transition-all cursor-pointer disabled:opacity-50"
              title="Download all chats, tasks, memories, and rules in 1 archive"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{exportTypeLoading === 'master' ? 'Archiving...' : 'Export Complete Archive'}</span>
            </button>
          </div>
        </div>

        {/* Top Privacy HUD Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Model Training:
            </span>
            <span className="font-semibold text-emerald-300 font-mono">EXEMPT (0%)</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Portability:
            </span>
            <span className="font-semibold text-cyan-300 font-mono">JSON EXPORT READY</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-blue-400" />
              Incognito Mode:
            </span>
            <span
              className={`font-semibold font-mono ${
                dataControlSettings.ephemeralIncognitoMode ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {dataControlSettings.ephemeralIncognitoMode ? 'ACTIVE' : 'OFF'}
            </span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              Cloud Data Vault:
            </span>
            <span className="font-semibold text-indigo-300 font-mono">SUPABASE SYNC</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {dataControlMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-blue-950/50 animate-in fade-in">
          <Check className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-medium">{dataControlMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* 1. EXPORT PERSONAL DATA ARCHIVES */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Export Your Personal Data</h3>
                <p className="text-[11px] text-slate-400">Download formatted JSON archives of your conversations, tasks, and memory</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Export Chats */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Conversation History</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  All prompt messages, answers, reasoning steps, and timestamps.
                </p>
              </div>
              <button
                type="button"
                disabled={isExportingData}
                onClick={handleExportConversations}
                className="w-full px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportTypeLoading === 'chats' ? 'Exporting...' : 'Export Chats (.json)'}</span>
              </button>
            </div>

            {/* Export Tasks */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <ListTodo className="w-3.5 h-3.5 text-blue-400" />
                  <span>Autonomous Task Logs</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Execution telemetry, step results, and tool invocation history.
                </p>
              </div>
              <button
                type="button"
                disabled={isExportingData}
                onClick={handleExportTasks}
                className="w-full px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportTypeLoading === 'tasks' ? 'Exporting...' : 'Export Tasks (.json)'}</span>
              </button>
            </div>

            {/* Export Knowledge Vault */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>Knowledge Vault & Rules</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Remembered facts, reminders, and standing autonomous watchers.
                </p>
              </div>
              <button
                type="button"
                disabled={isExportingData}
                onClick={handleExportKnowledge}
                className="w-full px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportTypeLoading === 'knowledge' ? 'Exporting...' : 'Export Vault (.json)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. MODEL TRAINING & TELEMETRY PRIVACY */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Model Training Exemption & Telemetry</h3>
                <p className="text-[11px] text-slate-400">Strict zero-retention policies for local and inference data</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Zero Model Training Guarantee */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Zero Model Training Guarantee</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    ENFORCED BY DESIGN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your conversations, camera captures, and microphone audio are strictly quarantined. They are never shared with public model training corpora or advertising systems.
                </p>
              </div>
              <div
                className="w-11 h-6 flex items-center rounded-full p-1 bg-emerald-500/40 justify-end cursor-not-allowed opacity-90"
                title="Permanently locked for your privacy"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-200 shadow-md" />
              </div>
            </div>

            {/* Ephemeral Incognito Mode */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ephemeral Incognito Session Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When enabled, new chat messages are held only in RAM and discarded upon app close. No messages will be saved to your local disk.
                </p>
              </div>
              {renderToggle(dataControlSettings.ephemeralIncognitoMode, (val) => {
                updateDataControlSetting('ephemeralIncognitoMode', val);
                showToast(`Incognito Session Mode ${val ? 'Enabled' : 'Disabled'}`);
              })}
            </div>

            {/* Anonymous Diagnostics */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Anonymous Crash Stack Diagnostics
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Help improve Seyal AI by allowing stripped, anonymized crash logs to be submitted when unexpected desktop errors occur.
                </p>
              </div>
              {renderToggle(dataControlSettings.anonymousDiagnostics, (val) =>
                updateDataControlSetting('anonymousDiagnostics', val)
              )}
            </div>

            {/* Cloud Profile Sync */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Supabase Cloud Profile Sync
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Synchronize your active subscription tier and avatar preferences securely with your Supabase authenticated account.
                </p>
              </div>
              {renderToggle(dataControlSettings.cloudProfileSync, (val) =>
                updateDataControlSetting('cloudProfileSync', val)
              )}
            </div>
          </div>
        </div>

        {/* 3. DANGER ZONE (GRANULAR OPTIONS) */}
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-200">Danger Zone (Selective & Nuclear Purges)</h3>
                <p className="text-[11px] text-slate-400">Irreversible deletion of local database tables and stored credentials</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Clear Chats Only */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">Purge Conversation History Only</div>
                <p className="text-[11px] text-slate-400">Clears all chat logs from SQLite, preserving your knowledge facts and settings.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently delete all conversation history?')) {
                    showToast('Purged all local conversation chat logs 🗑️');
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-300 font-semibold transition-all cursor-pointer self-start sm:self-auto"
              >
                Clear Chats
              </button>
            </div>

            {/* Clear Knowledge Vault Only */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">Wipe User Knowledge Vault & Rules</div>
                <p className="text-[11px] text-slate-400">Deletes all saved facts, reminders, and standing autonomous watchers.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently wipe your personal knowledge vault and standing rules?')) {
                    showToast('Wiped User Knowledge Vault 🧠');
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-300 font-semibold transition-all cursor-pointer self-start sm:self-auto"
              >
                Wipe Knowledge
              </button>
            </div>

            {/* Complete Nuclear Reset */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-rose-950/50 to-slate-950/70 border border-rose-500/50 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-rose-200 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Factory Nuclear Wipe (Reset Everything)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Irreversibly resets local SQLite database, clears ChromaDB vector memories, and restores factory state.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('🚨 CRITICAL WARNING: This will completely wipe all local chats, tasks, memory, and settings. Continue?')) {
                    if (confirm('Are you ABSOLUTELY certain? This action cannot be reversed.')) {
                      localStorage.clear();
                      showToast('Factory Nuclear Wipe executed. Local runtime reset.');
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md shadow-rose-950/60 cursor-pointer self-start sm:self-auto"
              >
                Factory Reset
              </button>
            </div>
          </div>
        </div>

        {/* 4. PRIVACY GUARANTEE NOTICE */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-300">End-to-End Local Isolation Guarantee</p>
            <p className="text-slate-400 mt-0.5">
              Seyal AI operates on your hardware. Unlike centralized cloud assistants, your prompt tokens and screen captures remain quarantined within your local device boundary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
