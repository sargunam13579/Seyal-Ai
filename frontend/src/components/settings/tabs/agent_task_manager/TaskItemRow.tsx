import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  Terminal,
  Globe,
  Monitor,
  Folder,
  Wrench,
  ShieldAlert,
} from 'lucide-react';
import { formatDuration } from './types';

interface TaskItemRowProps {
  task: any;
  isExpanded: boolean;
  onToggleExpand: (planId: string) => void;
  copiedTaskId: string | null;
  onCopyTaskTrace: (task: any) => void;
  onCancelTask: (taskId: string) => void;
  onPermissionAction: (taskId: string, action: 'grant' | 'deny') => void;
}

export const TaskItemRow: React.FC<TaskItemRowProps> = ({
  task,
  isExpanded,
  onToggleExpand,
  copiedTaskId,
  onCopyTaskTrace,
  onCancelTask,
  onPermissionAction,
}) => {
  const isRunning = task.status === 'in_progress' || task.status === 'running';
  const isCompleted = task.status === 'completed';
  const isPending = task.status === 'pending' || task.status === 'planning' || task.status === 'paused';
  const isWaitingPermission = task.status === 'waiting_permission';
  const isFailed = task.status === 'failed';
  const isCancelled = task.status === 'cancelled';
  const totalSteps = task.total_steps || task.steps?.length || 1;
  const completedSteps = task.completed_steps || (isCompleted ? totalSteps : 0);
  const percent = Math.min(100, Math.round((completedSteps / Math.max(1, totalSteps)) * 100));
  const durationStr = formatDuration(task.started_at || task.created_at, task.completed_at);

  const renderToolIcon = (toolName?: string) => {
    const t = (toolName || '').toLowerCase();
    if (t.includes('term') || t.includes('cmd') || t.includes('bash') || t.includes('shell')) {
      return <Terminal className="w-3.5 h-3.5 text-cyan-400" />;
    }
    if (t.includes('web') || t.includes('browser') || t.includes('http') || t.includes('url')) {
      return <Globe className="w-3.5 h-3.5 text-blue-400" />;
    }
    if (t.includes('screen') || t.includes('som') || t.includes('vision') || t.includes('window')) {
      return <Monitor className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (t.includes('file') || t.includes('fs') || t.includes('dir')) {
      return <Folder className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <Wrench className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/30 transition-all overflow-hidden shadow-sm">
      {/* Card Header Row */}
      <div className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Status Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isRunning
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400'
                : isCompleted
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                : isWaitingPermission
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 animate-pulse'
                : isPending
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                : isFailed
                ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400'
                : isCancelled
                ? 'bg-slate-800 border border-slate-700 text-slate-400'
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isWaitingPermission ? (
              <ShieldAlert className="w-4 h-4" />
            ) : isPending ? (
              <Clock className="w-4 h-4" />
            ) : isFailed ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-100 font-mono">
                {task.goal?.description || task.title || 'Autonomous Agent Task'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-950 text-slate-400 border border-slate-800">
                {task.plan_id}
              </span>
              {/* Type Badge */}
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  (task.task_type || task.spec?.task_type) === 'scheduled'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : (task.task_type || task.spec?.task_type) === 'continuous'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : (task.task_type || task.spec?.task_type) === 'conditional'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {task.task_type || task.spec?.task_type || 'Immediate'}
              </span>
            </div>

            {/* Metadata row: steps, created time, latency */}
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2.5">
              <span>
                {completedSteps} / {totalSteps} steps completed
              </span>
              <span>•</span>
              <span>
                {task.created_at
                  ? new Date(
                      typeof task.created_at === 'number' && task.created_at < 1e12
                        ? task.created_at * 1000
                        : task.created_at
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'Recently'}
              </span>
              {durationStr && (
                <>
                  <span>•</span>
                  <span className="text-cyan-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {durationStr}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions on Card Header */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* Status Tag */}
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isRunning
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                : isCompleted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : isWaitingPermission
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                : isPending
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : isFailed
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {isWaitingPermission
              ? 'Needs Permission'
              : task.status === 'in_progress'
              ? 'Running'
              : task.status.replace('_', ' ')}
          </span>

          {/* Grant / Deny Buttons */}
          {isWaitingPermission && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPermissionAction(task.plan_id || task.id, 'grant')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                title="Allow agent to proceed"
              >
                Grant
              </button>
              <button
                type="button"
                onClick={() => onPermissionAction(task.plan_id || task.id, 'deny')}
                className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 text-[11px] font-medium transition-all cursor-pointer"
                title="Reject task"
              >
                Deny
              </button>
            </div>
          )}

          {/* Cancel Running Task */}
          {isRunning && (
            <button
              type="button"
              onClick={() => onCancelTask(task.plan_id)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-all cursor-pointer"
              title="Cancel running task"
            >
              Cancel
            </button>
          )}

          {/* Copy Trace JSON */}
          <button
            type="button"
            onClick={() => onCopyTaskTrace(task)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-all cursor-pointer"
            title="Copy Task JSON Trace"
          >
            {copiedTaskId === task.plan_id ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Expand / Collapse Steps */}
          {task.steps && task.steps.length > 0 && (
            <button
              type="button"
              onClick={() => onToggleExpand(task.plan_id)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/60 cursor-pointer"
              title={isExpanded ? 'Hide steps' : 'View steps'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 sm:px-5 pb-3">
        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
          <div
            className={`h-full transition-all duration-500 ${
              isCompleted
                ? 'bg-emerald-500'
                : isFailed
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Expanded Step-by-Step Breakdown */}
      {isExpanded && task.steps && task.steps.length > 0 && (
        <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Execution Step Details ({task.steps.length})</span>
            <span className="text-[10px] font-mono text-cyan-400">
              {percent}% Complete
            </span>
          </div>
          {task.steps.map((step: any, sIdx: number) => {
            const stepDuration = formatDuration(step.started_at, step.completed_at);
            return (
              <div
                key={step.step_id || sIdx}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/70 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {sIdx + 1}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium text-slate-200 truncate">
                      {step.description || 'Action step'}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      {step.tool_name && (
                        <span className="text-[10px] font-mono text-cyan-400/90 flex items-center gap-1 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                          {renderToolIcon(step.tool_name)}
                          {step.tool_name}
                        </span>
                      )}
                      {stepDuration && (
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {stepDuration}
                        </span>
                      )}
                    </div>
                    {step.error && (
                      <div className="text-[10px] font-mono text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-500/30 mt-1">
                        Error: {step.error}
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                    step.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : step.status === 'running'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                      : step.status === 'failed'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
