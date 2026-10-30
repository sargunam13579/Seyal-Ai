import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSeyalAi } from '../../context/SeyalAiContext';
import { useVoice } from '../../context/VoiceContext';
import { UserMessageBubble } from './components/UserMessageBubble';
import { AssistantMessageBubble } from './components/AssistantMessageBubble';
import { LiveInterimVoiceBubble } from './components/LiveInterimVoiceBubble';
import { PillTextInputBar } from './components/PillTextInputBar';
import { useAgentExecution } from './hooks/useAgentExecution';
export type { StepItem } from './types';
export { formatMessageTime, computerUsePresets } from './types';

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
    getNextTurnId,
    stopSpeaking,
    speakAssistantResponse,
  } = useVoice();

  const [inputMessage, setInputMessage] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

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

  const {
    isWaiting,
    isAgentGenerating,
    isListening,
    isSpeaking,
    interimTranscript,
    handleSend,
    handleToggleMic,
  } = useAgentExecution({
    setComputerUseMessages,
    computerUseConversationId,
    setComputerUseConversationId,
    setActiveConversationId,
    refreshConversations,
    addActivity,
    identity,
    isTaskExecuting,
    setIsTaskExecuting,
    agentStatus,
    setAgentStatus,
    liveSteps,
    setLiveSteps,
    inputMessage,
    setInputMessage,
    setShowAddMenu,
    scrollToBottom,
    isUserScrolledUpRef,
  });

  // Focus text input when popup opens
  useEffect(() => {
    if (isTextInputPopupOpen) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isTextInputPopupOpen]);

  // Global keydown: Press '/' to focus popup, 'Esc' closes floating submenus
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

  const lastMessageContent = computerUseMessages[computerUseMessages.length - 1]?.content || '';

  // Continuous Auto-scroll as text streams or new messages arrive
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
    scrollToBottom,
  ]);

  // Close add menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addMenuRef.current && addMenuRef.current.contains(target)) return;
      if (plusButtonRef.current && plusButtonRef.current.contains(target)) return;
      setShowAddMenu(false);
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddMenu]);

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
      if (isMountedRef.current) setSpeakingMsgIdx(null);
    } else {
      setSpeakingMsgIdx(idx);
      const turnId = getNextTurnId();
      speakAssistantResponse(text, turnId, () => {
        if (isMountedRef.current) {
          setSpeakingMsgIdx(null);
        }
      });
    }
  };

  const handleCopyMessage = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (!isMountedRef.current) return;
      setCopiedIdx(idx);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCopiedIdx(null);
        }
      }, 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 relative w-full h-full transition-all duration-300 ${
        isHeroLogoOpen ? 'blur-[2.5px]' : ''
      }`}
    >
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

              if (isUser) {
                return (
                  <UserMessageBubble
                    key={msg.id || `user-${idx}-${msg.timestamp || ''}`}
                    message={msg}
                    userProfileAvatar={userProfileAvatar}
                  />
                );
              }

              return (
                <AssistantMessageBubble
                  key={msg.id || `asst-${idx}-${msg.timestamp || ''}`}
                  message={msg}
                  index={idx}
                  totalMessages={computerUseMessages.length}
                  isWaiting={isWaiting}
                  isAgentGenerating={isAgentGenerating}
                  isSpeaking={isSpeaking}
                  speakingMsgIdx={speakingMsgIdx}
                  copiedIdx={copiedIdx}
                  expandedTraceIdx={expandedTraceIdx}
                  liveSteps={liveSteps}
                  isTaskExecuting={isTaskExecuting}
                  agentStatus={agentStatus}
                  onCopyMessage={handleCopyMessage}
                  onPlayTTS={handlePlayTTS}
                  onToggleTraceExpand={(traceIdx) =>
                    setExpandedTraceIdx(expandedTraceIdx === traceIdx ? null : traceIdx)
                  }
                />
              );
            })}

            {/* Live Outgoing User Voice Bubble */}
            <LiveInterimVoiceBubble
              interimTranscript={interimTranscript}
              userProfileAvatar={userProfileAvatar}
            />

            <div className="h-24" />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Floating Text-Input-Bar Popup */}
      <PillTextInputBar
        isOpen={isTextInputPopupOpen}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        interimTranscript={interimTranscript}
        isListening={isListening}
        showAddMenu={showAddMenu}
        setShowAddMenu={setShowAddMenu}
        onToggleMic={handleToggleMic}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        textInputRef={textInputRef}
        plusButtonRef={plusButtonRef}
        addMenuRef={addMenuRef}
      />
    </div>
  );
};
