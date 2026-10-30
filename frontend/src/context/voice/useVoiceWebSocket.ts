import { useRef, useCallback, useEffect } from 'react';

export interface UseVoiceWebSocketOptions {
  recognitionLangRef: React.MutableRefObject<string>;
  voiceModeEnabledRef: React.MutableRefObject<boolean>;
  isRecognitionActiveRef: React.MutableRefObject<boolean>;
  onBargeIn: () => void;
  onSpeechStarted: () => void;
  onInterimTranscript: (text: string) => void;
  onTranscript: (text: string) => void;
  onSttEmpty: () => void;
  onSttError: (error: string) => void;
}

export function useVoiceWebSocket(options: UseVoiceWebSocketOptions) {
  const {
    recognitionLangRef,
    voiceModeEnabledRef,
    isRecognitionActiveRef,
    onBargeIn,
    onSpeechStarted,
    onInterimTranscript,
    onTranscript,
    onSttEmpty,
    onSttError,
  } = options;

  const voiceWsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);

  const sendPcmChunk = useCallback((pcm16: Int16Array) => {
    if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
      try {
        voiceWsRef.current.send(pcm16.buffer as ArrayBuffer);
      } catch {
        // ignore
      }
    }
  }, []);

  const sendConfig = useCallback((language: string) => {
    if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
      try {
        voiceWsRef.current.send(JSON.stringify({ type: 'config', language }));
      } catch {
        // ignore
      }
    }
  }, []);

  const sendAssistantSpeaking = useCallback((status: boolean) => {
    if (voiceWsRef.current && voiceWsRef.current.readyState === WebSocket.OPEN) {
      try {
        voiceWsRef.current.send(JSON.stringify({ type: 'assistant_speaking', status }));
      } catch {
        // ignore
      }
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      if (
        voiceWsRef.current &&
        (voiceWsRef.current.readyState === WebSocket.OPEN ||
          voiceWsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }
      let wsUrl = '';
      if (typeof window !== 'undefined') {
        if (window.location.protocol === 'file:' || Boolean((window as any).electronAPI)) {
          wsUrl = 'ws://127.0.0.1:8000/api/voice/ws';
        } else if (window.location.port === '5173') {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsHost = window.location.hostname || 'localhost';
          wsUrl = `${wsProtocol}//${wsHost}:8000/api/voice/ws`;
        } else {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsHost = window.location.hostname || 'localhost';
          const portPart = window.location.port ? `:${window.location.port}` : '';
          wsUrl = `${wsProtocol}//${wsHost}${portPart}/api/voice/ws`;
        }
      } else {
        wsUrl = 'ws://127.0.0.1:8000/api/voice/ws';
      }
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('[VOICE WS] Connected to Realtime WebSocket at', wsUrl);
        ws.send(
          JSON.stringify({
            type: 'config',
            language: recognitionLangRef.current || 'auto',
          })
        );
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // ignore
            }
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'barge_in') {
            console.log('[REALTIME BARGE-IN] Server barge-in detected! Stopping assistant speech immediately.');
            onBargeIn();
          } else if (data.event === 'speech_started') {
            console.log('[REALTIME VAD] Server speech_started received');
            onSpeechStarted();
          } else if (data.event === 'interim_transcript' && data.text) {
            console.log('[REALTIME STT] Server interim transcript received:', data.text);
            onInterimTranscript(data.text);
          } else if (data.event === 'transcript' && data.text) {
            console.log('[REALTIME STT] Server transcript received:', data.text);
            onTranscript(data.text);
          } else if (data.event === 'stt_empty') {
            console.warn('[REALTIME STT] Server reported empty speech transcript.');
            onSttEmpty();
          } else if (data.event === 'stt_error') {
            console.warn('[REALTIME STT] Server STT error:', data.error);
            onSttError(data.error);
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        if (voiceModeEnabledRef.current && isRecognitionActiveRef.current) {
          setTimeout(() => {
            if (voiceModeEnabledRef.current) connectWebSocket();
          }, 2500);
        }
      };

      ws.onerror = () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };

      voiceWsRef.current = ws;
    } catch (wsErr) {
      console.debug('[VOICE WS] Notice:', wsErr);
    }
  }, [
    recognitionLangRef,
    voiceModeEnabledRef,
    isRecognitionActiveRef,
    onBargeIn,
    onSpeechStarted,
    onInterimTranscript,
    onTranscript,
    onSttEmpty,
    onSttError,
  ]);

  const closeWebSocket = useCallback((graceful = true) => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (voiceWsRef.current) {
      const wsToClose = voiceWsRef.current;
      voiceWsRef.current = null;
      if (graceful) {
        setTimeout(() => {
          try {
            if (wsToClose.readyState === WebSocket.OPEN) {
              wsToClose.close();
            }
          } catch {
            // ignore
          }
        }, 1200);
      } else {
        try {
          if (wsToClose.readyState === WebSocket.OPEN) {
            wsToClose.close();
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      closeWebSocket(false);
    };
  }, [closeWebSocket]);

  return {
    voiceWsRef,
    connectWebSocket,
    closeWebSocket,
    sendPcmChunk,
    sendConfig,
    sendAssistantSpeaking,
  };
}
