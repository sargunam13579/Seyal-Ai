import React from 'react';
import {
  ShieldCheck,
  Plus,
  Sparkles,
  X,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { RULE_TEMPLATES } from './types';

interface StandingRulesSectionProps {
  filteredRules: [string, any][];
  standingRules: Record<string, any>;
  searchQuery: string;
  isAddingRule: boolean;
  setIsAddingRule: (v: boolean) => void;
  newRuleTitle: string;
  setNewRuleTitle: (v: string) => void;
  newRuleDesc: string;
  setNewRuleDesc: (v: string) => void;
  newRuleTrigger: string;
  setNewRuleTrigger: (v: string) => void;
  onApplyTemplate: (tmpl: any) => void;
  onAddRule: () => void;
  onToggleRule: (ruleId: string, currentActive: boolean) => void;
  onDeleteRule: (ruleId: string) => void;
}

export const StandingRulesSection: React.FC<StandingRulesSectionProps> = ({
  filteredRules,
  standingRules,
  searchQuery,
  isAddingRule,
  setIsAddingRule,
  newRuleTitle,
  setNewRuleTitle,
  newRuleDesc,
  setNewRuleDesc,
  newRuleTrigger,
  setNewRuleTrigger,
  onApplyTemplate,
  onAddRule,
  onToggleRule,
  onDeleteRule,
}) => {
  return (
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-500/20 transition-all self-start sm:self-auto cursor-pointer"
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
                onClick={() => onApplyTemplate(tmpl)}
                disabled={isInstalled}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
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
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
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
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onAddRule}
              disabled={!newRuleTitle.trim()}
              className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
                    onClick={() => onToggleRule(ruleId, rule.active)}
                    className="text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
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
                  onClick={() => onDeleteRule(ruleId)}
                  className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
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
  );
};
