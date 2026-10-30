import React from 'react';
import { Zap, Lightbulb, Languages } from 'lucide-react';

interface BehavioralProactivityCardProps {
  proactiveSuggestions: boolean;
  languageAutoSwitching: boolean;
  onToggleProactive: (val: boolean) => void;
  onToggleLanguageAutoSwitch: (val: boolean) => void;
}

export const BehavioralProactivityCard: React.FC<BehavioralProactivityCardProps> = ({
  proactiveSuggestions,
  languageAutoSwitching,
  onToggleProactive,
  onToggleLanguageAutoSwitch,
}) => {
  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer shrink-0 ${
        checked
          ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50'
          : 'bg-slate-700/80 justify-start hover:bg-slate-600'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Proactivity & Language Adaptation</h3>
            <p className="text-[11px] text-slate-400">Autonomous suggestions and dynamic language mirroring</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Proactive Suggestions */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Proactive Follow-Up Suggestions
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              After finishing a task, suggest logical next steps, shortcuts, or related system automations.
            </p>
          </div>
          {renderToggle(proactiveSuggestions, onToggleProactive)}
        </div>

        {/* Dynamic Language Auto-Switching */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              Dynamic Language Mirroring (Tamil / English)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automatically match your spoken language and dialect (English, Tamil, Tanglish) without requiring manual language switching.
            </p>
          </div>
          {renderToggle(languageAutoSwitching, onToggleLanguageAutoSwitch)}
        </div>
      </div>
    </div>
  );
};
