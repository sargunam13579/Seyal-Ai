import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../../../services/api';

export const UserKnowledgeTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'knowledge' | 'reminders' | 'rules'>('knowledge');
  const [, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 1. User Knowledge State
  const [knowledge, setKnowledge] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
      showToast(`Saved "${newKey}" to your Knowledge Vault`);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const handleUpdateKnowledge = async (key: string) => {
    if (!editValue.trim()) return;
    try {
      const updated = await api.setUserKnowledgeItem(key, editValue.trim());
      setKnowledge(updated);
      setEditingKey(null);
      setEditValue('');
      showToast(`Updated "${key}"`);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleDeleteKnowledge = async (key: string) => {
    if (!confirm(`Are you sure you want to remove "${key}" from your knowledge?`)) return;
    try {
      const updated = await api.deleteUserKnowledgeItem(key);
      setKnowledge(updated);
      showToast(`Removed "${key}"`);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
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
      showToast('Reminder added! It will auto-clear when completed.');
    } catch (err: any) {
      alert(`Failed to add reminder: ${err.message}`);
    }
  };

  const handleCompleteReminder = async (id: string, title: string) => {
    try {
      await api.completeAndRemoveReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      showToast(`Completed and cleared: "${title}" ✨`);
    } catch (err: any) {
      alert(`Failed to complete: ${err.message}`);
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
        active: true,
      });
      setNewRuleId('');
      setNewRuleTitle('');
      setNewRuleDesc('');
      setIsAddingRule(false);
      await loadData(true);
      showToast('Standing Rule registered and active!');
    } catch (err: any) {
      alert(`Failed to add rule: ${err.message}`);
    }
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      const updated = await api.toggleStandingRule(ruleId, !currentActive);
      setStandingRules((prev) => ({
        ...prev,
        [ruleId]: updated,
      }));
      showToast(`Rule ${!currentActive ? 'Enabled' : 'Disabled'}`);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
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
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            User Knowledge & Rules Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your personal knowledge vault, auto-clearing reminders, and permanent watchers.
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Toast Banner */}
      {toastMsg && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-border/40 gap-2">
        <button
          onClick={() => setActiveSubTab('knowledge')}
          className={`pb-2.5 px-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeSubTab === 'knowledge'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Knowledge Vault
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
            {Object.keys(knowledge).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`pb-2.5 px-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeSubTab === 'reminders'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4" />
          One-Time Reminders
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
            {reminders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('rules')}
          className={`pb-2.5 px-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeSubTab === 'rules'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Standing Rules & Watchers
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
            {Object.keys(standingRules).length}
          </span>
        </button>
      </div>

      {/* ---------------- SUB-TAB 1: USER KNOWLEDGE VAULT ---------------- */}
      {activeSubTab === 'knowledge' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Personal Details & Facts</h3>
              <p className="text-xs text-muted-foreground">
                Referred by Seyal AI on-demand. Never shared or leaked.
              </p>
            </div>
            <button
              onClick={() => setIsAddingField(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Detail
            </button>
          </div>

          {/* Add Field Form */}
          {isAddingField && (
            <div className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400">Add New Fact / Detail</span>
                <button
                  onClick={() => setIsAddingField(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Key / Field Name</label>
                  <input
                    type="text"
                    placeholder="e.g. course, location, hobby"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-background border border-border focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Value</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE, Chennai, Cricket"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-background border border-border focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsAddingField(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary/50 text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKnowledge}
                  disabled={!newKey.trim() || !newValue.trim()}
                  className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
                >
                  Save Fact
                </button>
              </div>
            </div>
          )}

          {/* Key-Value Display Cards/Table */}
          <div className="border border-border/40 rounded-lg overflow-hidden bg-card/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-medium w-1/3">Field</th>
                  <th className="py-2.5 px-4 font-medium w-1/2">Value</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {Object.keys(knowledge).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No details added yet. Click &quot;Add Detail&quot; to add your information.
                    </td>
                  </tr>
                ) : (
                  Object.entries(knowledge).map(([k, v]) => (
                    <tr key={k} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-indigo-400">
                        &quot;{k}&quot;
                      </td>
                      <td className="py-2.5 px-4 text-foreground font-medium">
                        {editingKey === k ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="px-2 py-1 text-xs rounded bg-background border border-indigo-500 focus:outline-none w-full"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateKnowledge(k)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span>&quot;{v}&quot;</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingKey !== k && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingKey(k);
                                  setEditValue(v);
                                }}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteKnowledge(k)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="Delete"
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Active Reminders</h3>
              <p className="text-xs text-muted-foreground">
                Tasks that auto-clear from memory as soon as completed or dismissed.
              </p>
            </div>
            <button
              onClick={() => setIsAddingReminder(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Reminder
            </button>
          </div>

          {/* Add Reminder Form */}
          {isAddingReminder && (
            <div className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400">Create Reminder</span>
                <button
                  onClick={() => setIsAddingReminder(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Reminder Title / Action</label>
                  <input
                    type="text"
                    placeholder="e.g. Call client at 4 PM, Drink water"
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-background border border-border focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Target Time / Date (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 18:30 or Tomorrow morning"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-background border border-border focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Additional Notes</label>
                  <input
                    type="text"
                    placeholder="Optional details"
                    value={newReminderNotes}
                    onChange={(e) => setNewReminderNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-background border border-border focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsAddingReminder(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary/50 text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReminder}
                  disabled={!newReminderTitle.trim()}
                  className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
                >
                  Add Reminder
                </button>
              </div>
            </div>
          )}

          {/* Reminders List */}
          <div className="space-y-2">
            {reminders.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border/60 rounded-lg text-muted-foreground text-xs">
                No active one-time reminders. Tell Seyal AI &quot;Remind me to...&quot; or add one here.
              </div>
            ) : (
              reminders.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-border/40 bg-card/60 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleCompleteReminder(r.id, r.title)}
                      className="mt-0.5 text-muted-foreground hover:text-emerald-400 transition-colors"
                      title="Mark Complete & Remove"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{r.title}</p>
                      {r.target_time && (
                        <p className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {r.target_time}
                        </p>
                      )}
                      {r.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{r.notes}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCompleteReminder(r.id, r.title)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Permanent Rules & Watchers</h3>
              <p className="text-xs text-muted-foreground">
                Continuous background rules that never expire unless you disable or delete them.
              </p>
            </div>
            <button
              onClick={() => setIsAddingRule(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </button>
          </div>

          {/* Add Rule Form */}
          {isAddingRule && (
            <div className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400">Add Standing Rule</span>
                <button
                  onClick={() => setIsAddingRule(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Rule Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Homework Check, Recycle Bin Watcher"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-background border border-border focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Condition / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Notify if recycle bin has files, or remind daily at 6 PM"
                    value={newRuleDesc}
                    onChange={(e) => setNewRuleDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-background border border-border focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsAddingRule(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary/50 text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={!newRuleTitle.trim()}
                  className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
                >
                  Register Rule
                </button>
              </div>
            </div>
          )}

          {/* Standing Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(standingRules).length === 0 ? (
              <div className="col-span-2 p-8 text-center border border-dashed border-border/60 rounded-lg text-muted-foreground text-xs">
                No standing rules active. Create a continuous rule like &quot;Recycle Bin Monitor&quot; or &quot;Daily Routine&quot;.
              </div>
            ) : (
              Object.entries(standingRules).map(([ruleId, rule]) => (
                <div
                  key={ruleId}
                  className={`p-4 rounded-lg border transition-all ${
                    rule.active
                      ? 'border-indigo-500/30 bg-card/60'
                      : 'border-border/30 bg-card/20 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        {rule.title}
                      </h4>
                      {rule.description && (
                        <p className="text-[11px] text-muted-foreground mt-1">{rule.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleRule(ruleId, rule.active)}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title={rule.active ? 'Disable Rule' : 'Enable Rule'}
                    >
                      {rule.active ? (
                        <ToggleRight className="w-6 h-6 text-indigo-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20 text-[10px]">
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${
                        rule.active
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {rule.active ? 'ACTIVE WATCHER' : 'PAUSED'}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(ruleId)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
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
    </div>
  );
};
