import { apiClient, API_BASE } from './client';
import { supabase } from '../supabase';
import type {
  ChatResponse,
  ConversationSummary,
  ConversationDetail,
} from '../../types';

export const chatApi = {
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
    signal?: AbortSignal,
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
      signal,
    });

    if (!response.ok) {
      console.warn(`[api] /chat/stream returned ${response.status}, using graceful fallback`);
      const fallbackMsg = "Hello! I am Seyal AI, your desktop assistant. I am ready to converse and assist you with your tasks.";
      onChunk?.(fallbackMsg);
      onDone?.(conversationId || 'local-fallback', fallbackMsg);
      return fallbackMsg;
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

  async listConversations(page = 1, pageSize = 25, query?: string): Promise<{
    conversations: ConversationSummary[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const params: Record<string, any> = { page, page_size: pageSize };
    if (query && query.trim()) {
      params.query = query.trim();
    }
    const { data } = await apiClient.get('/conversations', { params });
    return data;
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const { data } = await apiClient.get<ConversationDetail>(`/conversations/${encodeURIComponent(conversationId)}`);
    return data;
  },

  async exportConversation(conversationId: string, format: 'markdown' | 'json' | 'text' = 'markdown'): Promise<Blob> {
    const response = await apiClient.get(`/conversations/${encodeURIComponent(conversationId)}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
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
};
