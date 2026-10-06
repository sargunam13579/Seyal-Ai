import React, { useState, useEffect } from 'react';
import { User, Save, Shield } from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';

export const AccountTab: React.FC = () => {
  const { identity, refreshState, addActivity } = useSeyalAi();

  // User profile details state
  const [userNameInput, setUserNameInput] = useState(identity?.user_name || '');
  const [userAgeInput, setUserAgeInput] = useState('');
  const [userGenderInput, setUserGenderInput] = useState('male');
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setFetchingProfile(true);
      try {
        const res = await api.getProfile();
        if (!res.setup_required && res.profile) {
          setUserNameInput(res.profile.name || '');
          setUserAgeInput(res.profile.age?.toString() || '');
          setUserGenderInput(res.profile.gender || 'male');
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
      });
      setProfileMessage({ text: 'Operator profile saved successfully.', isError: false });
      addActivity({
        type: 'identity',
        title: 'Operator Profile Updated',
        detail: `Operator: ${userNameInput.trim()} (${parsedAge}, ${userGenderInput})`,
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2.5">
            <User className="w-5 h-5 text-cyan-400" />
            <span>Account & Operator Profile</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage primary operator identity, session credentials, and local system preferences.
          </p>
        </div>
      </div>

      <div className="p-8 sm:p-10 space-y-6 w-full max-w-4xl">
        {/* Operator Card Badge */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-slate-900/90 border border-cyan-500/30 shadow-lg shadow-cyan-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-2xl shadow-md shadow-cyan-500/20 shrink-0">
              {(userNameInput || identity?.user_name || 'O').charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white font-mono">
                  {userNameInput || identity?.user_name || 'Primary Operator'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                  LOCAL OPERATOR
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                UID: {(identity as any)?.user_id || 'usr_primary_local'}
              </p>
              <p className="text-[11px] text-cyan-300/80">
                System Role: Primary Administrator & Autonomous Agent Controller
              </p>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Operator Details</h3>
              <p className="text-[11px] text-slate-400">Personal details used by the AI agent during natural interactions</p>
            </div>
          </div>

          {profileMessage && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                profileMessage.isError
                  ? 'bg-red-950/40 border-red-500/30 text-red-300'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Full Name / Callsign</label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-slate-900 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={userAgeInput}
                  onChange={(e) => setUserAgeInput(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full bg-slate-900 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Gender</label>
                <select
                  value={userGenderInput}
                  onChange={(e) => setUserGenderInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleUpdateUserProfile}
                disabled={savingProfile || fetchingProfile}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingProfile ? 'Saving...' : 'Save Account Details'}
              </button>
            </div>
          </div>
        </div>

        {/* Local Session & Security Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Local System Session</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All user data, personalized memory, and agent preferences are securely retained on this machine.
          </p>
        </div>
      </div>
    </div>
  );
};
