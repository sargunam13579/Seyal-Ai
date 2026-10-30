import React from 'react';
import {
  ListTodo,
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface TaskMetricsHUDProps {
  totalCount: number;
  runningCount: number;
  permissionCount: number;
  completedCount: number;
  cancelledCount: number;
  failedCount: number;
  taskFilter: string;
  setTaskFilter: (filter: 'all' | 'in_progress' | 'waiting_permission' | 'completed' | 'cancelled' | 'failed') => void;
}

export const TaskMetricsHUD: React.FC<TaskMetricsHUDProps> = ({
  totalCount,
  runningCount,
  permissionCount,
  completedCount,
  cancelledCount,
  failedCount,
  taskFilter,
  setTaskFilter,
}) => {
  return (
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
  );
};
