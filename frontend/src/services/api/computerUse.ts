import { apiClient, API_BASE } from './client';
import { supabase } from '../supabase';

export const computerUseApi = {
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
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const executeClientFallback = (promptGoal: string) => {
      if (abortSignal?.aborted) return;
      const lower = promptGoal.toLowerCase().trim();
      let fallbackText = "I am ready and listening. Please let me know what desktop task or question I can assist you with.";
      let isTask = false;

      if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("vanakkam") || lower.includes("seyal")) {
        fallbackText = "Hello! I am Seyal AI, your autonomous desktop assistant. I am ready to converse and assist you with desktop tasks.";
      } else if (lower.includes("date") || lower.includes("today")) {
        fallbackText = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
      } else if (lower.includes("time") || lower.includes("clock")) {
        fallbackText = `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      } else if (lower.includes("notepad")) {
        isTask = true;
        fallbackText = "Opening Notepad application for you now.";
        if (typeof window !== 'undefined' && (window as any).electronAPI?.openApp) {
          (window as any).electronAPI.openApp('notepad.exe');
        }
      } else if (lower.includes("calc") || lower.includes("calculator")) {
        isTask = true;
        fallbackText = "Opening Calculator application for you now.";
        if (typeof window !== 'undefined' && (window as any).electronAPI?.openApp) {
          (window as any).electronAPI.openApp('calc.exe');
        }
      }

      onStart?.(conversationId || 'local-turn', isTask);
      onChunk?.(fallbackText);
      onDone?.({
        conversation_id: conversationId || 'local-turn',
        narration: fallbackText,
        is_task: isTask,
        status: 'completed',
        history: [],
        steps_executed: 1,
      });
    };

    try {
      const response = await fetch(`${API_BASE}/computer-use/stream`, {
        method: 'POST',
        headers,
        signal: abortSignal,
        body: JSON.stringify({
          goal,
          max_steps: maxSteps,
          auto_confirm: autoConfirm,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        console.warn(`[api] /computer-use/stream returned ${response.status}, attempting fallback to /computer-use/run`);
        try {
          const fallbackResult = await computerUseApi.runComputerUseGoal(goal, maxSteps, autoConfirm, conversationId);
          if (fallbackResult) {
            const narr = fallbackResult.narration || 'Completed task.';
            onChunk?.(narr);
            onDone?.({
              conversation_id: fallbackResult.conversation_id || conversationId || '',
              narration: narr,
              is_task: fallbackResult.is_task ?? false,
              status: fallbackResult.status || 'completed',
              history: fallbackResult.history || [],
              steps_executed: fallbackResult.steps_executed ?? 0,
            });
            return;
          }
        } catch (fallbackErr) {
          console.error('[api] Fallback to runComputerUseGoal also failed:', fallbackErr);
        }
        executeClientFallback(goal);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        executeClientFallback(goal);
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (abortSignal?.aborted) {
          try { reader.cancel(); } catch { /* ignore */ }
          return;
        }
        const { done, value } = await reader.read();
        if (done || abortSignal?.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (abortSignal?.aborted) return;
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
    } catch (netErr: any) {
      if (netErr?.name === 'AbortError' || abortSignal?.aborted) {
        // Intentionally aborted on user interrupt — do not trigger client fallback
        return;
      }
      console.warn('[api] Network error during stream, engaging client fallback:', netErr);
      executeClientFallback(goal);
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

  async getWelcomeGreeting(userName: string = 'Friend'): Promise<string> {
    try {
      const { data } = await apiClient.get('/computer-use/welcome', {
        params: { user_name: userName },
      });
      return data?.greeting || '';
    } catch (err) {
      console.warn('Failed to fetch dynamic welcome greeting:', err);
      return '';
    }
  },
};
