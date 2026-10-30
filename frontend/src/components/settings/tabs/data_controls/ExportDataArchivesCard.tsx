import React from 'react';
import { Download, MessageSquare, ListTodo, Brain } from 'lucide-react';

interface ExportDataArchivesCardProps {
  isExportingData: boolean;
  exportTypeLoading: string | null;
  onExportConversations: () => void;
  onExportTasks: () => void;
  onExportKnowledge: () => void;
}

export const ExportDataArchivesCard: React.FC<ExportDataArchivesCardProps> = ({
  isExportingData,
  exportTypeLoading,
  onExportConversations,
  onExportTasks,
  onExportKnowledge,
}) => {
  return (
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
            onClick={onExportConversations}
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
            onClick={onExportTasks}
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
            onClick={onExportKnowledge}
            className="w-full px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportTypeLoading === 'knowledge' ? 'Exporting...' : 'Export Vault (.json)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
