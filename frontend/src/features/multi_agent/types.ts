export type AgentRoleType =
  | 'ceo_planner'
  | 'product_manager'
  | 'system_architect'
  | 'software_engineer'
  | 'quality_assurance';

export interface AgentChatMessage {
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

export interface MultiAgentProjectState {
  goal: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  transcript: AgentChatMessage[];
}
