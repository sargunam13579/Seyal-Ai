import React from 'react';
import { computerUsePresets } from '../types';

interface PresetRecipesMenuProps {
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onSelectPreset: (goal: string) => void;
}

export const PresetRecipesMenu: React.FC<PresetRecipesMenuProps> = ({
  isOpen,
  menuRef,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-16 left-0 p-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl shadow-black flex flex-col gap-1 w-64 animate-fadeIn backdrop-blur-xl z-50"
    >
      <span className="text-[10px] font-mono text-slate-400 uppercase px-2.5 py-1">
        Preset Recipes
      </span>
      {computerUsePresets.map((preset, i) => (
        <button
          key={i}
          onClick={() => onSelectPreset(preset.goal)}
          className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs truncate transition-all text-left cursor-pointer"
          title={preset.goal}
        >
          • {preset.title}
        </button>
      ))}
    </div>
  );
};
