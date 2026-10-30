import React from 'react';
import {
  Brain,
  Plus,
  Sparkles,
  X,
  BookOpen,
  Save,
  Copy,
  Check,
  Edit2,
  Trash2,
} from 'lucide-react';
import { KNOWLEDGE_SUGGESTIONS } from './types';

interface KnowledgeVaultSectionProps {
  filteredKnowledge: [string, string][];
  searchQuery: string;
  isAddingField: boolean;
  setIsAddingField: (v: boolean) => void;
  newKey: string;
  setNewKey: (v: string) => void;
  newValue: string;
  setNewValue: (v: string) => void;
  onSaveKnowledge: () => void;
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  onUpdateKnowledge: (k: string) => void;
  copiedKey: string | null;
  onCopyValue: (k: string, v: string) => void;
  onDeleteKnowledge: (k: string) => void;
}

export const KnowledgeVaultSection: React.FC<KnowledgeVaultSectionProps> = ({
  filteredKnowledge,
  searchQuery,
  isAddingField,
  setIsAddingField,
  newKey,
  setNewKey,
  newValue,
  setNewValue,
  onSaveKnowledge,
  editingKey,
  setEditingKey,
  editValue,
  setEditValue,
  onUpdateKnowledge,
  copiedKey,
  onCopyValue,
  onDeleteKnowledge,
}) => {
  return (
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-500/20 transition-all self-start sm:self-auto cursor-pointer"
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
              className="px-2.5 py-1 text-[11px] rounded-md bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
            >
              + {sug.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Field Form */}
      {isAddingField && (
        <div className="p-4 rounded-xl border border-cyan-500/40 bg-slate-900/90 shadow-lg shadow-black/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Teach New Detail / Fact
            </span>
            <button
              onClick={() => setIsAddingField(false)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
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
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onSaveKnowledge}
              disabled={!newKey.trim() || !newValue.trim()}
              className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline mt-1 cursor-pointer"
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
                          onClick={() => onUpdateKnowledge(k)}
                          className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                          title="Save"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group-hover:pr-2">
                        <span className="line-clamp-2">{v}</span>
                        <button
                          onClick={() => onCopyValue(k, v)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-cyan-400 transition-all ml-2 cursor-pointer"
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
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                            title="Edit Detail"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteKnowledge(k)}
                            className="p-1.5 rounded-md hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
  );
};
