import React from 'react';
import { Plus, X } from 'lucide-react';

interface AddCustomServerModalProps {
  isOpen: boolean;
  newName: string;
  newCommand: string;
  newDesc: string;
  onNameChange: (val: string) => void;
  onCommandChange: (val: string) => void;
  onDescChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const AddCustomServerModal: React.FC<AddCustomServerModalProps> = ({
  isOpen,
  newName,
  newCommand,
  newDesc,
  onNameChange,
  onCommandChange,
  onDescChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border-2 border-cyan-500/50 shadow-xl shadow-cyan-950/40 space-y-3.5 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          Register New Model Context Protocol (MCP) Server
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Server Name / Title
          </label>
          <input
            type="text"
            placeholder="e.g. Notion MCP, Jira Connector, Local Python Tools"
            value={newName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Launch Command (stdio) or SSE URL
          </label>
          <input
            type="text"
            placeholder="e.g. npx -y @modelcontextprotocol/server-notion"
            value={newCommand}
            onChange={(e) => onCommandChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Description / Purpose
          </label>
          <input
            type="text"
            placeholder="Describe tools and capabilities provided by this server..."
            value={newDesc}
            onChange={(e) => onDescChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!newName.trim() || !newCommand.trim()}
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
        >
          Connect Server
        </button>
      </div>
    </div>
  );
};
