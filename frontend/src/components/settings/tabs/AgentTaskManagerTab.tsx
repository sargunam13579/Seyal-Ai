import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ListTodo,
  RefreshCw,
  Loader2,
  StopCircle,
  Download,
  Trash2,
  Activity,
} from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';
import {
  TaskMetricsHUD,
  TaskFiltersToolbar,
  TaskItemRow,
} from './agent_task_manager';
import type { AgentTask, AgentStep } from './agent_task_manager';

export type { AgentTask, AgentStep };

export const AgentTaskManagerTab: React.FC = () => {
  const { activities, addActivity } = useSeyalAi();

  const [agentTasks, setAgentTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);
  const [isRefreshingTasks, setIsRefreshingTasks] = useState<boolean>(false);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'in_progress' | 'waiting_permission' | 'completed' | 'cancelled' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'immediate' | 'scheduled' | 'continuous' | 'conditional'>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const pollingRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadAgentTasks = async (showRefreshSpinner: boolean = false) => {
    if (showRefreshSpinner) setIsRefreshingTasks(true);
    else if (!isAutoPolling && agentTasks.length === 0) setIsLoadingTasks(true);

    try {
      const res = await api.listTasks();
      const fetchedTasks = res?.tasks || [];

      // Automatic 30-day cleanup: discard tasks created > 30 days ago
      const THIRTY_DAYS_SEC = 30 * 86400;
      const nowSec = Date.now() / 1000;
      const isWithin30Days = (t: any) => {
        const rawTime = t.created_at || t.goal?.created_at || t.started_at;
        if (!rawTime) return true;
        const timeSec =
          typeof rawTime === 'number'
            ? rawTime > 1e11
              ? rawTime / 1000
              : rawTime
            : new Date(rawTime).getTime() / 1000;
        return nowSec - timeSec <= THIRTY_DAYS_SEC;
      };

      const validTasks = fetchedTasks.filter(isWithin30Days);

      if (validTasks.length > 0) {
        setAgentTasks(validTasks);
      } else if (activities && activities.length > 0) {
        // Synthesize agent tasks from recent session activities
        const validActivities = activities.filter((a) => {
          if (!a.timestamp) return true;
          const actSec =
            typeof a.timestamp === 'number'
              ? a.timestamp > 1e11
                ? a.timestamp / 1000
                : a.timestamp
              : new Date(a.timestamp).getTime() / 1000;
          return nowSec - actSec <= THIRTY_DAYS_SEC;
        });

        const activityTasks = validActivities
          .filter((a) => a.type === 'tool_exec' || a.type === 'chat' || a.type === 'identity' || a.type === 'security')
          .slice(0, 25)
          .map((a, idx) => ({
            plan_id: `act_${a.id || idx}`,
            goal: {
              description: a.title,
              created_at: Date.now() / 1000,
            },
            status:
              a.status === 'success'
                ? 'completed'
                : a.status === 'error'
                ? 'failed'
                : a.status === 'warning'
                ? 'cancelled'
                : 'in_progress',
            total_steps: 1,
            completed_steps: a.status === 'success' ? 1 : 0,
            task_type: 'immediate',
            steps: [
              {
                step_id: `step_${idx}`,
                order: 1,
                description: a.detail,
                tool_name: a.type,
                status: a.status === 'success' ? 'completed' : a.status === 'error' ? 'failed' : 'running',
                started_at: Date.now() / 1000 - 4,
                completed_at: a.status === 'success' ? Date.now() / 1000 : null,
              },
            ],
            created_at: Date.now() / 1000 - 10,
            started_at: Date.now() / 1000 - 10,
            completed_at: a.status === 'success' ? Date.now() / 1000 : null,
          }));
        setAgentTasks(activityTasks);
      } else {
        setAgentTasks([]);
      }
    } catch (err) {
      console.warn('Failed to fetch agent tasks:', err);
    } finally {
      setIsLoadingTasks(false);
      setIsRefreshingTasks(false);
    }
  };

  useEffect(() => {
    loadAgentTasks(false);
  }, []);

  // Live Auto-Polling Interval
  useEffect(() => {
    if (isAutoPolling) {
      pollingRef.current = setInterval(() => {
        loadAgentTasks(false);
      }, 4000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isAutoPolling]);

  // Handle human-in-the-loop task approval
  const handlePermissionAction = async (taskId: string, action: 'grant' | 'deny') => {
    try {
      await api.updateTaskPermission(taskId, action);
      showToast(`Permission ${action === 'grant' ? 'granted' : 'denied'} for task ${taskId}`);
      await loadAgentTasks(false);
    } catch (err: any) {
      showToast(`Failed to update task permission: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.cancelTask(taskId);
      addActivity({
        type: 'tool_exec',
        title: 'Task Cancelled',
        detail: `Operator cancelled task ${taskId}`,
        status: 'warning',
      });
      showToast(`Task ${taskId} cancelled successfully`);
      await loadAgentTasks(false);
    } catch (err: any) {
      showToast(`Could not cancel task: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleEmergencyStopAll = async () => {
    if (!confirm('⚠️ Are you sure you want to trigger EMERGENCY STOP? All running agent tasks will be halted immediately.')) return;
    try {
      await api.emergencyStopTasks('Manual Emergency Stop triggered via Task Manager');
      showToast('🚨 EMERGENCY STOPPED all active agent executions');
      await loadAgentTasks(true);
    } catch (err: any) {
      showToast(`Emergency stop failed: ${err.message}`);
    }
  };

  const handleClearCompleted = () => {
    const activeOnly = agentTasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'running' || t.status === 'waiting_permission' || t.status === 'pending'
    );
    const countCleared = agentTasks.length - activeOnly.length;
    setAgentTasks(activeOnly);
    showToast(`Pruned ${countCleared} finished tasks from active view 🧹`);
  };

  const handleCopyTaskTrace = (task: any) => {
    navigator.clipboard.writeText(JSON.stringify(task, null, 2));
    setCopiedTaskId(task.plan_id);
    setTimeout(() => setCopiedTaskId(null), 2000);
    showToast('Task trace JSON copied to clipboard 📋');
  };

  const handleExportAllTasks = () => {
    const payload = {
      app: 'Seyal AI Desktop',
      exported_at: new Date().toISOString(),
      task_count: agentTasks.length,
      tasks: agentTasks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seyal_agent_tasks_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported tasks log as JSON 💾');
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return agentTasks.filter((t) => {
      // 1. Search Query
      if (q) {
        const title = (t.goal?.description || t.title || '').toLowerCase();
        const planId = (t.plan_id || '').toLowerCase();
        const stepsMatch = (t.steps || []).some(
          (s: any) =>
            (s.description || '').toLowerCase().includes(q) ||
            (s.tool_name || '').toLowerCase().includes(q)
        );
        if (!title.includes(q) && !planId.includes(q) && !stepsMatch) return false;
      }

      // 2. Status Filter
      if (taskFilter === 'in_progress') {
        if (!(t.status === 'in_progress' || t.status === 'running')) return false;
      } else if (taskFilter === 'waiting_permission') {
        if (t.status !== 'waiting_permission') return false;
      } else if (taskFilter === 'completed') {
        if (t.status !== 'completed') return false;
      } else if (taskFilter === 'cancelled') {
        if (t.status !== 'cancelled') return false;
      } else if (taskFilter === 'failed') {
        if (t.status !== 'failed') return false;
      }

      // 3. Type Filter
      if (typeFilter !== 'all') {
        const tt = (t.task_type || t.spec?.task_type || 'immediate').toLowerCase();
        if (tt !== typeFilter) return false;
      }

      return true;
    });
  }, [agentTasks, searchQuery, taskFilter, typeFilter]);

  // Counts
  const totalCount = agentTasks.length;
  const runningCount = agentTasks.filter((t) => t.status === 'in_progress' || t.status === 'running').length;
  const permissionCount = agentTasks.filter((t) => t.status === 'waiting_permission').length;
  const completedCount = agentTasks.filter((t) => t.status === 'completed').length;
  const cancelledCount = agentTasks.filter((t) => t.status === 'cancelled').length;
  const failedCount = agentTasks.filter((t) => t.status === 'failed').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <div className="px-6 sm:px-8 py-4 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20">
              <ListTodo className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Agent Task Manager</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Autonomous Ops
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live monitoring, execution breakdown, and control of multi-step autonomous workflows.
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Live Auto-Polling Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoPolling(!isAutoPolling)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                isAutoPolling
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle automatic live task refresh every 4s"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAutoPolling ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span>Live {isAutoPolling ? '4s' : 'Off'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => loadAgentTasks(true)}
              disabled={isRefreshingTasks || isLoadingTasks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/40 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Refresh tasks immediately"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTasks ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export All */}
            <button
              type="button"
              onClick={handleExportAllTasks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/40 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all shadow-sm cursor-pointer"
              title="Export all tasks to JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export</span>
            </button>

            {/* Clear Finished */}
            <button
              type="button"
              onClick={handleClearCompleted}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/40 text-xs font-medium text-slate-400 hover:text-rose-300 transition-all shadow-sm cursor-pointer"
              title="Clear completed and cancelled tasks from view"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge</span>
            </button>

            {/* Emergency Stop Button if any running */}
            {runningCount > 0 && (
              <button
                type="button"
                onClick={handleEmergencyStopAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-xs font-bold text-rose-300 transition-all shadow-sm cursor-pointer animate-pulse"
                title="Halt all running tasks immediately"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Emergency Halt</span>
              </button>
            )}
          </div>
        </div>

        {/* 6 Quick Metrics HUD Cards with 1-Click Filter */}
        <TaskMetricsHUD
          totalCount={totalCount}
          runningCount={runningCount}
          permissionCount={permissionCount}
          completedCount={completedCount}
          cancelledCount={cancelledCount}
          failedCount={failedCount}
          taskFilter={taskFilter}
          setTaskFilter={setTaskFilter}
        />
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-cyan-950/50 animate-in fade-in">
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Main Body */}
      <div className="p-6 sm:p-8 space-y-4 w-full max-w-6xl mx-auto">
        {/* Search & Status Filters Bar */}
        <TaskFiltersToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />

        {/* Task Cards List */}
        <div className="space-y-3 pt-1">
          {isLoadingTasks ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span>Loading agent task execution records & plan queue...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-14 px-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ListTodo className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-semibold text-slate-200">No Tasks Match Filter</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {searchQuery
                    ? `No tasks found matching "${searchQuery}". Try a different keyword.`
                    : taskFilter !== 'all'
                    ? `No tasks currently in "${taskFilter.replace('_', ' ')}" status.`
                    : 'No multi-step autonomous tasks recorded yet.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setTaskFilter('all');
                      setTypeFilter('all');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium mt-1 cursor-pointer"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredTasks.map((task: any) => (
              <TaskItemRow
                key={task.plan_id}
                task={task}
                isExpanded={expandedTaskId === task.plan_id}
                onToggleExpand={(id) => setExpandedTaskId(expandedTaskId === id ? null : id)}
                copiedTaskId={copiedTaskId}
                onCopyTaskTrace={handleCopyTaskTrace}
                onCancelTask={handleCancelTask}
                onPermissionAction={handlePermissionAction}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentTaskManagerTab;
