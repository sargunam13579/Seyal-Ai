export interface AgentStep {
  step_id: string;
  order: number;
  description: string;
  tool_name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  started_at?: number | string | null;
  completed_at?: number | string | null;
  error?: string | null;
  result?: any;
}

export interface AgentTask {
  plan_id: string;
  title?: string;
  goal?: {
    description: string;
    created_at?: number | string;
  };
  status: 'in_progress' | 'running' | 'waiting_permission' | 'completed' | 'cancelled' | 'failed' | 'pending';
  total_steps?: number;
  completed_steps?: number;
  task_type?: 'immediate' | 'scheduled' | 'continuous' | 'conditional';
  spec?: {
    task_type?: string;
  };
  steps?: AgentStep[];
  created_at?: number | string;
  started_at?: number | string | null;
  completed_at?: number | string | null;
}

export const formatDuration = (started?: any, completed?: any) => {
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
