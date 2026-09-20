import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Mic, Monitor, Eye, ShieldCheck } from 'lucide-react';
import appLogo from '../../assets/app-logo.png';

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-[#14171a] text-slate-100 rounded-3xl p-6 shadow-2xl border border-cyan-500/30 relative max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-cyan-400/50 p-1 flex items-center justify-center shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30 shrink-0">
              <img src={appLogo} alt="Seyal AI" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">Seyal AI (செயல்)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-semibold">
                  v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Conversational Computer-Use Autonomous Agent
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content - Scrollable */}
        <div className="overflow-y-auto custom-scrollbar pr-1 py-4 space-y-4 text-xs text-slate-300">
          {/* Intro paragraph */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-200/90 leading-relaxed">
            <span className="font-semibold text-cyan-300">Seyal AI</span> is an autonomous multimodal desktop agent that bridges natural language voice and chat interaction with real-world computer automation. It executes complex multi-step tasks across your operating system with high precision.
          </div>

          {/* Core Capabilities */}
          <div>
            <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Key Capabilities</span>
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">Bilingual Voice Interaction</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">Converse naturally in English or Tamil. Receive instantaneous spoken responses and context-aware dialogue.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
                  <Monitor className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">Autonomous Computer-Use</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">Directly controls the mouse, keyboard, applications, web browser, and terminal to execute multi-step workflows.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">Live Vision-Action Trace</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">Analyzes on-screen visual context in real time with transparent step-by-step reasoning and verification.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">Safety Guardrails & Control</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">Prompts for user approval before sensitive operations, with an instant Emergency Stop available at any moment.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-1.5 text-[11px]">
            <span className="font-semibold text-cyan-300 block">💡 Quick Tips:</span>
            <p className="text-slate-400">• Click the microphone icon or start speaking naturally to give voice commands.</p>
            <p className="text-slate-400">• Manage wake words, voice personalities, and agent settings in <b>Personalization</b> or <b>Settings</b>.</p>
            <p className="text-slate-400">• Review real-time computer actions anytime in the Vision-Action Trace panel.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-500">Status: Online • Active</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-cyan-950/30"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
