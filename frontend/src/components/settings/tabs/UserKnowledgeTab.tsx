import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Clock,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  BookOpen,
  Sparkles,
  Search,
  Download,
  Copy,
  Check,
  Calendar,
  FileText,
} from 'lucide-react';
import { api } from '../../../services/api';

// Starter presets for Standing Rules
const RULE_TEMPLATES = [
  {
    id: 'rule_terminal_guard',
    title: '🛡️ Destructive Terminal Guard',
    description: 'Always require explicit user confirmation before executing destructive commands (rm -rf, git reset --hard, DROP TABLE).',
    trigger_type: 'safety_hook',
  },
  {
    id: 'rule_desktop_cleanup',
    title: '🖥️ Desktop Clutter Sentinel',
    description: 'Alert me at 6:00 PM if my Windows desktop has accumulated more than 15 unorganized files.',
    trigger_type: 'background_watch',
  },
  {
    id: 'rule_deep_work_focus',
    title: '🔇 Deep Work Focus Hours',
    description: 'Suppress spoken voice responses and long notifications between 2:00 PM and 5:00 PM on weekdays.',
    trigger_type: 'scheduled_routine',
  },
  {
    id: 'rule_night_owl',
    title: '🌙 Night Owl Work Warning',
    description: 'Remind me to commit all pending code changes and conclude workspace tasks at 11:30 PM.',
    trigger_type: 'scheduled_routine',
  },
  {
    id: 'rule_concise_coder',
    title: '⚡ Code First, Zero Filler',
    description: 'In all coding queries, give clean executable TypeScript/Python code directly with minimal chat prologue.',
    trigger_type: 'prompt_directive',
  },
];

// Quick knowledge topic suggestions
const KNOWLEDGE_SUGGESTIONS = [
  { key: 'primary_role', label: 'Work Role', placeholder: 'e.g. Senior Fullstack Developer' },
  { key: 'tech_stack', label: 'Tech Stack', placeholder: 'e.g. React, TypeScript, FastAPI, Electron' },
  { key: 'preferred_editor', label: 'Primary IDE', placeholder: 'e.g. VS Code / Antigravity IDE' },
  { key: 'location_city', label: 'City / Region', placeholder: 'e.g. Chennai, Tamil Nadu' },
  { key: 'github_username', label: 'GitHub Profile', placeholder: 'e.g. @sargunam13579' },
  { key: 'communication_lang', label: 'Preferred Language', placeholder: 'e.g. Tanglish & English' },
];

export const UserKnowledgeTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'knowledge' | 'reminders' | 'rules'>('knowledge');
  const [, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. User Knowledge State
  const [knowledge, setKnowledge] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 2. Reminders State
  const [reminders, setReminders] = useState<any[]>([]);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newReminderNotes, setNewReminderNotes] = useState('');
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  // 3. Standing Rules State
  const [standingRules, setStandingRules] = useState<Record<string, any>>({});
  const [newRuleId, setNewRuleId] = useState('');
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState('background_watch');
  const [isAddingRule, setIsAddingRule] = useState(false);

  // Notification / Toast banner
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const hub = await api.getUserHub();
      setKnowledge(hub.user_knowledge || {});
      setReminders(hub.one_time_reminders || []);
      setStandingRules(hub.standing_rules || {});
    } catch (err: any) {
      console.error('Failed to load user hub data:', err);
      showToast('⚠️ Could not connect to Knowledge backend service');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Handlers: User Knowledge ---
  const handleSaveKnowledge = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      const updated = await api.setUserKnowledgeItem(newKey.trim(), newValue.trim());
      setKnowledge(updated);
      setNewKey('');
      setNewValue('');
      setIsAddingField(false);
      showToast(`Saved "${newKey}" to your Knowledge Vault ✨`);
    } catch (err: any) {
      showToast(`Failed to save: ${err.message}`);
    }
  };

  const handleUpdateKnowledge = async (key: string) => {
    if (!editValue.trim()) return;
    try {
      const updated = await api.setUserKnowledgeItem(key, editValue.trim());
      setKnowledge(updated);
      setEditingKey(null);
      setEditValue('');
      showToast(`Updated "${key}" successfully`);
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`);
    }
  };

  const handleDeleteKnowledge = async (key: string) => {
    if (!confirm(`Are you sure you want to remove "${key}" from your knowledge?`)) return;
    try {
      const updated = await api.deleteUserKnowledgeItem(key);
      setKnowledge(updated);
      showToast(`Removed "${key}" from vault`);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleCopyValue = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- Handlers: One-Time Reminders ---
  const handleAddReminder = async () => {
    if (!newReminderTitle.trim()) return;
    try {
      await api.addReminder(
        newReminderTitle.trim(),
        newReminderTime.trim() || undefined,
        newReminderNotes.trim()
      );
      setNewReminderTitle('');
      setNewReminderTime('');
      setNewReminderNotes('');
      setIsAddingReminder(false);
      await loadData(true);
      showToast('Reminder armed! Seyal AI will auto-clear when completed.');
    } catch (err: any) {
      showToast(`Failed to add reminder: ${err.message}`);
    }
  };

  const handleCompleteReminder = async (id: string, title: string) => {
    try {
      await api.completeAndRemoveReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      showToast(`Completed and cleared: "${title}" ✨`);
    } catch (err: any) {
      showToast(`Failed to complete: ${err.message}`);
    }
  };

  // --- Handlers: Standing Rules ---
  const handleAddRule = async () => {
    if (!newRuleTitle.trim()) return;
    const ruleId = newRuleId.trim() || `rule_${Date.now()}`;
    try {
      await api.addOrUpdateStandingRule({
        id: ruleId,
        title: newRuleTitle.trim(),
        description: newRuleDesc.trim(),
        trigger_type: newRuleTrigger,
        active: true,
      });
      setNewRuleId('');
      setNewRuleTitle('');
      setNewRuleDesc('');
      setIsAddingRule(false);
      await loadData(true);
      showToast('Standing Rule registered and active in background!');
    } catch (err: any) {
      showToast(`Failed to register rule: ${err.message}`);
    }
  };

  const handleApplyTemplate = async (template: typeof RULE_TEMPLATES[0]) => {
    try {
      await api.addOrUpdateStandingRule({
        id: template.id,
        title: template.title,
        description: template.description,
        trigger_type: template.trigger_type,
        active: true,
      });
      await loadData(true);
      showToast(`Activated template: "${template.title}" 🚀`);
    } catch (err: any) {
      showToast(`Failed to activate template: ${err.message}`);
    }
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      const updated = await api.toggleStandingRule(ruleId, !currentActive);
      setStandingRules((prev) => ({
        ...prev,
        [ruleId]: updated,
      }));
      showToast(`Rule ${!currentActive ? 'Activated' : 'Paused'}`);
    } catch (err: any) {
      showToast(`Toggle failed: ${err.message}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to permanently delete this standing rule?')) return;
    try {
      await api.deleteStandingRule(ruleId);
      setStandingRules((prev) => {
        const copy = { ...prev };
        delete copy[ruleId];
        return copy;
      });
      showToast('Standing rule removed');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // --- Export JSON ---
  const handleExportVault = () => {
    const payload = {
      app: 'Seyal AI Desktop',
      exported_at: new Date().toISOString(),
      user_knowledge: knowledge,
      one_time_reminders: reminders,
      standing_rules: standingRules,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seyal_knowledge_vault_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vault exported as JSON backup 💾');
  };

  // Filtered Knowledge entries
  const filteredKnowledge = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return Object.entries(knowledge);
    return Object.entries(knowledge).filter(
      ([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q)
    );
  }, [knowledge, searchQuery]);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return reminders;
    return reminders.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.target_time?.toLowerCase().includes(q)
    );
  }, [reminders, searchQuery]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return Object.entries(standingRules);
    return Object.entries(standingRules).filter(
      ([id, r]) =>
        id.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [standingRules, searchQuery]);

  // Counts
  const totalKnowledge = Object.keys(knowledge).length;
  const totalReminders = reminders.length;
  const activeRulesCount = Object.values(standingRules).filter((r: any) => r.active).length;

  return (
    <div className="space-y-6">
      {/* Sticky Cyber Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#080e1d]/90 border-b border-cyan-500/20 -mx-6 px-6 py-4 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
              <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 tracking-wide">
                User Knowledge & Rules Hub
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Persistent Vault
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Your personal facts memory, smart self-clearing reminders, and autonomous standing rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportVault}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 hover:border-cyan-500/30 transition-all shadow-sm"
              title="Export all knowledge, reminders, and rules to JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Backup Vault
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Top HUD Metrics Bar */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800/80">
          <div
            onClick={() => setActiveSubTab('knowledge')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              activeSubTab === 'knowledge'
                ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Knowledge Facts
              </span>
              <span className="text-xs font-bold font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                {totalKnowledge}
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveSubTab('reminders')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              activeSubTab === 'reminders'
                ? 'bg-amber-950/40 border-amber-500/50 shadow-sm shadow-amber-500/10'
                : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Pending Reminders
              </span>
              <span className="text-xs font-bold font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                {totalReminders}
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveSubTab('rules')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              activeSubTab === 'rules'
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Active Watchers
              </span>
              <span className="text-xs font-bold font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {activeRulesCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-cyan-950/50 animate-in fade-in slide-in-from-top-1">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Search & Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('knowledge')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
              activeSubTab === 'knowledge'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Knowledge Vault
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {totalKnowledge}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('reminders')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
              activeSubTab === 'reminders'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            One-Time Reminders
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {totalReminders}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
              activeSubTab === 'rules'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Standing Watchers
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {activeRulesCount}
            </span>
          </button>
        </div>

        {/* Global Instant Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search vault & rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ---------------- SUB-TAB 1: USER KNOWLEDGE VAULT ---------------- */}
      {activeSubTab === 'knowledge' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                Personal Knowledge Vault
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Facts and personal context retrieved by Seyal AI during tasks. Private & locally stored.
              </p>
            </div>
            <button
              onClick={() => setIsAddingField(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-500/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Knowledge Detail
            </button>
          </div>

          {/* Quick Suggestions Pills */}
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 block mb-2">
              💡 Recommended Knowledge Topics to Teach Seyal AI:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {KNOWLEDGE_SUGGESTIONS.map((sug) => (
                <button
                  key={sug.key}
                  onClick={() => {
                    setNewKey(sug.key);
                    setIsAddingField(true);
                  }}
                  className="px-2.5 py-1 text-[11px] rounded-md bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all"
                >
                  + {sug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Field Modal / Expandable Form */}
          {isAddingField && (
            <div className="p-4 rounded-xl border border-cyan-500/40 bg-slate-900/90 shadow-lg shadow-black/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Teach New Detail / Fact
                </span>
                <button
                  onClick={() => setIsAddingField(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Key / Attribute Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. tech_stack, location, primary_workspace"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Value / Content
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. React, TypeScript, FastAPI, Electron"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsAddingField(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKnowledge}
                  disabled={!newKey.trim() || !newValue.trim()}
                  className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all disabled:opacity-50"
                >
                  Save Fact
                </button>
              </div>
            </div>
          )}

          {/* Key-Value Display Table */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/60 shadow-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold w-1/3">Knowledge Field</th>
                  <th className="py-3 px-4 font-semibold w-1/2">Remembered Detail</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredKnowledge.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BookOpen className="w-8 h-8 text-slate-600" />
                        <p className="text-xs">
                          {searchQuery ? 'No knowledge matches your search.' : 'No knowledge details saved yet.'}
                        </p>
                        {!searchQuery && (
                          <button
                            onClick={() => setIsAddingField(true)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline mt-1"
                          >
                            Add your first detail
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredKnowledge.map(([k, v]) => (
                    <tr key={k} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3 px-4 font-mono font-medium text-cyan-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                        {k}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {editingKey === k ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-cyan-500 focus:outline-none w-full text-slate-100"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateKnowledge(k)}
                              className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group-hover:pr-2">
                            <span className="line-clamp-2">{v}</span>
                            <button
                              onClick={() => handleCopyValue(k, v)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-cyan-400 transition-all ml-2"
                              title="Copy value"
                            >
                              {copiedKey === k ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingKey !== k && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingKey(k);
                                  setEditValue(v);
                                }}
                                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                                title="Edit Detail"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteKnowledge(k)}
                                className="p-1.5 rounded-md hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Detail"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 2: ONE-TIME REMINDERS ---------------- */}
      {activeSubTab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Active One-Time Reminders
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tasks that auto-clear from memory as soon as completed or dismissed.
              </p>
            </div>
            <button
              onClick={() => setIsAddingReminder(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-sm shadow-amber-500/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Reminder
            </button>
          </div>

          {/* Add Reminder Form */}
          {isAddingReminder && (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-slate-900/90 shadow-lg shadow-black/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Create One-Time Reminder
                </span>
                <button
                  onClick={() => setIsAddingReminder(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Reminder Title / Action
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Review pull request, Take medicine, Call client"
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Target Time / Condition (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 18:00, Tomorrow morning, After meeting"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Additional Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Check PR #42 on GitHub repository"
                    value={newReminderNotes}
                    onChange={(e) => setNewReminderNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Time Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 self-center mr-1">Quick times:</span>
                {['Today 6:00 PM', 'Tonight 9:30 PM', 'Tomorrow 10:00 AM', 'In 1 Hour'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewReminderTime(t)}
                    className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsAddingReminder(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReminder}
                  disabled={!newReminderTitle.trim()}
                  className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold transition-all disabled:opacity-50"
                >
                  Arm Reminder
                </button>
              </div>
            </div>
          )}

          {/* Reminders List */}
          <div className="space-y-2.5">
            {filteredReminders.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 bg-slate-900/30">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs">
                  {searchQuery ? 'No reminders match your search.' : 'No active reminders.'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Say &quot;Remind me to submit project tomorrow&quot; or click &quot;Add Reminder&quot;.
                </p>
              </div>
            ) : (
              filteredReminders.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-amber-500/40 hover:bg-slate-900/80 transition-all shadow-sm group"
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      onClick={() => handleCompleteReminder(r.id, r.title)}
                      className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors p-0.5 rounded"
                      title="Mark Complete & Remove"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                        {r.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {r.target_time && (
                          <span className="text-[11px] text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <Calendar className="w-3 h-3" />
                            {r.target_time}
                          </span>
                        )}
                        {r.notes && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-500" />
                            {r.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCompleteReminder(r.id, r.title)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Done & Clear
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 3: STANDING RULES & WATCHERS ---------------- */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Permanent Standing Rules & Watchers
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Autonomous continuous rules that continuously govern Seyal AI&apos;s behavior.
              </p>
            </div>
            <button
              onClick={() => setIsAddingRule(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-500/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Rule
            </button>
          </div>

          {/* 1-Click Starter Rule Templates */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                1-Click Recommended Rule Templates
              </span>
              <span className="text-[10px] text-slate-500">Click to instantly install</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {RULE_TEMPLATES.map((tmpl) => {
                const isInstalled = !!standingRules[tmpl.id];
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl)}
                    disabled={isInstalled}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isInstalled
                        ? 'bg-emerald-950/20 border-emerald-500/30 opacity-70 cursor-default'
                        : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{tmpl.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{tmpl.description}</p>
                    </div>
                    <span
                      className={`text-[9px] mt-2 font-mono font-medium self-end px-1.5 py-0.5 rounded ${
                        isInstalled
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-cyan-400 bg-cyan-500/10'
                      }`}
                    >
                      {isInstalled ? '✓ Installed' : '+ Add Rule'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Rule Form */}
          {isAddingRule && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-slate-900/90 shadow-lg shadow-black/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Define Standing Rule
                </span>
                <button
                  onClick={() => setIsAddingRule(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Rule Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Homework Reminder, Git Cleanliness"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Trigger Type
                  </label>
                  <select
                    value={newRuleTrigger}
                    onChange={(e) => setNewRuleTrigger(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="background_watch">Background Watcher (Periodic)</option>
                    <option value="scheduled_routine">Scheduled Daily Routine</option>
                    <option value="safety_hook">Safety Hook (Before Command Exec)</option>
                    <option value="prompt_directive">Permanent Prompt Directive</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Instruction / Condition Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe exactly what Seyal AI should enforce or monitor continuously..."
                    value={newRuleDesc}
                    onChange={(e) => setNewRuleDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsAddingRule(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={!newRuleTitle.trim()}
                  className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold transition-all disabled:opacity-50"
                >
                  Register Rule
                </button>
              </div>
            </div>
          )}

          {/* Standing Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredRules.length === 0 ? (
              <div className="col-span-2 p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 bg-slate-900/30">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs">
                  {searchQuery ? 'No standing rules match your search.' : 'No standing rules active.'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click on one of the templates above or create a custom standing watcher.
                </p>
              </div>
            ) : (
              filteredRules.map(([ruleId, rule]) => (
                <div
                  key={ruleId}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    rule.active
                      ? 'border-emerald-500/30 bg-slate-900/70 shadow-md shadow-emerald-950/20'
                      : 'border-slate-800/60 bg-slate-900/30 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rule.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                            }`}
                          />
                          {rule.title}
                        </h4>
                        {rule.trigger_type && (
                          <span className="text-[10px] text-emerald-400 font-mono mt-0.5 inline-block">
                            [{rule.trigger_type}]
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleRule(ruleId, rule.active)}
                        className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                        title={rule.active ? 'Disable Rule' : 'Enable Rule'}
                      >
                        {rule.active ? (
                          <ToggleRight className="w-7 h-7 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-slate-600" />
                        )}
                      </button>
                    </div>

                    {rule.description && (
                      <p className="text-[11px] text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                        {rule.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-slate-800/60 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-semibold ${
                        rule.active
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rule.active ? 'ACTIVE WATCHER' : 'PAUSED'}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(ruleId)}
                      className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cyber Security & Privacy Notice Card */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-300">Privacy & Memory Security Guarantee</p>
          <p className="text-slate-400 mt-0.5">
            Knowledge facts and standing watchers are strictly stored in your local Seyal AI runtime storage. They are never transmitted to unauthorized third parties or used for external model retraining.
          </p>
        </div>
      </div>
    </div>
  );
};
