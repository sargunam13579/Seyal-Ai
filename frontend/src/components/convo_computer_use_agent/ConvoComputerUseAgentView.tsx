import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Plus,
  ArrowUp,
  User,
  Volume2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
} from 'lucide-react';
import { useSeyalAi } from '../../context/SeyalAiContext';
import { useVoice } from '../../context/VoiceContext';
import { api } from '../../services/api';
import type { MessageItem } from '../../types';
import appLogo from '../../assets/app-logo.png';

interface StepItem {
  step: number;
  thought: string;
  action: string;
  coordinates: [number | null, number | null];
  success: boolean;
  elapsed_seconds: number;
}

const formatMessageTime = (rawTime?: string): string => {
  if (!rawTime) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // If already formatted with seconds (e.g. "07:37:01 PM" or "19:37:01"), return directly
  if (/\d{1,2}:\d{2}:\d{2}/.test(rawTime)) {
    return rawTime;
  }

  // If it's a valid date parseable string (ISO date etc), format with seconds
  const parsed = new Date(rawTime);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // If it's in "hh:mm AM/PM" or "hh:mm" format, append ":00" to always show seconds
  const matchHm = rawTime.match(/^(\d{1,2}:\d{2})(\s*[APap][Mm])?$/);
  if (matchHm) {
    const timePart = matchHm[1];
    const ampm = matchHm[2] ? matchHm[2].toUpperCase() : '';
    return `${timePart}:00${ampm ? ` ${ampm.trim()}` : ''}`;
  }

  return rawTime;
};

export const ConvoComputerUseAgentView: React.FC = () => {
  const {
    computerUseMessages,
    setComputerUseMessages,
    computerUseConversationId,
    setComputerUseConversationId,
    addActivity,
    identity,
    setActiveConversationId,
    refreshConversations,
    isHeroLogoOpen,
    isTextInputPopupOpen,
    setIsTextInputPopupOpen,
    userProfileAvatar,
    isTaskExecuting,
    setIsTaskExecuting,
    agentStatus,
    setAgentStatus,
    liveSteps,
    setLiveSteps,
  } = useSeyalAi();

  const {
    isSpeaking,
    isUserSpeaking,
    interimTranscript,
    startListening,
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
    autoListen,
  } = useVoice();
  const userName = identity?.user_name || 'User';
  const wasVoiceTriggered = useRef<boolean>(true);
  const isMountedRef = useRef<boolean>(true);
  const activeConvoTurnRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const isMutedRef = useRef<boolean>(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const [isWaiting, setIsWaiting] = useState(false);
  const [isAgentGenerating, setIsAgentGenerating] = useState(false);
  const isTaskExecutingRef = useRef<boolean>(false);
  isTaskExecutingRef.current = isTaskExecuting;

  const isBusy = isWaiting || isTaskExecuting || isAgentGenerating;
  const isBusyRef = useRef<boolean>(false);
  isBusyRef.current = isBusy;

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Immediate real-time interruption (barge-in):
  // When user begins speaking mid-generation or during speech:
  // 1. Immediately abort active backend stream and network fetch
  // 2. Halt voice output and desktop task
  // 3. Freeze assistant bubble so text stops updating immediately
  // 4. Reset waiting/generating state so user's live speech bubble renders without delay
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
  }, [registerBargeInHandler, stopSpeaking]);

  // Permanent Transcript Handler (Push #22/23 style flawless delivery):
  // Whenever user finishes speaking, VoiceContext commits the final transcript here.
  // It immediately triggers handleSend to display the user message bubble and get agent reply!
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
  }, [registerTranscriptHandler, stopSpeaking, speakInstant]);

  // Immediate fail-safe: as soon as user begins speaking or first interim word arrives while agent is generating/waiting:
  // Abort old turn immediately so text streaming halts and user sees their own words streaming live!
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
  }, [interimTranscript, isUserSpeaking, isAgentGenerating, isWaiting, stopSpeaking]);

  // Focus text input when popup opens
  useEffect(() => {
    if (isTextInputPopupOpen) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isTextInputPopupOpen]);

  // Global keydown: Press '/' to focus popup, 'Esc' closes floating submenus (text input bar always remains open)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddMenu(false);
      } else if (e.key === '/' && !isTextInputPopupOpen) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          setIsTextInputPopupOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isTextInputPopupOpen, setIsTextInputPopupOpen]);

  // Track component mount lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to start listening for user voice input (works across all subsequent turns)
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

  // Pre-activate user microphone immediately when the app opens,
  // so there is zero latency/delay when the user wants to speak,
  // while allowing agent conversation to start simultaneously without waiting.
  useEffect(() => {
    if (autoListen && !isMutedRef.current) {
      console.log('[STARTUP] Pre-activating microphone stream immediately on app open...');
      triggerVoiceListen();
    }
  }, [triggerVoiceListen, autoListen]);

  // Instant context-aware welcome greeting with simultaneous word-by-word streaming (Zero startup delay)
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
            // On End: Ensure full message is visible and auto-listen starts
            setComputerUseMessages((prev) => {
              const next = [...prev];
              if (next.length > 0 && next[0].id === welcomeMsgId) {
                next[0] = { ...next[0], content: welcomeText };
              }
              return next;
            });
            if (isMountedRef.current && autoListen && !isMutedRef.current) {
              triggerVoiceListen();
            }
          },
          undefined,
          (revealedText) => {
            // Word-by-word simultaneous live karaoke sync with audio playback!
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
    } else if (autoListen && !isMuted && !isSpeaking && !isBusy) {
      // User navigated back from Simple Chat or other tab: Silent standby, do NOT repeat welcome!
      triggerVoiceListen();
    }
  }, [userName, autoListen, isMuted, isSpeaking, isBusy, triggerVoiceListen, getNextTurnId, speakAssistantResponse]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement | null>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);

  // Track manual user scrolling: if user scrolled up more than 160px from bottom, respect reading position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    isUserScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 160;
  }, []);

  // Smoothly or instantly scroll chat view to the bottom
  const scrollToBottom = useCallback((force = false, smooth = false) => {
    if (!force && isUserScrolledUpRef.current) return;
    if (scrollContainerRef.current) {
      if (smooth) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  const lastMessageContent = computerUseMessages[computerUseMessages.length - 1]?.content || '';

  // Continuous Auto-scroll: Triggers as agent reply streams in word-by-word ("vara vara"),
  // live voice interim appears, or new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [
    computerUseMessages.length,
    lastMessageContent,
    isWaiting,
    isAgentGenerating,
    isTaskExecuting,
    liveSteps.length,
    interimTranscript,
    isUserSpeaking,
    scrollToBottom,
  ]);

  // Close add menu on outside click or clicking plus button
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // If clicking inside the menu, keep it open
      if (addMenuRef.current && addMenuRef.current.contains(target)) {
        return;
      }
      // If clicking the plus button itself, let the button's onClick handle toggle
      if (plusButtonRef.current && plusButtonRef.current.contains(target)) {
        return;
      }
      // Otherwise, user clicked outside: close the menu!
      setShowAddMenu(false);
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddMenu]);


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
  }, [isBusy]);

  const handleToggleMic = () => {
    toggleMute();
    if (!isMuted) {
      wasVoiceTriggered.current = false;
    } else {
      wasVoiceTriggered.current = true;
      triggerVoiceListen();
    }
  };

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

  const handleSend = async (customGoal?: string, fromVoice = false) => {
    const goal = (customGoal || inputMessage).trim();
    if (!goal) return;

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

    // 4. Invalidate all previous turn operations so old callbacks can never touch state or bubbles
    activeConvoTurnRef.current += 1;
    const currentTurnId = activeConvoTurnRef.current;

    // 5. Create fresh AbortController for this turn
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    const isCancelled = () =>
      activeConvoTurnRef.current !== currentTurnId || abortController.signal.aborted;

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

      // Helper to update the assistant message bubble in the UI
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
          // Commit final complete text so nothing is clipped
          if (finalFullNarration || liveStreamedText) {
            updateAssistantBubble(finalFullNarration || liveStreamedText);
          }
          if (autoListen && isMountedRef.current && !isMutedRef.current && !isCancelled()) {
            setTimeout(() => {
              if (!isCancelled() && !isMutedRef.current) {
                triggerVoiceListen();
              }
            }, 120);
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
          // onEnd:
          () => {
            if (isCancelled()) return;
            spokenCommitText += (spokenCommitText ? ' ' : '') + item.text;
            updateAssistantBubble(spokenCommitText);
            isQueueProcessing = false;
            processSentenceQueue();
          },
          // onStart:
          () => {
            if (isCancelled()) return;
            setIsWaiting(false);
          },
          // onProgress: Simultaneous Word-by-Word Text Display in sync with audio
          (revealedInSentence) => {
            if (isCancelled()) return;
            const currentDisplay = (spokenCommitText ? spokenCommitText + ' ' : '') + revealedInSentence;
            const textToDisplay = liveStreamedText && liveStreamedText.length >= currentDisplay.length
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
        // Turn was interrupted and cancelled — exit without producing ghost/error bubbles
        return;
      }
      console.error('Computer-use execution error:', err);
      setIsAgentGenerating(false);
      setIsWaiting(false);
      const rawErrMsg = err?.response?.data?.detail || err.message || '';
      const isHttpOrNetworkError = /404|500|502|503|fetch|network|failed to fetch/i.test(rawErrMsg);
      const friendlyReply = isHttpOrNetworkError
        ? "I am ready and listening. Please let me know what desktop task or question I can assist you with."
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
        setIsWaiting(false);
        setIsTaskExecuting(false);
        isTaskExecutingRef.current = false;
        setProcessing(false);
        setAgentStatus('idle');
        refreshConversations();
        if (!isQueueProcessing && sentenceQueue.length === 0) {
          setIsAgentGenerating(false);
          if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
          }
        }
      }
    }
  };

  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  // Permanent Transcript Handler subscription: Ensures user speech is 100% committed to user bubble
  // and agent reply is invoked, exactly matching Push #22/23 reliability with live streaming interim!
  useEffect(() => {
    const unregister = registerTranscriptHandler((spokenText) => {
      if (!isMountedRef.current || isMutedRef.current) return;
      if (spokenText && spokenText.trim()) {
        const cleanSpoken = spokenText.trim();
        stopSpeaking();
        if (isTaskExecutingRef.current) {
          api.steerComputerUse(cleanSpoken, true).catch(() => {});
        } else {
          handleSendRef.current(cleanSpoken, true);
        }
      }
    });
    return unregister;
  }, [registerTranscriptHandler, stopSpeaking]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (showAddMenu) {
        e.preventDefault();
        e.stopPropagation();
        setShowAddMenu(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePlayTTS = (text: string, idx: number) => {
    if (isSpeaking && speakingMsgIdx === idx) {
      stopSpeaking();
      setSpeakingMsgIdx(null);
    } else {
      setSpeakingMsgIdx(idx);
      const turnId = getNextTurnId();
      speakAssistantResponse(text, turnId, () => setSpeakingMsgIdx(null));
    }
  };

  const handleCopyMessage = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Fallback
    }
  };

  const computerUsePresets = [
    {
      title: 'VS Code open பண்ணு',
      goal: 'VS Code open பண்ணு',
    },
    {
      title: 'Desktop Java folder open பண்ணு',
      goal: 'Desktop-la இருக்குற Java folder open பண்ணு',
    },
    {
      title: 'New file create panni palindrome code போடு',
      goal: 'New file create பண்ணி, check string palindrome code போடு',
    },
    {
      title: 'Code run பண்ணு',
      goal: 'Code run பண்ணு',
    },
    {
      title: 'Camera open panni photo edu',
      goal: 'Camera open panni photo edu',
    },
    {
      title: 'Delete "hello" and "hiii" chats',
      goal: '"hello" and "hiii" chats ah delete pannu',
    },
  ];

  return (
    <div className={`flex-1 flex flex-col min-h-0 relative w-full h-full transition-all duration-300 ${isHeroLogoOpen ? 'blur-[2.5px]' : ''}`}>
      {/* Upper Chatting Workspace (Banner + Messages) */}
      <div id="convo-chat-area" className="flex-1 flex flex-col min-h-0 relative w-full overflow-hidden">

        {/* Messages Scroll Container (w-[70%] with 15% gutters on both sides) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-2 pt-6 pb-4 custom-scrollbar w-full"
        >
          <div className="w-[70%] mx-auto space-y-6">
            {/* Message Bubbles */}
            {computerUseMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isTraceExpanded = expandedTraceIdx === idx;

              return (
                <div
                  key={msg.id || `${msg.role}-${idx}-${msg.timestamp || ''}`}
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}
                  className={`flex items-start gap-3.5 w-full group ${isUser ? 'justify-end' : 'justify-start'
                    }`}
                >
                  {!isUser && (
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-cyan-400/50 bg-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/20">
                      <img
                        src={appLogo}
                        alt="Seyal AI"
                        className={`w-full h-full object-cover rounded-full ${idx === computerUseMessages.length - 1 && (isWaiting || isAgentGenerating) ? 'animate-pulse' : ''}`}
                      />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] p-5 rounded-2xl text-sm sm:text-base leading-relaxed ${isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm shadow-md shadow-cyan-950/20'
                      : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-sm shadow-sm'
                      }`}
                  >
                    {/* Message Content */}
                    <div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content ? (
                          <>
                            {msg.content}
                            {!isUser && idx === computerUseMessages.length - 1 && isSpeaking && (
                              <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 py-1 px-0.5" title="Seyal AI responding...">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.7)] animate-typing-dot" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.7)] animate-typing-dot" style={{ animationDelay: '180ms' }} />
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.7)] animate-typing-dot" style={{ animationDelay: '360ms' }} />
                          </div>
                        )}
                      </p>

                      {/* Vision-Action Step Summary Card if Assistant */}
                      {/* Vision-Action Step Summary Card if Assistant */}
                      {!isUser && (() => {
                        const traceSteps = (msg.steps && msg.steps.length > 0)
                          ? msg.steps
                          : (idx === computerUseMessages.length - 1 ? liveSteps : []);
                        const hasTrace = traceSteps && traceSteps.length > 0;
                        const isCurrentlyRunning = idx === computerUseMessages.length - 1 && isTaskExecuting;

                        if (!hasTrace && !isCurrentlyRunning) return null;

                        return (
                          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                            {isCurrentlyRunning && (
                              <div className="flex items-center justify-between text-xs font-mono text-cyan-300 font-bold">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                  <span>Agent Status: {agentStatus.toUpperCase()}</span>
                                </div>
                                {hasTrace && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {traceSteps.length} step(s) executed
                                  </span>
                                )}
                              </div>
                            )}

                            {hasTrace && (
                              <>
                                <button
                                  onClick={() => setExpandedTraceIdx(isTraceExpanded ? null : idx)}
                                  className="flex items-center justify-between w-full text-xs font-mono text-cyan-400 hover:text-cyan-300 py-1"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5" />
                                    Vision-Action Execution Trace ({traceSteps.length} Steps)
                                  </span>
                                  {isTraceExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {isTraceExpanded && (
                                  <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    {traceSteps.map((step, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-cyan-400 font-bold">
                                            STEP #{step.step}
                                          </span>
                                          <span className="font-mono text-[10px] text-slate-400">
                                            {step.elapsed_seconds}s • {step.action}
                                          </span>
                                        </div>
                                        <p className="text-slate-300 text-[11px] italic">
                                          "{step.thought}"
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* User Message Footer */}
                    {isUser && (
                      <div className="mt-3 pt-2 border-t border-cyan-400/30 flex items-center justify-end text-xs text-cyan-100/80">
                        <span className="text-[10px] font-mono opacity-80">
                          {formatMessageTime(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    {/* Assistant Message Footer */}
                    {!isUser && msg.content && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyMessage(msg.content, idx)}
                            className="p-1 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-all text-slate-400"
                            title={copiedIdx === idx ? 'Copied!' : 'Copy message'}
                          >
                            {copiedIdx === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handlePlayTTS(msg.content, idx)}
                            className={`p-1 rounded-lg hover:bg-slate-800 transition-all ${isSpeaking && speakingMsgIdx === idx
                              ? 'text-cyan-400 bg-slate-800'
                              : 'text-slate-400 hover:text-cyan-300'
                              }`}
                            title={isSpeaking && speakingMsgIdx === idx ? 'Stop voice' : 'Listen voice'}
                          >
                            <Volume2
                              className={`w-3.5 h-3.5 ${isSpeaking && speakingMsgIdx === idx ? 'animate-pulse' : ''
                                }`}
                            />
                          </button>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">
                          {formatMessageTime(msg.timestamp)}
                        </span>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-1 ring-white/10">
                      {userProfileAvatar ? (
                        <img
                          src={userProfileAvatar}
                          alt="User"
                          className="w-full h-full object-cover rounded-full"
                          style={{ imageRendering: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                        />
                      ) : (
                        <User className="w-4.5 h-4.5" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Outgoing User Voice Bubble — only displays live spoken words */}
            {Boolean(interimTranscript && interimTranscript.trim()) && (
              <div className="flex items-start gap-3.5 justify-end animate-fadeIn w-full">
                <div className="relative max-w-[85%] p-5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/30 border border-cyan-400/40">
                  <div className="flex items-center flex-wrap gap-2 text-sm sm:text-base leading-relaxed">
                    <span className="font-normal text-white tracking-wide">
                      {interimTranscript.trim()}
                    </span>
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-cyan-200 animate-pulse align-middle" />
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-cyan-400 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-2 ring-cyan-400/30">
                  {userProfileAvatar ? (
                    <img
                      src={userProfileAvatar}
                      alt="User"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-4.5 h-4.5" />
                  )}
                </div>
              </div>
            )}

            <div className="h-24" />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Floating Text-Input-Bar Popup in the exact original view */}
      {isTextInputPopupOpen && (
        <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none animate-fadeIn">
          <div className="w-[65%] relative space-y-2 pointer-events-auto">
            {/* Plus (+) Menu Popup: Quick Presets */}
            {showAddMenu && (
              <div
                ref={addMenuRef}
                className="absolute bottom-16 left-0 p-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl shadow-black flex flex-col gap-1 w-64 animate-fadeIn backdrop-blur-xl z-50"
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase px-2.5 py-1">Preset Recipes</span>
                {computerUsePresets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleSend(preset.goal);
                      setShowAddMenu(false);
                    }}
                    className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs truncate transition-all text-left cursor-pointer"
                    title={preset.goal}
                  >
                    • {preset.title}
                  </button>
                ))}
              </div>
            )}

            {/* Pill Input Bar in Exact Original View */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900/95 border border-slate-700/80 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 backdrop-blur-2xl shadow-2xl shadow-black/80 transition-colors">
              {/* Plus Button (+) */}
              <button
                ref={plusButtonRef}
                type="button"
                onClick={() => setShowAddMenu((prev) => !prev)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-all shrink-0 focus:outline-none cursor-pointer"
                title={showAddMenu ? "Close Presets" : "Preset Recipes"}
              >
                <Plus
                  className={`w-5 h-5 transition-transform duration-200 ${
                    showAddMenu ? 'rotate-45 text-cyan-400' : ''
                  }`}
                />
              </button>

              {/* Text Input - Completely seamless & borderless (No inner box shape) */}
              <div className="flex-1 flex items-center relative min-w-0 bg-transparent" style={{ border: 'none', outline: 'none' }}>
                <input
                  ref={textInputRef}
                  data-seyal-input="true"
                  type="text"
                  value={inputMessage || (interimTranscript ? interimTranscript : '')}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={interimTranscript ? "Listening to your voice..." : "Type or speak computer instruction..."}
                  className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base px-2 py-1 border-0 border-none outline-none focus:outline-none ring-0 focus:ring-0 shadow-none"
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                />
              </div>

              {/* Simple Circular Microphone Button for Mute / Unmute */}
              <button
                type="button"
                onClick={handleToggleMic}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 focus:outline-none cursor-pointer ${
                  !isMuted
                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
                title={!isMuted ? 'Mute microphone' : 'Unmute microphone'}
              >
                {!isMuted ? (
                  <Mic className="w-4 h-4 text-cyan-400" />
                ) : (
                  <MicOff className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Send Button (↑) for Typed Input */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputMessage.trim()}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 hover:text-white font-bold flex items-center justify-center transition-all shrink-0 border border-slate-700 focus:outline-none cursor-pointer"
                title="Send Typed Message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
