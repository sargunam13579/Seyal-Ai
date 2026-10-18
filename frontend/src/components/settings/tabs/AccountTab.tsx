import React, { useState, useEffect } from 'react';
import {
  User,
  Save,
  Shield,
  Mail,
  Key,
  LogOut,
  Copy,
  Check,
  Globe,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

const AVATAR_PRESETS = [
  { id: 'cyan', label: 'Cyber Operator', bg: 'from-cyan-500 to-blue-600', icon: '⚡' },
  { id: 'violet', label: 'Cosmic Architect', bg: 'from-purple-500 to-indigo-600', icon: '🪐' },
  { id: 'emerald', label: 'Neural Explorer', bg: 'from-emerald-500 to-teal-600', icon: '🌿' },
  { id: 'amber', label: 'Core Sentinel', bg: 'from-amber-500 to-orange-600', icon: '🛡️' },
  { id: 'rose', label: 'Digital Visionary', bg: 'from-rose-500 to-pink-600', icon: '🌸' },
  { id: 'slate', label: 'Stealth Admin', bg: 'from-slate-700 to-slate-900', icon: '💻' },
];

const AVAILABLE_LANGUAGES = [
  { id: 'Tamil', label: 'Tamil (தமிழ்)' },
  { id: 'English', label: 'English' },
  { id: 'Tanglish', label: 'Tanglish' },
  { id: 'Hindi', label: 'Hindi (हिन्दी)' },
  { id: 'Telugu', label: 'Telugu (తెలుగు)' },
  { id: 'Malayalam', label: 'Malayalam (മലയാളം)' },
];

export const AccountTab: React.FC = () => {
  const { identity, refreshState, addActivity, userProfileAvatar, setUserProfileAvatar, openSettingsTab } = useSeyalAi();
  const { user, signOut, resetPassword } = useAuth();

  // User profile details state
  const [userNameInput, setUserNameInput] = useState(identity?.user_name || '');
  const [userAgeInput, setUserAgeInput] = useState('25');
  const [userGenderInput, setUserGenderInput] = useState('male');
  const [motherTongueInput, setMotherTongueInput] = useState('Tamil');
  const [knownLanguagesInput, setKnownLanguagesInput] = useState<string[]>(['Tamil', 'English', 'Tanglish']);

  // Selected avatar preset
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(() => {
    return userProfileAvatar || localStorage.getItem('seyal_user_avatar_preset') || 'cyan';
  });

  // UI state
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // Auth actions state
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [authActionMessage, setAuthActionMessage] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setFetchingProfile(true);
      try {
        const res = await api.getProfile();
        if (!res.setup_required && res.profile) {
          setUserNameInput(res.profile.name || identity?.user_name || '');
          setUserAgeInput(res.profile.age?.toString() || '25');
          setUserGenderInput(res.profile.gender || 'male');
          if (res.profile.mother_tongue) {
            setMotherTongueInput(res.profile.mother_tongue);
          }
          if (res.profile.known_languages && res.profile.known_languages.length > 0) {
            setKnownLanguagesInput(res.profile.known_languages);
          }
        } else {
          setUserNameInput(identity?.user_name || '');
        }
      } catch (err) {
        console.warn('Failed to load profile details in settings:', err);
        setUserNameInput(identity?.user_name || '');
      } finally {
        setFetchingProfile(false);
      }
    };
    fetchProfile();
  }, [identity]);

  const handleSelectAvatar = (presetId: string) => {
    setSelectedAvatarId(presetId);
    localStorage.setItem('seyal_user_avatar_preset', presetId);
    if (setUserProfileAvatar) {
      setUserProfileAvatar(presetId);
    }
  };

  const handleToggleKnownLanguage = (lang: string) => {
    setKnownLanguagesInput((prev) => {
      if (prev.includes(lang)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((l) => l !== lang);
      }
      return [...prev, lang];
    });
  };

  const handleCopyUid = () => {
    const uid = user?.id || (identity as any)?.user_id || 'usr_primary_local';
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleUpdateUserProfile = async () => {
    setProfileMessage(null);
    const parsedAge = parseInt(userAgeInput, 10);
    if (!userNameInput.trim()) {
      setProfileMessage({ text: 'Please enter a valid operator name / callsign.', isError: true });
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setProfileMessage({ text: 'Please enter a valid age between 1 and 120.', isError: true });
      return;
    }

    setSavingProfile(true);
    try {
      await api.setupProfile({
        name: userNameInput.trim(),
        age: parsedAge,
        gender: userGenderInput as 'male' | 'female' | 'other',
        mother_tongue: motherTongueInput,
        known_languages: knownLanguagesInput,
      });
      setProfileMessage({ text: 'Operator profile & language preferences saved successfully.', isError: false });
      addActivity({
        type: 'identity',
        title: 'Operator Profile Updated',
        detail: `Operator: ${userNameInput.trim()} (${motherTongueInput}, ${knownLanguagesInput.join(', ')})`,
        status: 'success',
      });
      await refreshState();
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err: any) {
      setProfileMessage({
        text: `Failed to save profile: ${err?.response?.data?.detail || err.message}`,
        isError: true,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    const targetEmail = user?.email;
    if (!targetEmail) {
      setAuthActionMessage('No cloud account email associated with local session.');
      setTimeout(() => setAuthActionMessage(null), 4000);
      return;
    }

    setIsResettingPassword(true);
    setAuthActionMessage(null);
    try {
      const res = await resetPassword(targetEmail);
      if (res?.error) {
        setAuthActionMessage(`Password reset request error: ${res.error.message}`);
      } else {
        setAuthActionMessage(`Password reset link sent to ${targetEmail}. Please check your inbox.`);
      }
    } catch (err: any) {
      setAuthActionMessage(`Failed to request password reset: ${err?.message || err}`);
    } finally {
      setIsResettingPassword(false);
      setTimeout(() => setAuthActionMessage(null), 6000);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  const handleExportProfile = () => {
    const exportData = {
      app: 'Seyal AI',
      export_date: new Date().toISOString(),
      operator: {
        name: userNameInput || identity?.user_name || 'Primary Operator',
        uid: user?.id || (identity as any)?.user_id || 'usr_primary_local',
        email: user?.email || 'local-session@seyal.ai',
        age: parseInt(userAgeInput, 10) || 25,
        gender: userGenderInput,
        mother_tongue: motherTongueInput,
        known_languages: knownLanguagesInput,
        avatar_preset: selectedAvatarId,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seyal_ai_operator_profile_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentPreset = AVATAR_PRESETS.find((p) => p.id === selectedAvatarId) || AVATAR_PRESETS[0];
  const userInitial = (userNameInput || identity?.user_name || 'O').charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Account & Operator Profile</span>
            </h2>
            <p className="text-xs text-slate-400">
              Operator identity, authentication session, and multilingual AI personalization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            OPERATOR SECURED
          </span>
        </div>
      </div>

      <div className="p-8 sm:p-10 space-y-7 w-full max-w-5xl">
        {/* 1. OPERATOR BADGE & AVATAR CARD */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-slate-900 border border-cyan-500/30 shadow-lg shadow-cyan-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Circle */}
            <div className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${currentPreset.bg} flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-500/20 shrink-0 relative group`}>
              <span>{currentPreset.icon}</span>
              <span className="absolute -bottom-1 -right-1 text-xs bg-slate-900/90 border border-cyan-500/40 px-1.5 py-0.5 rounded-md font-mono text-cyan-300 font-bold">
                {userInitial}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-white font-mono">
                  {userNameInput || identity?.user_name || 'Primary Operator'}
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                  LOCAL OPERATOR
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>

              {/* Email / UID */}
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
                <span className="flex items-center gap-1 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  {user?.email || 'local-operator@seyal.ai'}
                </span>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer group"
                  title="Click to copy UID"
                >
                  <span>UID: {(user?.id || (identity as any)?.user_id || 'usr_primary_local').slice(0, 14)}...</span>
                  {copiedUid ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-cyan-300/80 font-medium">
                System Role: Primary Administrator & Autonomous Agent Controller
              </p>
            </div>
          </div>

          {/* Quick Avatar Preset Selector */}
          <div className="space-y-1.5 w-full md:w-auto">
            <span className="text-[11px] text-slate-400 font-medium block">Persona Avatar</span>
            <div className="flex items-center gap-2 flex-wrap">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectAvatar(preset.id)}
                  title={preset.label}
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${preset.bg} flex items-center justify-center text-sm transition-all cursor-pointer ${
                    selectedAvatarId === preset.id
                      ? 'ring-2 ring-cyan-400 scale-105 shadow-md shadow-cyan-500/40'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <span>{preset.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. OPERATOR DETAILS & MULTILINGUAL AI DEMOGRAPHICS */}
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
                      onClick={() => handleToggleKnownLanguage(lang.id)}
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
                onClick={handleUpdateUserProfile}
                disabled={savingProfile || fetchingProfile}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/35 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving Preferences...' : 'Save Account & Language Details'}
              </button>
            </div>
          </div>
        </div>

        {/* 3. CLOUD AUTH & SESSION SECURITY */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Cloud Authentication & Session Security</h3>
                <p className="text-[11px] text-slate-400">
                  Supabase account status, password resets, and session sign out
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              SESSION ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Info Card */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-[11px] text-slate-400 block font-medium">Authenticated Account Email</span>
              <div className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{user?.email || 'local-developer@seyal.ai'}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Connected via local encryption and Supabase Auth.
              </p>
            </div>

            {/* Password Reset Action */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Security Credential</span>
                <div className="text-xs text-slate-300 mt-0.5">Need to update your account password?</div>
              </div>
              <button
                type="button"
                disabled={isResettingPassword}
                onClick={handlePasswordReset}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                {isResettingPassword ? 'Sending Reset Email...' : 'Send Password Reset Email'}
              </button>
            </div>
          </div>

          {authActionMessage && (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{authActionMessage}</span>
            </div>
          )}

          {/* Sign Out Card */}
          <div className="pt-2 flex items-center justify-between p-4 rounded-xl bg-rose-950/20 border border-rose-500/20">
            <div>
              <div className="text-xs font-semibold text-rose-300">Sign Out of Desktop Session</div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Disconnects cloud sync and ends the current operator session on this device.
              </p>
            </div>

            {showSignOutConfirm ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md shadow-rose-600/30"
                >
                  {isSigningOut ? 'Signing out...' : 'Confirm Sign Out'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. SUBSCRIPTION TIER & PLAN */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Seyal AI Desktop — Community & Pro Tier</h3>
            </div>
            <p className="text-xs text-slate-400">
              Unlimited Autonomous Laptop Workflows, Real-time Playwright Browser Control, and Local Vector Store.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openSettingsTab ? openSettingsTab('upgrade_plan') : null}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <span>View Plan Details</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. DATA OWNERSHIP & EXPORT */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Data Ownership & Profile Export</h3>
                <p className="text-[11px] text-slate-400">
                  Your memories and profile data belong to you. Download or inspect anytime.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportProfile}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>Export Profile JSON</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All user data, personalized memory embeddings, and agent tool privileges are securely kept in local encrypted storage (<code className="text-cyan-400 font-mono text-[11px]">~/.seyal_ai/seyal_ai.db</code>).
          </p>
        </div>
      </div>
    </div>
  );
};
