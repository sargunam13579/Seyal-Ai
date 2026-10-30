import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Clock,
  ShieldCheck,
  RefreshCw,
  X,
  BookOpen,
  Sparkles,
  Search,
  Download,
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  KnowledgeVaultSection,
  RemindersSection,
  StandingRulesSection,
} from './user_knowledge';

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
      showToast(`Updated "${key}" successfully.`);
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`);
    }
  };

  const handleDeleteKnowledge = async (key: string) => {
    try {
      const updated = await api.deleteUserKnowledgeItem(key);
      setKnowledge(updated);
      showToast(`Deleted "${key}" from vault.`);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleCopyValue = (k: string, v: string) => {
    navigator.clipboard.writeText(v);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast(`Copied "${k}" to clipboard!`);
  };

  // --- Handlers: Reminders ---
  const handleAddReminder = async () => {
    if (!newReminderTitle.trim()) return;
    try {
      const title = newReminderTitle.trim();
      const targetTime = newReminderTime.trim() || undefined;
      const notes = newReminderNotes.trim() || undefined;
      const res = await api.addReminder(title, targetTime, notes);
      setReminders(res.one_time_reminders || []);
      setNewReminderTitle('');
      setNewReminderTime('');
      setNewReminderNotes('');
      setIsAddingReminder(false);
      showToast(`Armed reminder: "${title}" ⏰`);
    } catch (err: any) {
      showToast(`Failed to add reminder: ${err.message}`);
    }
  };

  const handleCompleteReminder = async (id: string, title?: string) => {
    try {
      const res = await api.completeAndRemoveReminder(id);
      setReminders(res.one_time_reminders || []);
      showToast(`Completed reminder: "${title || id}" ✨`);
    } catch (err: any) {
      showToast(`Dismiss error: ${err.message}`);
    }
  };

  // --- Handlers: Standing Rules ---
  const handleApplyTemplate = async (template: any) => {
    try {
      const res = await api.addOrUpdateStandingRule({
        id: template.id,
        title: template.title,
        description: template.description,
        trigger_type: template.trigger_type,
        active: true,
      });
      setStandingRules(res.standing_rules || {});
      showToast(`Standing Rule "${template.title}" activated! 🛡️`);
    } catch (err: any) {
      showToast(`Failed to apply template: ${err.message}`);
    }
  };

  const handleAddRule = async () => {
    if (!newRuleTitle.trim()) return;
    const ruleId = `rule_${Date.now()}`;
    try {
      const res = await api.addOrUpdateStandingRule({
        id: ruleId,
        title: newRuleTitle.trim(),
        description: newRuleDesc.trim(),
        trigger_type: newRuleTrigger,
        active: true,
      });
      setStandingRules(res.standing_rules || {});
      setNewRuleTitle('');
      setNewRuleDesc('');
      setIsAddingRule(false);
      showToast(`Rule "${newRuleTitle}" registered successfully.`);
    } catch (err: any) {
      showToast(`Failed to register rule: ${err.message}`);
    }
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      const res = await api.toggleStandingRule(ruleId, !currentActive);
      setStandingRules(res.standing_rules || {});
      showToast(`Rule ${!currentActive ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      showToast(`Toggle error: ${err.message}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await api.deleteStandingRule(ruleId);
      setStandingRules(res.standing_rules || {});
      showToast('Standing rule removed.');
    } catch (err: any) {
      showToast(`Delete error: ${err.message}`);
    }
  };

  const handleExportVault = () => {
    const backup = {
      export_date: new Date().toISOString(),
      user_knowledge: knowledge,
      one_time_reminders: reminders,
      standing_rules: standingRules,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seyal-knowledge-vault-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Knowledge Vault JSON exported successfully!');
  };

  // Filtered Knowledge
  const filteredKnowledge = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const entries = Object.entries(knowledge);
    if (!q) return entries;
    return entries.filter(([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q));
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 hover:border-cyan-500/30 transition-all shadow-sm cursor-pointer"
              title="Export all knowledge, reminders, and rules to JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Backup Vault
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Sections */}
      {activeSubTab === 'knowledge' && (
        <KnowledgeVaultSection
          filteredKnowledge={filteredKnowledge}
          searchQuery={searchQuery}
          isAddingField={isAddingField}
          setIsAddingField={setIsAddingField}
          newKey={newKey}
          setNewKey={setNewKey}
          newValue={newValue}
          setNewValue={setNewValue}
          onSaveKnowledge={handleSaveKnowledge}
          editingKey={editingKey}
          setEditingKey={setEditingKey}
          editValue={editValue}
          setEditValue={setEditValue}
          onUpdateKnowledge={handleUpdateKnowledge}
          copiedKey={copiedKey}
          onCopyValue={handleCopyValue}
          onDeleteKnowledge={handleDeleteKnowledge}
        />
      )}

      {activeSubTab === 'reminders' && (
        <RemindersSection
          filteredReminders={filteredReminders}
          searchQuery={searchQuery}
          isAddingReminder={isAddingReminder}
          setIsAddingReminder={setIsAddingReminder}
          newReminderTitle={newReminderTitle}
          setNewReminderTitle={setNewReminderTitle}
          newReminderTime={newReminderTime}
          setNewReminderTime={setNewReminderTime}
          newReminderNotes={newReminderNotes}
          setNewReminderNotes={setNewReminderNotes}
          onAddReminder={handleAddReminder}
          onCompleteReminder={handleCompleteReminder}
        />
      )}

      {activeSubTab === 'rules' && (
        <StandingRulesSection
          filteredRules={filteredRules}
          standingRules={standingRules}
          searchQuery={searchQuery}
          isAddingRule={isAddingRule}
          setIsAddingRule={setIsAddingRule}
          newRuleTitle={newRuleTitle}
          setNewRuleTitle={setNewRuleTitle}
          newRuleDesc={newRuleDesc}
          setNewRuleDesc={setNewRuleDesc}
          newRuleTrigger={newRuleTrigger}
          setNewRuleTrigger={setNewRuleTrigger}
          onApplyTemplate={handleApplyTemplate}
          onAddRule={handleAddRule}
          onToggleRule={handleToggleRule}
          onDeleteRule={handleDeleteRule}
        />
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

export default UserKnowledgeTab;
