import React, { useState } from 'react';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import {
  User,
  Calendar,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
  Check,
  Plus,
  Rocket,
  ChevronDown,
} from 'lucide-react';
import appLogo from '../../assets/app-logo.png';
import {
  POPULAR_MOTHER_TONGUES,
  KNOWN_LANGUAGE_SUGGESTIONS,
} from '../../config/languages';

export interface OnboardingWizardProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'languages' | 'birthday';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');

  // Form State - No pre-selected default language
  const [name, setName] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [knownLanguages, setKnownLanguages] = useState<string[]>([]);
  const [dob, setDob] = useState('');
  const [customLanguageInput, setCustomLanguageInput] = useState('');
  const [showAddCustomLang, setShowAddCustomLang] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute age from Date of Birth
  const computeAge = (dobString: string): number | null => {
    if (!dobString) return null;
    try {
      const birthDate = new Date(dobString);
      if (isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  };

  const calculatedAge = computeAge(dob);

  const toggleKnownLanguage = (langId: string) => {
    setKnownLanguages((prev) => {
      if (prev.includes(langId)) {
        return prev.filter((l) => l !== langId);
      }
      return [...prev, langId];
    });
  };

  const handleAddCustomLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customLanguageInput.trim();
    if (!clean) return;
    if (!knownLanguages.some((l) => l.toLowerCase() === clean.toLowerCase())) {
      setKnownLanguages((prev) => [...prev, clean]);
    }
    setCustomLanguageInput('');
    setShowAddCustomLang(false);
  };

  // Step Validation & Navigation
  const handleNextFromWelcome = () => {
    if (!name.trim()) {
      setError('Please enter your name to continue.');
      return;
    }
    setError(null);
    setCurrentStep('languages');
  };

  const handleNextFromLanguages = () => {
    if (!motherTongue) {
      setError('Please select your mother tongue.');
      return;
    }
    if (knownLanguages.length === 0) {
      setError('Please select at least one language you know.');
      return;
    }
    setError(null);
    setCurrentStep('birthday');
  };

  const handleFinalSubmit = async () => {
    if (!dob) {
      setError('Please select your date of birth.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const profilePayload = {
        name: name.trim(),
        dob: dob || undefined,
        age: calculatedAge || 25,
        gender: 'other',
        mother_tongue: motherTongue,
        known_languages: knownLanguages,
      };

      // 1. Permanently store in Supabase Cloud user metadata (persists across app reinstalls & uninstalls)
      await supabase.auth.updateUser({
        data: profilePayload,
      }).catch((sbErr) => console.warn('Supabase metadata update notice:', sbErr));

      // 2. Save into local backend database
      await api.setupProfile(profilePayload);

      onComplete();
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepsList: Step[] = ['welcome', 'languages', 'birthday'];
  const stepIndex = stepsList.indexOf(currentStep);

  return (
    <div className="min-h-screen w-screen bg-[#060911] bg-radial-at-t from-cyan-950/20 via-[#060911] to-[#04060b] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative z-10 flex flex-col transition-all duration-300">
        
        {/* Step Progress Tracker */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Step {stepIndex + 1} of {stepsList.length}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {currentStep === 'welcome' && 'Personal Profile'}
              {currentStep === 'languages' && 'Voice & Language'}
              {currentStep === 'birthday' && 'Age & Context'}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
            {stepsList.map((s, idx) => (
              <div
                key={s}
                className={`h-full flex-1 rounded-full transition-all duration-500 ${
                  idx <= stepIndex
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 1: WELCOME & NAME */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'welcome' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-3">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(0,240,255,0.5)] bg-slate-950 p-1 transition-transform hover:scale-105 duration-300">
                  <img src={appLogo} alt="Seyal AI" className="w-full h-full object-cover rounded-full" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Welcome to Seyal AI
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Your personal conversational computer agent. Let's get to know you!
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                What should Seyal AI call you?
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextFromWelcome()}
                  placeholder="Enter your name..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                />
              </div>
              {name.trim() && (
                <p className="text-[11px] text-cyan-300 flex items-center gap-1 mt-1 animate-fadeIn">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Nice to meet you, <strong className="text-white">{name.trim()}</strong>!
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextFromWelcome}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 2: LANGUAGES & MOTHER TONGUE */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'languages' && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <span>Languages & Voice</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Seyal AI will strictly communicate in your chosen languages.
              </p>
            </div>

            {/* Mother Tongue Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Mother Tongue
              </label>
              <div className="relative">
                <select
                  value={motherTongue}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setMotherTongue(chosen);
                    if (chosen && !knownLanguages.includes(chosen)) {
                      setKnownLanguages((prev) => [...prev, chosen]);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700/90 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 rounded-xl px-4 py-3 text-xs font-medium text-slate-100 outline-none appearance-none cursor-pointer transition-all"
                >
                  <option value="" disabled className="text-slate-500">
                    -- Select your mother tongue --
                  </option>
                  {POPULAR_MOTHER_TONGUES.map((mt) => (
                    <option key={mt.id} value={mt.id} className="bg-slate-900 text-white py-1">
                      {mt.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Languages You Know - Modern Checkbox Card Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Languages You Know
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomLang(!showAddCustomLang)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Other</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                {KNOWN_LANGUAGE_SUGGESTIONS.map((lang) => {
                  const isSelected = knownLanguages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleKnownLanguage(lang.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{lang.name}</div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-cyan-400 border-cyan-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Language Input */}
              {showAddCustomLang && (
                <form onSubmit={handleAddCustomLanguage} className="flex gap-2 pt-1 animate-fadeIn">
                  <input
                    type="text"
                    value={customLanguageInput}
                    onChange={(e) => setCustomLanguageInput(e.target.value)}
                    placeholder="Enter other language..."
                    className="flex-1 bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>

            {/* Back / Next Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('welcome')}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromLanguages}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 3: BIRTHDAY & AGE -> COMPLETES & ENTERS APP */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'birthday' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <span>Birthday & Age Context</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Helps Seyal AI tailor its conversational tone and age-appropriate assistance.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-center space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                When is your Birthday?
              </label>

              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full max-w-xs mx-auto block bg-slate-900 border border-cyan-500/50 focus:border-cyan-400 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white outline-none cursor-pointer"
              />

              {calculatedAge !== null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold animate-fadeIn">
                  <span>🎂 Age: {calculatedAge} years old</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('languages')}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={loading || !dob}
                onClick={handleFinalSubmit}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Complete & Enter Seyal AI</span>
                    <Rocket className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
