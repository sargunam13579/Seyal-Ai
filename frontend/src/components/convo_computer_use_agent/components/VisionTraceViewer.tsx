import React from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import type { StepItem } from '../types';

interface VisionTraceViewerProps {
  traceSteps: StepItem[];
  isCurrentlyRunning: boolean;
  agentStatus: string;
  isTraceExpanded: boolean;
  onToggleExpand: () => void;
}

export const VisionTraceViewer: React.FC<VisionTraceViewerProps> = ({
  traceSteps,
  isCurrentlyRunning,
  agentStatus,
  isTraceExpanded,
  onToggleExpand,
}) => {
  const hasTrace = traceSteps && traceSteps.length > 0;
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
            onClick={onToggleExpand}
            className="flex items-center justify-between w-full text-xs font-mono text-cyan-400 hover:text-cyan-300 py-1 cursor-pointer"
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
};
