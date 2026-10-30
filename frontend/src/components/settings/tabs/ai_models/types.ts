export interface ModelProviderConfig {
  id: string;
  name: string;
  icon: string;
  badge: string;
  category: 'cloud' | 'local';
  apiKey: string;
  baseUrl?: string;
  selectedModel: string;
  models: { id: string; name: string; tag: string }[];
  enabled: boolean;
  status: 'connected' | 'not_configured' | 'offline';
  pingMs?: number;
}

export const DEFAULT_PROVIDERS: ModelProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🟣',
    badge: 'Computer Use Standard',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tag: 'Best for Desktop Automation' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tag: 'Fast & Lightweight' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 142,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    badge: 'Multimodal Vision',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Omni)', tag: 'Vision & Reasoning' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: 'High-Speed Efficient' },
      { id: 'o1-preview', name: 'o1-preview', tag: 'Deep Thinking' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 185,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    icon: '🔵',
    badge: '2M Context Window',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'gemini-2.0-flash-exp',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', tag: 'Ultra Low Latency' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Massive Document Analysis' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 98,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local Offline AI)',
    icon: '🦙',
    badge: '100% Free & Private',
    category: 'local',
    apiKey: 'N/A (Local Engine)',
    baseUrl: 'http://localhost:11434',
    selectedModel: 'qwen2.5-coder:latest',
    models: [
      { id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder', tag: 'Local Coding Specialist' },
      { id: 'llama3.2:latest', name: 'Llama 3.2 3B', tag: 'Fast Local CPU Runner' },
      { id: 'deepseek-r1:latest', name: 'DeepSeek R1 Distill', tag: 'Offline Reasoning' },
    ],
    enabled: true,
    status: 'connected',
    pingMs: 12,
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    icon: '⚡',
    badge: '800 Tokens/sec',
    category: 'cloud',
    apiKey: '',
    selectedModel: 'deepseek-r1-distill-llama-70b',
    models: [
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Llama 70B)', tag: 'Sub-second Reasoning' },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', tag: 'Open Weights Flagship' },
    ],
    enabled: false,
    status: 'not_configured',
  },
];
