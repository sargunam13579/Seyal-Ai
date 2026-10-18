import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Activity,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  StopCircle,
  Copy,
  Check,
  Download,
  Terminal,
  Globe,
  Monitor,
  Folder,
  Wrench,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';

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

  const handlePermissionAction = async (taskId: string, action: 'grant' | 'deny') => {
    try {
      await api.updateTaskPermission(taskId, action);
      showToast(`Permission ${action === 'grant' ? 'Granted' : 'Rejected'} for task ${taskId}`);
      await loadAgentTasks(true);
    } catch (err: any) {
      showToast(`Permission action failed: ${err.message}`);
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

  // Helper: Format duration
  const formatDuration = (started?: any, completed?: any) => {
    if (!started) return null;
    const startSec = typeof started === 'number' ? (started > 1e11 ? started / 1000 : started) : new Date(started).getTime() / 1000;
    const endSec = completed
      ? typeof completed === 'number'
        ? completed > 1e11
          ? completed / 1000
          : completed
        : new Date(completed).getTime() / 1000
      : Date.now() / 1000;

    const diff = Math.max(0, endSec - startSec);
    if (diff < 60) return `${diff.toFixed(1)}s`;
    const mins = Math.floor(diff / 60);
    const secs = Math.round(diff % 60);
    return `${mins}m ${secs}s`;
  };

  // Helper: Tool icon mapper
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
                Agent Task Manager
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          {/* Total */}
          <div
            onClick={() => setTaskFilter('all')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              taskFilter === 'all'
                ? 'bg-cyan-950/40 border-cyan-500/60 shadow-sm shadow-cyan-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Total Tasks</span>
              <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-base font-bold text-white font-mono mt-1">{totalCount}</div>
          </div>

          {/* Running */}
          <div
            onClick={() => setTaskFilter('in_progress')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              taskFilter === 'in_progress'
                ? 'bg-blue-950/40 border-blue-500/60 shadow-sm shadow-blue-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>In Process</span>
              <Activity className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base font-bold text-blue-300 font-mono mt-1 flex items-center gap-1.5">
              {runningCount}
              {runningCount > 0 && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
            </div>
          </div>

          {/* Waiting Approval */}
          <div
            onClick={() => setTaskFilter('waiting_permission')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              taskFilter === 'waiting_permission'
                ? 'bg-amber-950/40 border-amber-500/60 shadow-sm shadow-amber-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Waiting Approval</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold text-amber-300 font-mono mt-1 flex items-center gap-1.5">
              {permissionCount}
              {permissionCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </div>
          </div>

          {/* Completed */}
          <div
            onClick={() => setTaskFilter('completed')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              taskFilter === 'completed'
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm shadow-emerald-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Completed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-emerald-300 font-mono mt-1">{completedCount}</div>
          </div>

          {/* Cancelled */}
          <div
            onClick={() => setTaskFilter('cancelled')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              taskFilter === 'cancelled'
                ? 'bg-slate-800 border-slate-600 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Cancelled</span>
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-bold text-slate-300 font-mono mt-1">{cancelledCount}</div>
          </div>

          {/* Failed */}
          <div
            onClick={() => setTaskFilter('failed')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              taskFilter === 'failed'
                ? 'bg-rose-950/40 border-rose-500/60 shadow-sm shadow-rose-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Failed</span>
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-base font-bold text-rose-300 font-mono mt-1">{failedCount}</div>
          </div>
        </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by task goal, plan ID, or tool..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Task Type Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'immediate', label: '⚡ Immediate' },
              { id: 'scheduled', label: '⏰ Scheduled' },
              { id: 'continuous', label: '🔄 Continuous' },
              { id: 'conditional', label: '🔀 Conditional' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTypeFilter(tf.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  typeFilter === tf.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

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
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium mt-1"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredTasks.map((task: any) => {
              const isExpanded = expandedTaskId === task.plan_id;
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

              return (
                <div
                  key={task.plan_id}
                  className="rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/30 transition-all overflow-hidden shadow-sm"
                >
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
                            onClick={() => handlePermissionAction(task.plan_id || task.id, 'grant')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                            title="Allow agent to proceed"
                          >
                            Grant
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermissionAction(task.plan_id || task.id, 'deny')}
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
                          onClick={() => handleCancelTask(task.plan_id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-all cursor-pointer"
                          title="Cancel running task"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Copy Trace JSON */}
                      <button
                        type="button"
                        onClick={() => handleCopyTaskTrace(task)}
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
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.plan_id)}
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
                                      <Clock className="w-3 h-3 text-slate-500" />
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
            })
          )}
        </div>
      </div>
    </div>
  );
};
