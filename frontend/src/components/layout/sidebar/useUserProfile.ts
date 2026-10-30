



import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import type { IdentityResponse } from '../../../types';
import type { User } from '@supabase/supabase-js';

interface UseUserProfileProps {
  user: User | null;
  identity: IdentityResponse | null;
  setUserProfileAvatar: (avatar: string | null) => void;
}

export const useUserProfile = ({
  user,
  identity,
  setUserProfileAvatar,
}: UseUserProfileProps) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [customDisplayName, setCustomDisplayName] = useState<string>(() => {
    return (
      localStorage.getItem('seyal_user_display_name') ||
      identity?.user_name ||
      (user?.email ? user.email.split('@')[0] : 'User')
    );
  });

  const [customUsername, setCustomUsername] = useState<string>(() => {
    return (
      localStorage.getItem('seyal_user_username') ||
      (user?.email ? user.email.split('@')[0] : 'user')
    );
  });

  const [avatarImage, setAvatarImage] = useState<string | null>(() => {
    return localStorage.getItem('seyal_user_avatar') || null;
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  const getInitials = (nameStr: string): string => {
    if (!nameStr) return 'PG';
    const clean = nameStr.trim();
    const uppers = clean.match(/[A-Z]/g);
    if (uppers && uppers.length >= 2) {
      return uppers.slice(0, 2).join('');
    }
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const handleAvatarUpdate = () => {
      try {
        const stored = localStorage.getItem('seyal_user_avatar') || null;
        setAvatarImage(stored);
      } catch {
        // ignore
      }
    };
    window.addEventListener('seyal_avatar_updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);
    return () => {
      window.removeEventListener('seyal_avatar_updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, []);

  const handleSaveProfile = async (
    trimmedDisplay: string,
    trimmedUser: string,
    newAvatar: string | null
  ) => {
    localStorage.setItem('seyal_user_display_name', trimmedDisplay);
    localStorage.setItem('seyal_user_username', trimmedUser);
    if (newAvatar) {
      localStorage.setItem('seyal_user_avatar', newAvatar);
    } else {
      localStorage.removeItem('seyal_user_avatar');
    }

    setCustomDisplayName(trimmedDisplay);
    setCustomUsername(trimmedUser);
    setAvatarImage(newAvatar);
    setUserProfileAvatar(newAvatar);
    window.dispatchEvent(new Event('seyal_avatar_updated'));

    await api.setupProfile({
      name: trimmedDisplay,
      age: 25,
      gender: 'male',
    }).catch(() => {});
  };

  const userName =
    customDisplayName ||
    identity?.user_name ||
    (user?.email ? user.email.split('@')[0] : 'User');

  const displayUserEmail =
    user?.email || (customUsername ? `${customUsername}@gmail.com` : 'user@example.com');

  return {
    profileMenuOpen,
    setProfileMenuOpen,
    profileMenuRef,
    customDisplayName,
    customUsername,
    avatarImage,
    isEditProfileOpen,
    setIsEditProfileOpen,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isAddAccountModalOpen,
    setIsAddAccountModalOpen,
    userName,
    displayUserEmail,
    getInitials,
    handleSaveProfile,
  };
};
