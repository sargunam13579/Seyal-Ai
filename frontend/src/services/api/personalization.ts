import { apiClient } from './client';
import type {
  IdentityResponse,
  NameChangeResponse,
  ConfirmationResponse,
} from '../../types';

export const personalizationApi = {
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

  // User Profile
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

  // User Knowledge & Rules Hub
  async getUserHub(): Promise<{
    user_knowledge: Record<string, string>;
    one_time_reminders: any[];
    standing_rules: Record<string, any>;
  }> {
    const { data } = await apiClient.get('/user-hub');
    return data;
  },

  async setUserKnowledgeItem(key: string, value: string): Promise<Record<string, string>> {
    const { data } = await apiClient.post('/user-hub/knowledge', { key, value });
    return data;
  },

  async deleteUserKnowledgeItem(key: string): Promise<Record<string, string>> {
    const { data } = await apiClient.delete(`/user-hub/knowledge/${encodeURIComponent(key)}`);
    return data;
  },

  async addReminder(title: string, target_time?: string, notes?: string): Promise<any> {
    const { data } = await apiClient.post('/user-hub/reminders', { title, target_time, notes });
    return data;
  },

  async addOneTimeReminder(reminder: { title: string; target_time?: string; notes?: string }): Promise<any> {
    return this.addReminder(reminder.title, reminder.target_time, reminder.notes);
  },

  async completeAndRemoveReminder(reminderId: string): Promise<any> {
    const { data } = await apiClient.delete(`/user-hub/reminders/${encodeURIComponent(reminderId)}`);
    return data;
  },

  async dismissOneTimeReminder(reminderId: string): Promise<any> {
    return this.completeAndRemoveReminder(reminderId);
  },

  async addOrUpdateStandingRule(rule: {
    id: string;
    title: string;
    description?: string;
    trigger_type?: string;
    active?: boolean;
  }): Promise<any> {
    const { data } = await apiClient.post('/user-hub/standing-rules', rule);
    return data;
  },

  async setStandingRule(ruleId: string, ruleData: { title: string; description?: string; trigger_type?: string; active?: boolean }): Promise<any> {
    return this.addOrUpdateStandingRule({ id: ruleId, ...ruleData });
  },

  async toggleStandingRule(ruleId: string, active?: boolean): Promise<any> {
    const { data } = await apiClient.put(`/user-hub/standing-rules/${encodeURIComponent(ruleId)}/toggle`, {
      active,
    });
    return data;
  },

  async deleteStandingRule(ruleId: string): Promise<any> {
    const { data } = await apiClient.delete(`/user-hub/standing-rules/${encodeURIComponent(ruleId)}`);
    return data;
  },

  // Notifications & Webhook Endpoints
  async testWebhook(webhookUrl: string): Promise<{
    success: boolean;
    statusCode: number;
    latencyMs: number;
    error: string;
    message: string;
  }> {
    const { data } = await apiClient.post('/notifications/test-webhook', { webhook_url: webhookUrl });
    return data;
  },

  async getNotificationHistory(): Promise<{ items: any[] }> {
    const { data } = await apiClient.get('/notifications/history');
    return data;
  },

  async clearNotificationHistory(): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete('/notifications/history');
    return data;
  },

  // Personalization Endpoints
  async getPersonalization(): Promise<{
    communicationTone: 'action' | 'executive' | 'copilot' | 'mentor';
    customInstructions: string;
    proactiveSuggestions: boolean;
    languageAutoSwitching: boolean;
    conciseCodeOnly: boolean;
  }> {
    const { data } = await apiClient.get('/personalization');
    return data;
  },

  async updatePersonalization(config: {
    communicationTone: 'action' | 'executive' | 'copilot' | 'mentor';
    customInstructions: string;
    proactiveSuggestions: boolean;
    languageAutoSwitching: boolean;
    conciseCodeOnly: boolean;
  }): Promise<any> {
    const { data } = await apiClient.put('/personalization', config);
    return data;
  },
};
