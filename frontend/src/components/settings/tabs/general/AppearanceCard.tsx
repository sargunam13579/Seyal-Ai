import React from 'react';
import { Palette, Check, Sliders } from 'lucide-react';
import type { GeneralSettings } from './types';

interface AppearanceCardProps {
  settings: GeneralSettings;
  updateSetting: <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => void;
}

export const AppearanceCard: React.FC<AppearanceCardProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Appearance & Theme</h3>
            <p className="text-[11px] text-slate-400">
              Interface aesthetic, color palettes, and display density
            </p>
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">
          Desktop Theme Preset
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'cyber-dark', label: 'Cyber Dark', desc: 'Signature Cyan Neon Dark Mode' },
            { id: 'oled-black', label: 'OLED Midnight', desc: 'True pitch-black high contrast' },
            { id: 'deep-slate', label: 'Deep Slate', desc: 'Modern matte workspace finish' },
          ].map((themeOpt) => {
            const isSelected = settings.theme === themeOpt.id;
            return (
              <button
                key={themeOpt.id}
                type="button"
                onClick={() => updateSetting('theme', themeOpt.id as any)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {themeOpt.label}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{themeOpt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">
          Accent Color Tone
        </label>
        <div className="flex flex-wrap gap-2.5">
          {[
            { id: 'cyan', label: 'Neon Cyan', color: 'bg-cyan-400' },
            { id: 'emerald', label: 'Emerald Glow', color: 'bg-emerald-400' },
            { id: 'violet', label: 'Cosmic Violet', color: 'bg-violet-400' },
            { id: 'amber', label: 'Solar Amber', color: 'bg-amber-400' },
          ].map((accent) => {
            const isSelected = settings.accentColor === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => updateSetting('accentColor', accent.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/60 text-slate-100 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${accent.color} shadow-sm`} />
                <span>{accent.label}</span>
                {isSelected && <Check className="w-3 h-3 text-cyan-400 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* UI Density */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          Interface Layout Density
        </label>
        <div className="grid grid-cols-3 gap-2.5 max-w-md">
          {[
            { id: 'compact', label: 'Compact', desc: 'Tight spacing for power users' },
            { id: 'standard', label: 'Standard', desc: 'Balanced default layout' },
            { id: 'spacious', label: 'Spacious', desc: 'Relaxed touch-friendly paddings' },
          ].map((density) => {
            const isSelected = settings.uiDensity === density.id;
            return (
              <button
                key={density.id}
                type="button"
                onClick={() => updateSetting('uiDensity', density.id as any)}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-xs">{density.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
