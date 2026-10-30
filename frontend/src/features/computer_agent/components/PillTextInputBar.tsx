import React from 'react';
import { Plus, ArrowUp, Mic, MicOff } from 'lucide-react';
import { PresetRecipesMenu } from './PresetRecipesMenu';

interface PillTextInputBarProps {
  isOpen: boolean;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  interimTranscript: string;
  isListening: boolean;
  showAddMenu: boolean;
  setShowAddMenu: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleMic: () => void;
  onSend: (goal?: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  textInputRef: React.RefObject<HTMLInputElement | null>;
  plusButtonRef: React.RefObject<HTMLButtonElement | null>;
  addMenuRef: React.RefObject<HTMLDivElement | null>;
}

export const PillTextInputBar: React.FC<PillTextInputBarProps> = ({
  isOpen,
  inputMessage,
  setInputMessage,
  interimTranscript,
  isListening,
  showAddMenu,
  setShowAddMenu,
  onToggleMic,
  onSend,
  onKeyDown,
  textInputRef,
  plusButtonRef,
  addMenuRef,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none animate-fadeIn">
      <div className="w-[65%] relative space-y-2 pointer-events-auto">
        {/* Plus (+) Menu Popup: Quick Presets */}
        <PresetRecipesMenu
          isOpen={showAddMenu}
          menuRef={addMenuRef}
          onSelectPreset={(goal) => {
            onSend(goal);
            setShowAddMenu(false);
          }}
        />

        {/* Pill Input Bar in Exact Original View */}
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900/95 border border-slate-700/80 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 backdrop-blur-2xl shadow-2xl shadow-black/80 transition-colors">
          {/* Plus Button (+) */}
          <button
            ref={plusButtonRef}
            type="button"
            onClick={() => setShowAddMenu((prev) => !prev)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-all shrink-0 focus:outline-none cursor-pointer"
            title={showAddMenu ? 'Close Presets' : 'Preset Recipes'}
          >
            <Plus
              className={`w-5 h-5 transition-transform duration-200 ${
                showAddMenu ? 'rotate-45 text-cyan-400' : ''
              }`}
            />
          </button>

          {/* Text Input - Completely seamless & borderless (No inner box shape) */}
          <div
            className="flex-1 flex items-center relative min-w-0 bg-transparent"
            style={{ border: 'none', outline: 'none' }}
          >
            <input
              ref={textInputRef}
              data-seyal-input="true"
              type="text"
              value={inputMessage || (interimTranscript ? interimTranscript : '')}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                interimTranscript
                  ? 'Listening to your voice...'
                  : 'Type or speak computer instruction...'
              }
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base px-2 py-1 border-0 border-none outline-none focus:outline-none ring-0 focus:ring-0 shadow-none"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            />
          </div>

          {/* Circular Microphone Button for Push-to-Talk / Listening */}
          <button
            type="button"
            onClick={onToggleMic}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 focus:outline-none cursor-pointer ${
              isListening
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
            }`}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-red-400" />
            ) : (
              <Mic className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* Send Button (↑) for Typed Input */}
          <button
            type="button"
            onClick={() => onSend()}
            disabled={!inputMessage.trim()}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 hover:text-white font-bold flex items-center justify-center transition-all shrink-0 border border-slate-700 focus:outline-none cursor-pointer"
            title="Send Typed Message"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
