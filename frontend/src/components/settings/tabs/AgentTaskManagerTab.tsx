import React, { useState, useEffect } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Activity,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ListFilter,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';

export const AgentTaskManagerTab: React.FC = () => {
  const { activities, addActivity } = useSeyalAi();

  const [agentTasks, setAgentTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);
  const [isRefreshingTasks, setIsRefreshingTasks] = useState<boolean>(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending' | 'cancelled' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'immediate' | 'scheduled' | 'continuous' | 'conditional'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handlePermissionAction = async (taskId: string, action: 'grant' | 'deny') => {
    try {
      await api.updateTaskPermission(taskId, action);
      await loadAgentTasks(true);
    } catch (err: any) {
      alert(`Permission action failed: ${err.message}`);
    }
  };

  const loadAgentTasks = async (showRefreshSpinner: boolean = false) => {
    if (showRefreshSpinner) setIsRefreshingTasks(true);
    else setIsLoadingTasks(true);

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
        // Synthesize agent tasks from recent session activities (within 30 days)
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
          .slice(0, 20)
          .map((a, idx) => ({
            plan_id: `act_${a.id || idx}`,
            goal: {
              description: a.title,
              created_at: Date.now() / 1000,
            },
            status: a.status === 'success' ? 'completed' : a.status === 'error' ? 'failed' : a.status === 'warning' ? 'cancelled' : 'in_progress',
            total_steps: 1,
            completed_steps: a.status === 'success' ? 1 : 0,
            steps: [
              {
                step_id: `step_${idx}`,
                order: 1,
                description: a.detail,
                tool_name: a.type,
                status: a.status === 'success' ? 'completed' : a.status === 'error' ? 'failed' : 'running',
                started_at: Date.now() / 1000,
                completed_at: a.status === 'success' ? Date.now() / 1000 : null,
              },
            ],
            created_at: Date.now() / 1000,
            started_at: Date.now() / 1000,
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

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.cancelTask(taskId);
      addActivity({
        type: 'tool_exec',
        title: 'Task Cancelled',
        detail: `Operator cancelled task ${taskId}`,
        status: 'warning',
      });
      await loadAgentTasks(false);
    } catch (err: any) {
      alert(`Could not cancel task: ${err?.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header Bar */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2.5">
            <ListTodo className="w-5 h-5 text-cyan-400" />
            <span>Agent Task Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Live monitoring, execution breakdown, and control of autonomous agent workflows and user tasks.</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300/90 border border-cyan-500/20 font-mono">
              Auto-purged after 30 days
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadAgentTasks(true)}
            disabled={isRefreshingTasks || isLoadingTasks}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 hover:border-cyan-500/40 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all shadow-sm cursor-pointer"
            title="Refresh active tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTasks ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isRefreshingTasks ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="p-8 sm:p-10 space-y-6 w-full">
        {/* 1. Quick Metrics Cards (6 Cards in requested order: Total Tasks, Completed, In Process, Pending, Cancelled, Failed) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total Tasks */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Total Tasks</div>
              <div className="text-lg font-bold text-white font-mono">{agentTasks.length}</div>
            </div>
          </div>

          {/* 2. Completed */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Completed</div>
              <div className="text-lg font-bold text-white font-mono">
                {agentTasks.filter((t) => t.status === 'completed').length}
              </div>
            </div>
          </div>

          {/* 3. In Process */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">In Process</div>
              <div className="text-lg font-bold text-white font-mono">
                {agentTasks.filter((t) => t.status === 'in_progress' || t.status === 'running').length}
              </div>
            </div>
          </div>

          {/* 4. Pending */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Pending</div>
              <div className="text-lg font-bold text-white font-mono">
                {agentTasks.filter((t) => t.status === 'pending' || t.status === 'planning' || t.status === 'paused').length}
              </div>
            </div>
          </div>

          {/* 5. Cancelled */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Cancelled</div>
              <div className="text-lg font-bold text-white font-mono">
                {agentTasks.filter((t) => t.status === 'cancelled').length}
              </div>
            </div>
          </div>

          {/* 6. Failed */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Failed</div>
              <div className="text-lg font-bold text-white font-mono">
                {agentTasks.filter((t) => t.status === 'failed').length}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Dropdown Filter Bar in matching order: All, Completed, In Process, Pending, Cancelled, Failed */}
        <div className="flex items-center justify-between gap-3 pt-1 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ListFilter className="w-4 h-4 text-cyan-400" />
            <span>Filter Tasks</span>
          </div>

          {/* Dropdown Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-xs font-medium text-slate-200 transition-all shadow-sm min-w-[170px] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="capitalize">
                  {taskFilter === 'all'
                    ? 'All'
                    : taskFilter === 'completed'
                    ? 'Completed'
                    : taskFilter === 'in_progress'
                    ? 'In Process'
                    : taskFilter === 'pending'
                    ? 'Pending'
                    : taskFilter === 'cancelled'
                    ? 'Cancelled'
                    : 'Failed'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-cyan-500/20 text-cyan-300 font-bold">
                  {taskFilter === 'all'
                    ? agentTasks.length
                    : taskFilter === 'completed'
                    ? agentTasks.filter((t) => t.status === 'completed').length
                    : taskFilter === 'in_progress'
                    ? agentTasks.filter((t) => t.status === 'in_progress' || t.status === 'running').length
                    : taskFilter === 'pending'
                    ? agentTasks.filter((t) => t.status === 'pending' || t.status === 'planning' || t.status === 'paused').length
                    : taskFilter === 'cancelled'
                    ? agentTasks.filter((t) => t.status === 'cancelled').length
                    : agentTasks.filter((t) => t.status === 'failed').length}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isFilterDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu (Order: All, Completed, In Process, Pending, Cancelled, Failed) */}
            {isFilterDropdownOpen && (
              <div
                onMouseLeave={() => setIsFilterDropdownOpen(false)}
                className="absolute right-0 mt-1.5 w-52 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl p-1 z-50 animate-fadeIn backdrop-blur-xl space-y-0.5"
              >
                {[
                  { id: 'all', label: 'All', count: agentTasks.length },
                  {
                    id: 'completed',
                    label: 'Completed',
                    count: agentTasks.filter((t) => t.status === 'completed').length,
                  },
                  {
                    id: 'in_progress',
                    label: 'In Process',
                    count: agentTasks.filter((t) => t.status === 'in_progress' || t.status === 'running').length,
                  },
                  {
                    id: 'pending',
                    label: 'Pending',
                    count: agentTasks.filter((t) => t.status === 'pending' || t.status === 'planning' || t.status === 'paused').length,
                  },
                  {
                    id: 'cancelled',
                    label: 'Cancelled',
                    count: agentTasks.filter((t) => t.status === 'cancelled').length,
                  },
                  {
                    id: 'failed',
                    label: 'Failed',
                    count: agentTasks.filter((t) => t.status === 'failed').length,
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTaskFilter(opt.id as any);
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      taskFilter === opt.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        taskFilter === opt.id
                          ? 'bg-cyan-500/30 text-cyan-200'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2.5 Task Type Filter Tags (Type 1-4 & Notify) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Task Type:</span>
          {[
            { id: 'all', label: 'All Types' },
            { id: 'immediate', label: '⚡ Type 1: Immediate' },
            { id: 'scheduled', label: '⏰ Type 2: Scheduled' },
            { id: 'continuous', label: '🔄 Type 3: Continuous' },
            { id: 'conditional', label: '🔀 Type 4: Conditional' },
          ].map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTypeFilter(tf.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                typeFilter === tf.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* 3. Task Cards List */}
        <div className="space-y-3">
          {isLoadingTasks ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span>Loading agent task queue & plan execution records...</span>
            </div>
          ) : agentTasks.filter((t) => {
              if (taskFilter === 'completed' && t.status !== 'completed') return false;
              if (taskFilter === 'in_progress' && !(t.status === 'in_progress' || t.status === 'running')) return false;
              if (taskFilter === 'pending' && !(t.status === 'pending' || t.status === 'planning' || t.status === 'paused' || t.status === 'waiting_permission')) return false;
              if (taskFilter === 'cancelled' && t.status !== 'cancelled') return false;
              if (taskFilter === 'failed' && t.status !== 'failed') return false;
              if (typeFilter !== 'all') {
                const tt = (t.task_type || t.spec?.task_type || 'immediate').toLowerCase();
                if (tt !== typeFilter) return false;
              }
              return true;
            }).length === 0 ? (
            <div className="py-14 px-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ListTodo className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-semibold text-slate-200">No Tasks Found</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {taskFilter === 'all'
                    ? 'No multi-step agent tasks recorded yet. Complex workflows and autonomous plans will appear here as they execute.'
                    : `No tasks currently in "${taskFilter === 'in_progress' ? 'In Process' : taskFilter.replace('_', ' ')}" status.`}
                </p>
              </div>
            </div>
          ) : (
            agentTasks
              .filter((t) => {
                if (taskFilter === 'completed' && t.status !== 'completed') return false;
                if (taskFilter === 'in_progress' && !(t.status === 'in_progress' || t.status === 'running')) return false;
                if (taskFilter === 'pending' && !(t.status === 'pending' || t.status === 'planning' || t.status === 'paused' || t.status === 'waiting_permission')) return false;
                if (taskFilter === 'cancelled' && t.status !== 'cancelled') return false;
                if (taskFilter === 'failed' && t.status !== 'failed') return false;
                if (typeFilter !== 'all') {
                  const tt = (t.task_type || t.spec?.task_type || 'immediate').toLowerCase();
                  if (tt !== typeFilter) return false;
                }
                return true;
              })
              .map((task: any) => {
                const isExpanded = expandedTaskId === task.plan_id;
                const isRunning = task.status === 'in_progress' || task.status === 'running';
                const isCompleted = task.status === 'completed';
                const isPending = task.status === 'pending' || task.status === 'planning' || task.status === 'paused' || task.status === 'waiting_permission';
                const isWaitingPermission = task.status === 'waiting_permission';
                const isFailed = task.status === 'failed';
                const isCancelled = task.status === 'cancelled';
                const totalSteps = task.total_steps || task.steps?.length || 1;
                const completedSteps = task.completed_steps || (isCompleted ? totalSteps : 0);
                const percent = Math.min(100, Math.round((completedSteps / Math.max(1, totalSteps)) * 100));

                return (
                  <div
                    key={task.plan_id}
                    className="rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/30 transition-all overflow-hidden shadow-sm"
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
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
                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}
                        >
                          {isRunning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isPending ? (
                            <Clock className="w-4 h-4" />
                          ) : isFailed ? (
                            <XCircle className="w-4 h-4" />
                          ) : isCancelled ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100 font-mono">
                              {task.goal?.description || task.title || 'Autonomous Agent Task'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800/80 text-slate-400 border border-slate-700/60">
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
                              {task.task_type || task.spec?.task_type || 'Type 1: Immediate'}
                            </span>
                            {(task.intent_type === 'notify' || task.spec?.intent_type === 'notify') && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                Notify Only
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>
                              {completedSteps} / {totalSteps} steps
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
                          </div>
                        </div>
                      </div>

                      {/* Card Status & Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
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
                              : isCancelled
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isWaitingPermission ? 'Needs Permission' : task.status === 'in_progress' ? 'in process' : task.status.replace('_', ' ')}
                        </span>

                        {isWaitingPermission && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePermissionAction(task.plan_id || task.id, 'grant')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                              title="Allow agent to start this task"
                            >
                              Grant
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermissionAction(task.plan_id || task.id, 'deny')}
                              className="px-2 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 text-[11px] font-medium transition-all cursor-pointer"
                              title="Reject task"
                            >
                              Reject
                            </button>
                          </div>
                        )}

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

                        {task.steps && task.steps.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.plan_id)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/60 cursor-pointer"
                            title={isExpanded ? 'Hide steps' : 'View steps'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-4 sm:px-5 pb-3">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Execution Step Details ({task.steps.length})
                        </div>
                        {task.steps.map((step: any, sIdx: number) => (
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
                                {step.tool_name && (
                                  <div className="text-[10px] font-mono text-cyan-400/90">
                                    Tool: {step.tool_name}
                                  </div>
                                )}
                                {step.error && (
                                  <div className="text-[10px] font-mono text-rose-400">
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
                        ))}
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
