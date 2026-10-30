import React from 'react';
import { Globe, AlertTriangle, CheckCircle2, Check, Save } from 'lucide-react';
import { AVAILABLE_LANGUAGES } from './types';

interface OperatorMultilingualCardProps {
  userNameInput: string;
  setUserNameInput: (val: string) => void;
  userAgeInput: string;
  setUserAgeInput: (val: string) => void;
  userGenderInput: string;
  setUserGenderInput: (val: string) => void;
  motherTongueInput: string;
  setMotherTongueInput: (val: string) => void;
  knownLanguagesInput: string[];
  onToggleKnownLanguage: (lang: string) => void;
  profileMessage: { text: string; isError: boolean } | null;
  savingProfile: boolean;
  fetchingProfile: boolean;
  onSaveProfile: () => void;
}

export const OperatorMultilingualCard: React.FC<OperatorMultilingualCardProps> = ({
  userNameInput,
  setUserNameInput,
  userAgeInput,
  setUserAgeInput,
  userGenderInput,
  setUserGenderInput,
  motherTongueInput,
  setMotherTongueInput,
  knownLanguagesInput,
  onToggleKnownLanguage,
  profileMessage,
  savingProfile,
  fetchingProfile,
  onSaveProfile,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Personal & Multilingual Preferences</h3>
            <p className="text-[11px] text-slate-400">
              Used by Seyal AI to naturally adapt Tamil, English, and multilingual conversational replies
            </p>
          </div>
        </div>
      </div>

      {profileMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 animate-fadeIn ${
            profileMessage.isError
              ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {profileMessage.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{profileMessage.text}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1.5">
            Full Name / Operator Callsign
          </label>
          <input
            type="text"
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            placeholder="Enter your name (e.g. Sargunam)"
            className="w-full bg-slate-950/70 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>

        {/* Age & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Age
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={userAgeInput}
              onChange={(e) => setUserAgeInput(e.target.value)}
              placeholder="e.g. 25"
              className="w-full bg-slate-950/70 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Gender Persona
            </label>
            <select
              value={userGenderInput}
              onChange={(e) => setUserGenderInput(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Mother Tongue & Primary Dialect */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
            <span>Mother Tongue (தாய்மொழி)</span>
            <span className="text-[10px] text-cyan-400 font-mono font-normal">Primary Accent & Phonation</span>
          </label>
          <select
            value={motherTongueInput}
            onChange={(e) => setMotherTongueInput(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="Tamil">Tamil (தமிழ்)</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi (हिन्दी)</option>
            <option value="Telugu">Telugu (తెలుగు)</option>
            <option value="Malayalam">Malayalam (മലയാളം)</option>
            <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
            <option value="Bengali">Bengali (বাংলা)</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Known Languages Multitag Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span>Known Languages for Natural Instructions</span>
            <span className="text-[10px] text-slate-400 font-normal">Select all languages you speak</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = knownLanguagesInput.includes(lang.id);
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => onToggleKnownLanguage(lang.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : null}
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={onSaveProfile}
            disabled={savingProfile || fetchingProfile}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/35 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingProfile ? 'Saving Preferences...' : 'Save Account & Language Details'}
          </button>
        </div>
      </div>
    </div>
  );
};
