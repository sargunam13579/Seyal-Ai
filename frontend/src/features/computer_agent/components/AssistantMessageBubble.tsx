import React from 'react';
import { Volume2, Copy, Check } from 'lucide-react';
import type { MessageItem } from '../../../types';
import appLogo from '../../../assets/app-logo.png';
import { VisionTraceViewer } from './VisionTraceViewer';
import { formatMessageTime, type StepItem } from '../types';

interface AssistantMessageBubbleProps {
  message: MessageItem;
  index: number;
  totalMessages: number;
  isWaiting: boolean;
  isAgentGenerating: boolean;
  isSpeaking: boolean;
  speakingMsgIdx: number | null;
  copiedIdx: number | null;
  expandedTraceIdx: number | null;
  liveSteps: StepItem[];
  isTaskExecuting: boolean;
  agentStatus: string;
  onCopyMessage: (text: string, idx: number) => void;
  onPlayTTS: (text: string, idx: number) => void;
  onToggleTraceExpand: (idx: number) => void;
}

export const AssistantMessageBubble: React.FC<AssistantMessageBubbleProps> = ({
  message,
  index,
  totalMessages,
  isWaiting,
  isAgentGenerating,
  isSpeaking,
  speakingMsgIdx,
  copiedIdx,
  expandedTraceIdx,
  liveSteps,
  isTaskExecuting,
  agentStatus,
  onCopyMessage,
  onPlayTTS,
  onToggleTraceExpand,
}) => {
  const isLastMessage = index === totalMessages - 1;
  const isTraceExpanded = expandedTraceIdx === index;
  const traceSteps =
    message.steps && message.steps.length > 0
      ? (message.steps as StepItem[])
      : isLastMessage
      ? liveSteps
      : [];

  return (
    <div
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}
      className="flex items-start gap-3.5 w-full group justify-start"
    >
      <div className="w-9 h-9 rounded-full overflow-hidden border border-cyan-400/50 bg-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/20">
        <img
          src={appLogo}
          alt="Seyal AI"
          className={`w-full h-full object-cover rounded-full ${
            isLastMessage && (isWaiting || isAgentGenerating) ? 'animate-pulse' : ''
          }`}
        />
      </div>

      <div className="relative max-w-[85%] p-5 rounded-2xl text-sm sm:text-base leading-relaxed bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-sm shadow-sm">
        {/* Message Content */}
        <div>
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.content ? (
              <>
                {message.content}
                {isLastMessage && isSpeaking && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 py-1 px-0.5" title="Seyal AI responding...">
                <span
                  className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.7)] animate-typing-dot"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.7)] animate-typing-dot"
                  style={{ animationDelay: '180ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.7)] animate-typing-dot"
                  style={{ animationDelay: '360ms' }}
                />
              </div>
            )}
          </div>

          {/* Vision-Action Step Summary Card */}
          <VisionTraceViewer
            traceSteps={traceSteps}
            isCurrentlyRunning={isLastMessage && isTaskExecuting}
            agentStatus={agentStatus}
            isTraceExpanded={isTraceExpanded}
            onToggleExpand={() => onToggleTraceExpand(index)}
          />
        </div>

        {/* Assistant Message Footer */}
        {message.content && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopyMessage(message.content, index)}
                className="p-1 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-all text-slate-400 cursor-pointer"
                title={copiedIdx === index ? 'Copied!' : 'Copy message'}
              >
                {copiedIdx === index ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => onPlayTTS(message.content, index)}
                className={`p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer ${
                  isSpeaking && speakingMsgIdx === index
                    ? 'text-cyan-400 bg-slate-800'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
                title={isSpeaking && speakingMsgIdx === index ? 'Stop voice' : 'Listen voice'}
              >
                <Volume2
                  className={`w-3.5 h-3.5 ${
                    isSpeaking && speakingMsgIdx === index ? 'animate-pulse' : ''
                  }`}
                />
              </button>
            </div>

            <span className="text-[10px] font-mono text-slate-500">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
