import axios from 'axios';
import type {
  HealthResponse,
  IdentityResponse,
  NameChangeResponse,
  ConfirmationResponse,
  ChatResponse,
  ConversationSummary,
  ConversationDetail,
  LaptopStatusResponse,
  LaptopToolListResponse,
  ToolExecutionResponse,
  VoiceConfigResponse,
  VoiceStatusResponse,
  DeviceNode,
} from '../types';
import { supabase } from './supabase';

const resolveApiBase = (): string => {
  if (typeof window !== 'undefined') {
    // In packaged Electron (file:// protocol) or Electron desktop wrapper, connect directly to local Python server
    if (window.location.protocol === 'file:' || Boolean((window as any).electronAPI)) {
      return 'http://127.0.0.1:8000/api';
    }
    // In Vite dev server (port 5173), proxy through /api
    if (window.location.port === '5173') {
      return '/api';
    }
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL !== '/api')
  ? import.meta.env.VITE_API_BASE_URL
  : resolveApiBase();

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

apiClient.interceptors.request.use(async (config) => {
  // Health checks are public localhost pings; bypass supabase session check to ensure instant sub-millisecond response
  if (config.url && config.url.includes('/health')) {
    return config;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn('[API] Failed to retrieve session for request:', err);
  }
  return config;
});

export const api = {
  // System Health & Liveness
  async getHealth(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>('/health', { timeout: 3000 });
    return data;
  },

  async getReady(): Promise<{ status: string; subsystems: Record<string, any> }> {
    const { data } = await apiClient.get('/ready', { timeout: 5000 });
    return data;
  },

  // Identity & Assistant Name Management
  async getIdentity(): Promise<IdentityResponse> {
    const { data } = await apiClient.get<IdentityResponse>('/identity');
    return data;
  },

  async updateIdentity(payload: {
    user_name?: string;
    require_wake_word?: boolean;
    aliases?: string[];
  }): Promise<IdentityResponse> {
    const { data } = await apiClient.put<IdentityResponse>('/identity', payload);
    return data;
  },

  async requestNameChange(name: string): Promise<NameChangeResponse> {
    const { data } = await apiClient.post<NameChangeResponse>('/identity/change-name', { name });
    return data;
  },

  async confirmPendingAction(confirmed: boolean): Promise<ConfirmationResponse> {
    const { data } = await apiClient.post<ConfirmationResponse>('/identity/confirm', { confirmed });
    return data;
  },

  async cancelPendingConfirmation(): Promise<ConfirmationResponse> {
    const { data } = await apiClient.post<ConfirmationResponse>('/identity/cancel');
    return data;
  },

  async addAlias(alias: string): Promise<IdentityResponse> {
    const { data } = await apiClient.post<IdentityResponse>(`/identity/aliases?alias=${encodeURIComponent(alias)}`);
    return data;
  },

  async removeAlias(alias: string): Promise<IdentityResponse> {
    const { data } = await apiClient.delete<IdentityResponse>(`/identity/aliases/${encodeURIComponent(alias)}`);
    return data;
  },

  // Chat & Conversation
  async sendMessage(
    message: string,
    conversationId?: string,
    files: File[] = []
  ): Promise<ChatResponse> {
    const formData = new FormData();

    formData.append('message', message);

    if (conversationId) {
      formData.append(
        'conversation_id',
        conversationId
      );
    }

    for (const file of files) {
      formData.append('files', file);
    }

    const { data } = await apiClient.post<ChatResponse>(
      '/chat',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return data;
  },

  async sendMessageStream(
    message: string,
    conversationId?: string,
    files: File[] = [],
    onChunk?: (chunk: string) => void,
    onStart?: (convId: string) => void,
    onDone?: (convId: string, fullText: string) => void,
  ): Promise<string> {
    const formData = new FormData();
    formData.append('message', message);
    if (conversationId) {
      formData.append('conversation_id', conversationId);
    }
    for (const file of files) {
      formData.append('files', file);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No readable stream available in response.');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let finalConvId = conversationId || '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        try {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'start') {
            finalConvId = parsed.conversation_id;
            if (onStart) onStart(parsed.conversation_id);
          } else if (parsed.type === 'chunk' && parsed.text) {
            fullText += parsed.text;
            if (onChunk) onChunk(parsed.text);
          } else if (parsed.type === 'done') {
            if (parsed.conversation_id) finalConvId = parsed.conversation_id;
            if (onDone) onDone(finalConvId, fullText);
          }
        } catch (err) {
          console.debug('Failed to parse SSE line:', line, err);
        }
      }
    }

    return fullText;
  },

  async resetChat(): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/chat/reset');
    return data;
  },

  async listConversations(page = 1, pageSize = 0): Promise<{
    conversations: ConversationSummary[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const { data } = await apiClient.get('/conversations', {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const { data } = await apiClient.get<ConversationDetail>(`/conversations/${encodeURIComponent(conversationId)}`);
    return data;
  },

  async getConversationOverview(conversationId: string): Promise<{ overview: string }> {
    const { data } = await apiClient.get<{ overview: string }>(`/conversations/${encodeURIComponent(conversationId)}/overview`);
    return data;
  },

  async deleteConversation(conversationId: string): Promise<{ message: string; deleted_id: string }> {
    const { data } = await apiClient.delete(`/conversations/${encodeURIComponent(conversationId)}`);
    return data;
  },

  async batchDeleteConversations(conversationIds: string[]): Promise<{ message: string; deleted_count: number; deleted_ids: string[] }> {
    const { data } = await apiClient.post('/conversations/batch-delete', {
      conversation_ids: conversationIds,
    });
    return data;
  },

  async purgeAllConversations(): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.delete('/conversations');
    return data;
  },

  async updateConversation(conversationId: string, summary: string): Promise<ConversationSummary> {
    const { data } = await apiClient.patch<ConversationSummary>(`/conversations/${encodeURIComponent(conversationId)}`, {
      summary,
    });
    return data;
  },

  async generateDynamicTitle(conversationId: string, force = false): Promise<ConversationSummary> {
    const { data } = await apiClient.post<ConversationSummary>(
      `/conversations/${encodeURIComponent(conversationId)}/dynamic-title?force=${force}`
    );
    return data;
  },

  // Laptop Agent & System Control
  async getLaptopStatus(): Promise<LaptopStatusResponse> {
    const { data } = await apiClient.get<LaptopStatusResponse>('/laptop/status');
    return data;
  },

  async listLaptopTools(): Promise<LaptopToolListResponse> {
    const { data } = await apiClient.get<LaptopToolListResponse>('/laptop/tools');
    return data;
  },

  async executeLaptopTool(
    toolName: string,
    parameters: Record<string, unknown> = {},
    skipConfirmation = false
  ): Promise<ToolExecutionResponse> {
    const { data } = await apiClient.post<ToolExecutionResponse>('/laptop/execute', {
      request_id: `gui_${Date.now()}`,
      tool_name: toolName,
      parameters,
      skip_confirmation: skipConfirmation,
    });
    return data;
  },

  // Voice Pipeline & Speech Synthesis
  async getVoiceStatus(): Promise<VoiceStatusResponse> {
    const { data } = await apiClient.get<VoiceStatusResponse>('/voice/status');
    return data;
  },

  async getVoiceConfig(): Promise<VoiceConfigResponse> {
    const { data } = await apiClient.get<VoiceConfigResponse>('/voice/config');
    return data;
  },

  async updateVoiceConfig(update: {
    interaction_mode?: string;
    tts_voice?: string;
    tts_speed?: number;
    language?: string;
  }): Promise<VoiceConfigResponse> {
    const { data } = await apiClient.put<VoiceConfigResponse>('/voice/config', update);
    return data;
  },

  async startVoice(): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.post('/voice/start');
    return data;
  },

  async stopVoice(): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.post('/voice/stop');
    return data;
  },

  async synthesizeSpeech(text: string, voice?: string, speed?: number): Promise<Blob> {
    const response = await apiClient.post(
      '/voice/synthesize',
      { text, voice, speed },
      { responseType: 'blob' }
    );
    return response.data;
  },

  async transcribeAudio(audioBlob: Blob, language = 'en-US'): Promise<{
    text: string;
    language: string;
    provider: string;
    success: boolean;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('language', language);

    const { data } = await apiClient.post('/voice/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  // Unified Device Ecosystem
  async listDevices(): Promise<{ count: number; devices: DeviceNode[] }> {
    const { data } = await apiClient.get('/devices/');
    return data;
  },

  // Conversational Computer-Use Agent
  async getComputerUseStatus(): Promise<{
    status: string;
    is_task?: boolean;
    history_count: number;
    history: Array<{
      step: number;
      thought: string;
      action: string;
      coordinates: [number | null, number | null];
      success: boolean;
      elapsed_seconds: number;
    }>;
  }> {
    const { data } = await apiClient.get('/computer-use/status');
    return data;
  },

  async getComputerUseWelcome(userName = 'Friend'): Promise<{ greeting: string }> {
    const { data } = await apiClient.get('/computer-use/welcome', {
      params: { user_name: userName },
    });
    return data;
  },

  async runComputerUseGoal(goal: string, maxSteps = 20, autoConfirm = false, conversationId?: string): Promise<any> {
    const { data } = await apiClient.post(
      '/computer-use/run',
      {
        goal,
        max_steps: maxSteps,
        auto_confirm: autoConfirm,
        conversation_id: conversationId,
      },
      {
        timeout: 180000,
      }
    );
    return data;
  },

  async runComputerUseStream(
    goal: string,
    maxSteps = 20,
    autoConfirm = false,
    conversationId?: string,
    onChunk?: (chunk: string) => void,
    onStart?: (convId: string, isTask: boolean) => void,
    onAck?: (text: string) => void,
    onDone?: (result: { conversation_id: string; narration: string; is_task: boolean; status: string; history?: any[]; steps_executed?: number }) => void,
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_BASE}/computer-use/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        goal,
        max_steps: maxSteps,
        auto_confirm: autoConfirm,
        conversation_id: conversationId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No readable stream available in response.');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        try {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'start') {
            if (onStart) onStart(parsed.conversation_id, parsed.is_task);
          } else if (parsed.type === 'ack') {
            if (onAck) onAck(parsed.text);
          } else if (parsed.type === 'chunk' && parsed.text) {
            if (onChunk) onChunk(parsed.text);
          } else if (parsed.type === 'done') {
            if (onDone) onDone(parsed);
          }
        } catch (err) {
          console.debug('Failed to parse computer-use SSE line:', line, err);
        }
      }
    }
  },

  async steerComputerUse(instruction: string, interrupt = true): Promise<{
    status: string;
    instruction: string;
    message: string;
  }> {
    const { data } = await apiClient.post('/computer-use/steer', {
      instruction,
      interrupt,
    });
    return data;
  },

  async stopComputerUse(): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.post('/computer-use/stop');
    return data;
  },

  async observeScreenState(tagElements = true): Promise<{
    status: string;
    screen_width: number;
    screen_height: number;
    active_window: string;
    detected_elements_count: number;
    detected_elements: Array<any>;
    som_base64_image?: string;
    base64_image?: string;
    timestamp: number;
  }> {
    const { data } = await apiClient.get('/computer-use/observe', {
      params: { tag_elements: tagElements },
    });
    return data;
  },

  async executeDirectAction(payload: {
    action_type: string;
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    direction?: string;
    amount?: number;
  }): Promise<any> {
    const { data } = await apiClient.post('/computer-use/action', payload);
    return data;
  },

  async getProfile(): Promise<{
    setup_required: boolean;
    user_id: string;
    email?: string;
    profile?: {
      user_id?: string;
      email?: string;
      name?: string;
      dob?: string | null;
      age?: number;
      gender?: string;
      mother_tongue?: string | null;
      known_languages?: string[];
    };
  }> {
    const { data } = await apiClient.get('/profile/me', { timeout: 4000 });
    return data;
  },

  async setupProfile(payload: {
    name: string;
    dob?: string;
    age?: number;
    gender?: string;
    mother_tongue?: string;
    known_languages?: string[];
  }): Promise<{
    success: boolean;
    message: string;
    profile: {
      user_id: string;
      name: string;
      dob?: string;
      age: number;
      gender: string;
      mother_tongue?: string;
      known_languages?: string[];
    };
  }> {
    const { data } = await apiClient.post('/profile/setup', payload);
    return data;
  },

  async getLaptopAwareness(): Promise<any> {
    const { data } = await apiClient.get('/system/awareness');
    return data?.data || data;
  },

  async scanLaptopAwareness(): Promise<any> {
    const { data } = await apiClient.post('/system/awareness/scan');
    return data?.data || data;
  },

  async getLiveTelemetry(): Promise<any> {
    const { data } = await apiClient.get('/system/awareness/live');
    return data?.data || data;
  },

  async getActiveWindow(): Promise<any> {
    const { data } = await apiClient.get('/system/awareness/active-window');
    return data?.data || data;
  },

  async getPermissions(): Promise<
    Record<
      string,
      {
        scope: string;
        granted: boolean;
        mode?: 'allow' | 'ask' | 'block';
        last_accessed_at?: number | null;
        last_accessed_by?: string | null;
        description: string;
      }
    >
  > {
    const { data } = await apiClient.get('/permissions');
    return data?.scopes || {};
  },

  async setPermissionMode(scope: string, mode: 'allow' | 'ask' | 'block'): Promise<any> {
    const { data } = await apiClient.post('/permissions/mode', { scope, mode });
    return data;
  },

  async grantPermission(scope: string): Promise<any> {
    const { data } = await apiClient.post('/permissions/grant', { scope });
    return data;
  },

  async revokePermission(scope: string): Promise<any> {
    const { data } = await apiClient.post('/permissions/revoke', { scope });
    return data;
  },

  async resetPermissions(): Promise<any> {
    const { data } = await apiClient.post('/permissions/reset');
    return data;
  },

  // Agent Planning & Task Management
  async listTasks(): Promise<{ count: number; tasks: any[] }> {
    const { data } = await apiClient.get('/tasks');
    return data || { count: 0, tasks: [] };
  },

  async getTaskDetails(taskId: string): Promise<any> {
    const { data } = await apiClient.get(`/tasks/${taskId}`);
    return data;
  },

  async cancelTask(taskId: string, reason: string = 'User requested cancellation'): Promise<any> {
    const { data } = await apiClient.post(`/tasks/${taskId}/cancel`, { reason });
    return data;
  },

  async emergencyStopTasks(reason: string = 'EMERGENCY STOP triggered via Task Manager UI'): Promise<any> {
    const { data } = await apiClient.post('/tasks/emergency/stop', { reason });
    return data;
  },
};

