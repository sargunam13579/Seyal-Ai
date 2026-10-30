import { apiClient } from './client';
import type {
  VoiceConfigResponse,
  VoiceStatusResponse,
} from '../../types';

export const voiceApi = {
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
};
