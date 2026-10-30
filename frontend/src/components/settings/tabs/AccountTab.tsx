import React, { useState, useEffect } from 'react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import {
  AVATAR_PRESETS,
  AccountHeaderHUD,
  OperatorBadgeAvatarCard,
  OperatorMultilingualCard,
  AuthenticationSecurityCard,
  SubscriptionDataExportCard,
} from './account';

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
      <AccountHeaderHUD />

      <div className="p-8 sm:p-10 space-y-7 w-full max-w-5xl">
        {/* 1. OPERATOR BADGE & AVATAR CARD */}
        <OperatorBadgeAvatarCard
          userNameInput={userNameInput}
          identityName={identity?.user_name}
          email={user?.email}
          uid={user?.id || (identity as any)?.user_id || 'usr_primary_local'}
          copiedUid={copiedUid}
          selectedAvatarId={selectedAvatarId}
          currentPreset={currentPreset}
          userInitial={userInitial}
          onCopyUid={handleCopyUid}
          onSelectAvatar={handleSelectAvatar}
        />

        {/* 2. OPERATOR DETAILS & MULTILINGUAL AI DEMOGRAPHICS */}
        <OperatorMultilingualCard
          userNameInput={userNameInput}
          setUserNameInput={setUserNameInput}
          userAgeInput={userAgeInput}
          setUserAgeInput={setUserAgeInput}
          userGenderInput={userGenderInput}
          setUserGenderInput={setUserGenderInput}
          motherTongueInput={motherTongueInput}
          setMotherTongueInput={setMotherTongueInput}
          knownLanguagesInput={knownLanguagesInput}
          onToggleKnownLanguage={handleToggleKnownLanguage}
          profileMessage={profileMessage}
          savingProfile={savingProfile}
          fetchingProfile={fetchingProfile}
          onSaveProfile={handleUpdateUserProfile}
        />

        {/* 3. CLOUD AUTH & SESSION SECURITY */}
        <AuthenticationSecurityCard
          email={user?.email}
          isResettingPassword={isResettingPassword}
          authActionMessage={authActionMessage}
          showSignOutConfirm={showSignOutConfirm}
          isSigningOut={isSigningOut}
          onPasswordReset={handlePasswordReset}
          setShowSignOutConfirm={setShowSignOutConfirm}
          onSignOut={handleSignOut}
        />

        {/* 4. SUBSCRIPTION TIER & 5. DATA OWNERSHIP */}
        <SubscriptionDataExportCard
          onOpenUpgradePlan={() => (openSettingsTab ? openSettingsTab('upgrade_plan') : null)}
          onExportProfile={handleExportProfile}
        />
      </div>
    </div>
  );
};
