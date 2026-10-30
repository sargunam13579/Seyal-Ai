import React from 'react';
import { Globe, Clock, Check } from 'lucide-react';
import type { GeneralSettings } from './types';

interface LanguageRegionalCardProps {
  settings: GeneralSettings;
  updateSetting: <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => void;
}

export const LanguageRegionalCard: React.FC<LanguageRegionalCardProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Language & Regional Preferences</h3>
            <p className="text-[11px] text-slate-400">
              Set UI display language and regional formatting
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Language Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Primary Assistant Language
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'en', label: 'English', sub: 'Default Global' },
              { id: 'tanglish', label: 'Tanglish', sub: 'Tamil + English' },
              { id: 'ta', label: 'தமிழ்', sub: 'Pure Tamil' },
              { id: 'hi', label: 'हिंदी', sub: 'Hindi' },
            ].map((langOpt) => {
              const isSelected = settings.language === langOpt.id;
              return (
                <button
                  key={langOpt.id}
                  type="button"
                  onClick={() => updateSetting('language', langOpt.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                      {langOpt.label}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">{langOpt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Format */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Time Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '12h', label: '12-Hour Clock', example: '2:30 PM' },
              { id: '24h', label: '24-Hour Clock', example: '14:30' },
            ].map((tf) => {
              const isSelected = settings.timeFormat === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => updateSetting('timeFormat', tf.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                      {tf.label}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">{tf.example}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
