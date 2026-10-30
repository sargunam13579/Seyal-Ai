import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoice } from '../../../context/VoiceContext';
import { api } from '../../../services/api';
import type { MessageItem } from '../../../types';
import type { StepItem } from '../types';

interface UseAgentExecutionProps {
  setComputerUseMessages: React.Dispatch<React.SetStateAction<MessageItem[]>>;
  computerUseConversationId: string | null;
  setComputerUseConversationId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  refreshConversations: () => void;
  addActivity: (act: any) => void;
  identity: any;
  isTaskExecuting: boolean;
  setIsTaskExecuting: (val: boolean) => void;
  agentStatus: string;
  setAgentStatus: (val: string) => void;
  liveSteps: StepItem[];
  setLiveSteps: React.Dispatch<React.SetStateAction<StepItem[]>>;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  setShowAddMenu: (val: boolean) => void;
  scrollToBottom: (force?: boolean, smooth?: boolean) => void;
  isUserScrolledUpRef: React.MutableRefObject<boolean>;
}

export const useAgentExecution = ({
  setComputerUseMessages,
  computerUseConversationId,
  setComputerUseConversationId,
  setActiveConversationId,
  refreshConversations,
  addActivity,
  identity,
  isTaskExecuting,
  setIsTaskExecuting,
  setAgentStatus,
  setLiveSteps,
  inputMessage,
  setInputMessage,
  setShowAddMenu,
  scrollToBottom,
  isUserScrolledUpRef,
}: UseAgentExecutionProps) => {
  const {
    isListening,
    startListening,
    stopListening,
    isSpeaking,
    isUserSpeaking,
    interimTranscript,
    speakInstant,
    speakAssistantResponse,
    preloadAssistantAudio,
    getNextTurnId,
    stopSpeaking,
    setProcessing,
    registerBargeInHandler,
    registerTranscriptHandler,
    isMuted,
    toggleMute,
  } = useVoice();

  const userName = identity?.user_name || 'User';
  const wasVoiceTriggered = useRef<boolean>(true);
  const lastVoiceUtteranceRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const isMountedRef = useRef<boolean>(true);
  const activeConvoTurnRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const isMutedRef = useRef<boolean>(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const [isWaiting, setIsWaiting] = useState(false);
  const [isAgentGenerating, setIsAgentGenerating] = useState(false);
  const isTaskExecutingRef = useRef<boolean>(isTaskExecuting);
  useEffect(() => {
    isTaskExecutingRef.current = isTaskExecuting;
  }, [isTaskExecuting]);

  const isBusy = isWaiting || isTaskExecuting || isAgentGenerating;

  // Immediate real-time interruption (barge-in):
  useEffect(() => {
    if (!registerBargeInHandler) return;
    const unsubscribe = registerBargeInHandler(() => {
      console.log('[CONVO VIEW] Barge-in triggered: aborting stream, freezing bubble, and listening to user');
      if (activeAbortControllerRef.current) {
        try {
          activeAbortControllerRef.current.abort();
        } catch {}
        activeAbortControllerRef.current = null;
      }
      stopSpeaking();
      if (isTaskExecutingRef.current) {
        api.stopComputerUse().catch(() => {});
      }
      activeConvoTurnRef.current += 1;
      setIsWaiting(false);
      setIsAgentGenerating(false);
      setIsTaskExecuting(false);
      isTaskExecutingRef.current = false;
      setLiveSteps([]);
    });
    return () => {
      unsubscribe();
    };
  }, [registerBargeInHandler, stopSpeaking, setIsTaskExecuting, setLiveSteps]);

  // Track component mount lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to start listening for user voice input
  const triggerVoiceListen = useCallback(() => {
    if (!isMountedRef.current || isMutedRef.current) return;
    wasVoiceTriggered.current = true;
    startListening();
  }, [startListening]);

  // Listen to Global Push-to-Talk Hotkey from Electron (Ctrl+Space / Alt+Space)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onVoiceListenTrigger) {
      const cleanup = (window as any).electronAPI.onVoiceListenTrigger(() => {
        console.log('[GLOBAL HOTKEY] Triggering voice listen from Electron global shortcut');
        triggerVoiceListen();
      });
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }
  }, [triggerVoiceListen]);

  // Poll status when executing a task or waiting for response (pauses when window is minimized)
  useEffect(() => {
    let interval: any = null;

    const poll = async () => {
      try {
        const res = await api.getComputerUseStatus();
        setAgentStatus(res.status);
        if (res.history && isTaskExecutingRef.current) {
          setLiveSteps(res.history);
        }
        if (res.is_task) {
          setIsTaskExecuting(true);
          isTaskExecutingRef.current = true;
        }
        if (['completed', 'failed', 'stopped', 'idle'].includes(res.status) && !res.is_task) {
          setIsTaskExecuting(false);
          isTaskExecutingRef.current = false;
        }
      } catch (e) {
        console.debug('Status poll error', e);
      }
    };

    const startPolling = () => {
      if (interval) clearInterval(interval);
      if (isBusy && !document.hidden) {
        poll();
        interval = setInterval(poll, 1000);
      }
    };

    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
      } else if (isBusy) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isBusy, setAgentStatus, setIsTaskExecuting, setLiveSteps]);

  // Instant context-aware welcome greeting with simultaneous word-by-word streaming
  useEffect(() => {
    const welcomeSpoken = sessionStorage.getItem('ccua_session_welcome_spoken');
    if (!welcomeSpoken) {
      sessionStorage.setItem('ccua_session_welcome_spoken', 'true');

      const triggerGreeting = async () => {
        let welcomeText = '';
        try {
          welcomeText = await api.getWelcomeGreeting(userName || 'Friend');
        } catch {
          // fallback
        }
        if (!welcomeText) {
          const now = new Date();
          const hour = now.getHours();
          const timeGreeting =
            hour >= 5 && hour < 12
              ? 'Good morning'
              : hour >= 12 && hour < 17
              ? 'Good afternoon'
              : hour >= 17 && hour < 22
              ? 'Good evening'
              : 'Hey';
          welcomeText = `${timeGreeting} ${userName || 'Friend'}! I am ready. What task would you like to run today? 😊✨`;
        }

        const welcomeMsgId = 'welcome-' + Date.now();

        // 1. Initialize assistant message bubble with empty text so it streams word-by-word in sync
        setComputerUseMessages((prev) => {
          if (prev.length === 0) {
            return [
              {
                id: welcomeMsgId,
                role: 'assistant',
                content: '',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                model_used: 'gemini-2.5-flash',
              },
            ];
          }
          return prev;
        });

        // 2. Speak using the unified assistant voice engine with simultaneous word-by-word streaming!
        const welcomeTurnId = getNextTurnId();
        speakAssistantResponse(
          welcomeText,
          welcomeTurnId,
          () => {
            setComputerUseMessages((prev) => {
              const next = [...prev];
              if (next.length > 0 && next[0].id === welcomeMsgId) {
                next[0] = { ...next[0], content: welcomeText };
              }
              return next;
            });
          },
          undefined,
          (revealedText) => {
            setComputerUseMessages((prev) => {
              const next = [...prev];
              if (next.length > 0 && next[0].id === welcomeMsgId) {
                next[0] = { ...next[0], content: revealedText };
              }
              return next;
            });
          }
        );
      };

      triggerGreeting();
    }
  }, [userName, isMuted, isSpeaking, isBusy, getNextTurnId, speakAssistantResponse, setComputerUseMessages]);

  const computerUseConversationIdRef = useRef<string | null>(computerUseConversationId);
  useEffect(() => {
    computerUseConversationIdRef.current = computerUseConversationId;
  }, [computerUseConversationId]);

  const isNewChatIntent = (text: string) => {
    const lower = text.toLowerCase().trim();
    const keywords = [
      'new chat',
      'open new chat',
      'start new chat',
      'create new chat',
      'new chat open',
      'new chat start',
      'new conversation',
      'open a new chat',
      'start a new chat',
    ];
    return keywords.some((kw) => lower.includes(kw));
  };

  const handleSend = useCallback(
    async (customGoal?: string, fromVoice = false) => {
      const goal = (customGoal || inputMessage).trim();
      if (!goal) return;

      // Deduplication Lock: Prevent duplicate rapid identical voice emissions within 1500ms
      if (fromVoice) {
        const now = Date.now();
        const norm = goal.toLowerCase().trim();
        if (lastVoiceUtteranceRef.current.text === norm && now - lastVoiceUtteranceRef.current.time < 1500) {
          console.log('[CONVO VIEW] Debounced duplicate voice utterance:', goal);
          return;
        }
        lastVoiceUtteranceRef.current = { text: norm, time: now };
      }

      // 1. Immediately abort active network stream from any prior turn
      if (activeAbortControllerRef.current) {
        try {
          activeAbortControllerRef.current.abort();
        } catch (e) {
          console.debug('Error aborting prior stream:', e);
        }
        activeAbortControllerRef.current = null;
      }

      // 2. Immediately stop audio speech output
      stopSpeaking();

      // 3. Halt prior task execution on backend if active
      if (isTaskExecutingRef.current) {
        api.stopComputerUse().catch(() => {});
      }
      setIsTaskExecuting(false);
      isTaskExecutingRef.current = false;
      setLiveSteps([]);

      // 4. Invalidate all previous turn operations
      activeConvoTurnRef.current += 1;
      const currentTurnId = activeConvoTurnRef.current;

      // 5. Create fresh AbortController for this turn
      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;

      const isCancelled = () =>
        !isMountedRef.current ||
        activeConvoTurnRef.current !== currentTurnId ||
        abortController.signal.aborted;

      if (fromVoice) {
        wasVoiceTriggered.current = true;
      }

      let targetConvId = computerUseConversationIdRef.current;
      if (isNewChatIntent(goal)) {
        targetConvId = null;
        setComputerUseConversationId(null);
        computerUseConversationIdRef.current = null;
        setComputerUseMessages([]);
      }

      setInputMessage('');
      setShowAddMenu(false);

      const userMsg: MessageItem = {
        id: 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        role: 'user',
        content: goal,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      // Remove any incomplete/empty assistant bubbles from interrupted turns before adding user message
      setComputerUseMessages((prev) => {
        const filtered = prev.filter((m) => m.role !== 'assistant' || m.content.trim().length > 0);
        return [...filtered, userMsg];
      });

      isUserScrolledUpRef.current = false;
      setTimeout(() => scrollToBottom(true, true), 30);
      setIsWaiting(true);
      setIsAgentGenerating(true);
      setProcessing(true);
      setAgentStatus('thinking');

      addActivity({
        type: 'tool_exec',
        title: 'Conversational Computer-Use Started',
        detail: goal,
        status: 'info',
      });

      let isTaskMode = false;
      interface VoiceQueueItem {
        text: string;
        audioPromise: Promise<Blob | null>;
      }
      const sentenceQueue: VoiceQueueItem[] = [];
      let isQueueProcessing = false;
      let spokenCommitText = '';
      let clauseBuffer = '';
      let isFirstClauseSent = false;
      let isStreamCompleted = false;
      let finalFullNarration = '';
      let liveStreamedText = '';

      let safetyTimeout: any = null;

      try {
        safetyTimeout = setTimeout(() => {
          if (isMountedRef.current && !isCancelled()) {
            setIsAgentGenerating(false);
            setIsWaiting(false);
          }
        }, 25000);

        const assistantMsgId = 'assistant-' + Date.now();

        // Immediately mount assistant bubble into conversation so thinking indicator appears
        setComputerUseMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            model_used: 'gemini-2.5-flash',
          },
        ]);

        const updateAssistantBubble = (text: string, steps?: StepItem[]) => {
          if (isCancelled()) return;
          setComputerUseMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantMsgId);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                content: text,
                steps: steps || next[idx].steps,
              };
              return next;
            } else {
              return [
                ...prev,
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  model_used: 'gemini-2.5-flash',
                  steps,
                },
              ];
            }
          });
          scrollToBottom();
        };

        const checkAllCompleted = () => {
          if (isCancelled()) return;
          if (isStreamCompleted && sentenceQueue.length === 0 && !isQueueProcessing) {
            if (safetyTimeout) {
              clearTimeout(safetyTimeout);
              safetyTimeout = null;
            }
            setIsAgentGenerating(false);
            setIsWaiting(false);
            if (finalFullNarration || liveStreamedText) {
              updateAssistantBubble(finalFullNarration || liveStreamedText);
            }
          }
        };

        const processSentenceQueue = async () => {
          if (isCancelled()) {
            sentenceQueue.length = 0;
            return;
          }
          if (isQueueProcessing) return;
          if (sentenceQueue.length === 0) {
            checkAllCompleted();
            return;
          }

          const item = sentenceQueue.shift()!;
          isQueueProcessing = true;
          const voiceTurnId = getNextTurnId();

          let preloadedBlob: Blob | null = null;
          try {
            preloadedBlob = await item.audioPromise;
          } catch {
            preloadedBlob = null;
          }

          if (isCancelled()) {
            sentenceQueue.length = 0;
            isQueueProcessing = false;
            return;
          }

          speakAssistantResponse(
            item.text,
            voiceTurnId,
            () => {
              if (isCancelled()) return;
              spokenCommitText += (spokenCommitText ? ' ' : '') + item.text;
              updateAssistantBubble(spokenCommitText);
              isQueueProcessing = false;
              processSentenceQueue();
            },
            () => {
              if (isCancelled()) return;
              setIsWaiting(false);
            },
            (revealedInSentence) => {
              if (isCancelled()) return;
              const currentDisplay = (spokenCommitText ? spokenCommitText + ' ' : '') + revealedInSentence;
              const textToDisplay =
                liveStreamedText && liveStreamedText.length >= currentDisplay.length
                  ? liveStreamedText
                  : currentDisplay;
              updateAssistantBubble(textToDisplay);
            },
            undefined,
            preloadedBlob
          );
        };

        const enqueueSentence = (sentence: string) => {
          if (isCancelled()) return;
          const clean = sentence.trim();
          if (!clean) return;
          const audioPromise = preloadAssistantAudio(clean);
          sentenceQueue.push({ text: clean, audioPromise });
          processSentenceQueue();
        };

        await api.runComputerUseStream(
          goal,
          20,
          true,
          targetConvId || undefined,
          (chunk) => {
            if (isCancelled()) return;
            liveStreamedText += chunk;
            clauseBuffer += chunk;
            setIsWaiting(false);
            updateAssistantBubble(liveStreamedText);

            if (!isFirstClauseSent) {
              const earlyMatch = clauseBuffer.match(/^(.*?[,;:\n.?!—]+)(\s+.*|$)/s);
              if (earlyMatch && earlyMatch[1].trim().length >= 2) {
                const firstPhrase = earlyMatch[1].trim();
                clauseBuffer = earlyMatch[2] ? earlyMatch[2].trimStart() : '';
                isFirstClauseSent = true;
                enqueueSentence(firstPhrase);
              } else {
                const words = clauseBuffer.trim().split(/\s+/);
                if (words.length >= 3) {
                  const firstPhrase = words.slice(0, 2).join(' ');
                  clauseBuffer = words.slice(2).join(' ');
                  isFirstClauseSent = true;
                  enqueueSentence(firstPhrase);
                }
              }
            }

            let match: RegExpMatchArray | null = null;
            while ((match = clauseBuffer.match(/^(.*?[.?!;\n]+)(\s+.*|$)/s)) !== null) {
              if (isCancelled()) return;
              const completeSentence = match[1].trim();
              clauseBuffer = match[2] ? match[2].trimStart() : '';
              if (completeSentence) {
                isFirstClauseSent = true;
                enqueueSentence(completeSentence);
              }
            }

            if (clauseBuffer.trim().split(/\s+/).length >= 10) {
              const commaMatch = clauseBuffer.match(/^(.*?[,;:\n—]+)(\s+.*|$)/s);
              if (commaMatch && commaMatch[1].trim().split(/\s+/).length >= 3) {
                const clausePart = commaMatch[1].trim();
                clauseBuffer = commaMatch[2] ? commaMatch[2].trimStart() : '';
                isFirstClauseSent = true;
                enqueueSentence(clausePart);
              }
            }
          },
          (startedConvId, isTask) => {
            if (isCancelled()) return;
            isTaskMode = isTask;
            if (startedConvId) {
              setComputerUseConversationId(startedConvId);
              computerUseConversationIdRef.current = startedConvId;
              setActiveConversationId(startedConvId);
              refreshConversations();
            }
            if (isTask) {
              setIsTaskExecuting(true);
              isTaskExecutingRef.current = true;
            }
          },
          (ackText) => {
            if (isCancelled()) return;
            setIsWaiting(false);
            enqueueSentence(ackText);
          },
          (result) => {
            if (isCancelled()) return;
            if (result.conversation_id) {
              setComputerUseConversationId(result.conversation_id);
              computerUseConversationIdRef.current = result.conversation_id;
              setActiveConversationId(result.conversation_id);
              refreshConversations();
            }
            if (result.history) {
              setLiveSteps(result.history);
            }
            finalFullNarration = result.narration || liveStreamedText;
            isStreamCompleted = true;

            if (result.history && result.history.length > 0) {
              updateAssistantBubble(finalFullNarration || liveStreamedText, result.history);
            }

            if (clauseBuffer.trim()) {
              enqueueSentence(clauseBuffer.trim());
              clauseBuffer = '';
            } else {
              checkAllCompleted();
            }

            addActivity({
              type: 'tool_exec',
              title: isTaskMode ? 'Computer-Use Goal Achieved' : 'Conversational Response',
              detail: (result.narration || 'Completed').slice(0, 100),
              status: 'success',
            });
          },
          abortController.signal
        );

        if (isCancelled()) return;

        isStreamCompleted = true;
        if (clauseBuffer.trim()) {
          enqueueSentence(clauseBuffer.trim());
          clauseBuffer = '';
        } else {
          checkAllCompleted();
        }
      } catch (err: any) {
        if (isCancelled() || err?.name === 'AbortError' || abortController.signal.aborted) {
          return;
        }
        console.error('Computer-use execution error:', err);
        setIsAgentGenerating(false);
        setIsWaiting(false);
        const rawErrMsg = err?.response?.data?.detail || err.message || '';
        const isHttpOrNetworkError = /404|500|502|503|fetch|network|failed to fetch/i.test(rawErrMsg);
        const friendlyReply = isHttpOrNetworkError
          ? 'I am ready and listening. Please let me know what desktop task or question I can assist you with.'
          : `I encountered an issue: ${rawErrMsg}. Please try again.`;

        const assistantMsg: MessageItem = {
          role: 'assistant',
          content: friendlyReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setComputerUseMessages((prev) => [...prev, assistantMsg]);
        speakInstant(friendlyReply);
        addActivity({
          type: 'tool_exec',
          title: isHttpOrNetworkError ? 'Assistant Ready' : 'Execution Notice',
          detail: rawErrMsg || 'Notice handled',
          status: isHttpOrNetworkError ? 'success' : 'error',
        });
      } finally {
        if (activeConvoTurnRef.current === currentTurnId) {
          isStreamCompleted = true;
          if (isMountedRef.current) {
            setIsWaiting(false);
            setIsTaskExecuting(false);
            setProcessing(false);
            setAgentStatus('idle');
            refreshConversations();
            if (!isQueueProcessing && sentenceQueue.length === 0) {
              setIsAgentGenerating(false);
            }
          }
          isTaskExecutingRef.current = false;
          if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
          }
        }
      }
    },
    [
      inputMessage,
      stopSpeaking,
      setIsTaskExecuting,
      setLiveSteps,
      setComputerUseConversationId,
      setComputerUseMessages,
      scrollToBottom,
      setProcessing,
      setAgentStatus,
      addActivity,
      getNextTurnId,
      speakAssistantResponse,
      preloadAssistantAudio,
      setActiveConversationId,
      refreshConversations,
      speakInstant,
      setInputMessage,
      setShowAddMenu,
      isUserScrolledUpRef,
    ]
  );

  // Permanent Transcript Handler:
  useEffect(() => {
    if (!registerTranscriptHandler) return;
    const unsubscribe = registerTranscriptHandler((spokenText) => {
      if (!isMountedRef.current || isMutedRef.current) return;
      if (spokenText && spokenText.trim()) {
        const cleanSpoken = spokenText.trim();
        console.log('[CONVO VIEW] User speech received from VoiceContext:', cleanSpoken);
        stopSpeaking();
        if (isTaskExecutingRef.current) {
          api.steerComputerUse(cleanSpoken, true).catch(() => {});
          addActivity({
            type: 'chat',
            title: 'Voice Steering Injected',
            detail: cleanSpoken,
            status: 'info',
          });
          speakInstant(`Steering instruction received: ${cleanSpoken}`);
        } else {
          handleSend(cleanSpoken, true);
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [registerTranscriptHandler, stopSpeaking, speakInstant, addActivity, handleSend]);

  // Immediate fail-safe: as soon as user begins speaking mid-generation
  useEffect(() => {
    if ((interimTranscript && interimTranscript.trim().length > 0) || isUserSpeaking) {
      if (isAgentGenerating || isWaiting || isTaskExecutingRef.current) {
        console.log('[CONVO VIEW] User speech detected mid-generation: freezing old bubble & showing user words!');
        if (activeAbortControllerRef.current) {
          try {
            activeAbortControllerRef.current.abort();
          } catch {}
          activeAbortControllerRef.current = null;
        }
        stopSpeaking();
        if (isTaskExecutingRef.current) {
          api.stopComputerUse().catch(() => {});
        }
        activeConvoTurnRef.current += 1;
        setIsWaiting(false);
        setIsAgentGenerating(false);
        setIsTaskExecuting(false);
        isTaskExecutingRef.current = false;
        setLiveSteps([]);
      }
    }
  }, [interimTranscript, isUserSpeaking, isAgentGenerating, isWaiting, stopSpeaking, setIsTaskExecuting, setLiveSteps]);

  const handleToggleMic = () => {
    if (isListening) {
      wasVoiceTriggered.current = false;
      stopListening();
    } else {
      wasVoiceTriggered.current = true;
      if (isMuted) {
        toggleMute();
      }
      startListening();
    }
  };

  return {
    isWaiting,
    isAgentGenerating,
    isBusy,
    isListening,
    isSpeaking,
    interimTranscript,
    handleSend,
    handleToggleMic,
  };
};
