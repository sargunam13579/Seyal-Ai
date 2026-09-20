import React, { useState } from 'react';
import {
  ChevronRight,
  User,
  Check,
  Plus,
  Sparkles,
  Sliders,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';

export interface UserAccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  avatarImage: string | null;
  getInitials: (name: string) => string;
  onOpenUpgradePlan: () => void;
  onOpenPersonalization: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onAddAccount: () => void;
  onSignOut: () => void;
  className?: string;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  avatarImage,
  getInitials,
  onOpenUpgradePlan,
  onOpenPersonalization,
  onOpenProfile,
  onOpenSettings,
  onOpenHelp,
  onAddAccount,
  onSignOut,
  className = '',
}) => {
  const [isAccountsPopupOpen, setIsAccountsPopupOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`absolute w-[240px] bg-[#141619] border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-[100] animate-fade-in backdrop-blur-2xl text-slate-200 select-none ${className}`}
    >
      {/* Top User Profile Header Row (Click to toggle Accounts Flyout) */}
      <div className="relative">
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsAccountsPopupOpen(!isAccountsPopupOpen);
          }}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-cyan-600/30 text-cyan-300 border border-cyan-400/40 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-sm">
            {avatarImage ? (
              <img
                src={avatarImage}
                alt="Avatar"
                className="w-full h-full object-cover"
                style={{ imageRendering: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
              />
            ) : (
              getInitials(userName)
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
              {userName}
            </span>
            <span className="text-[10px] text-slate-500 truncate">{userEmail}</span>
            <span className="text-[10px] font-semibold text-cyan-400 mt-0.5">Free</span>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-all shrink-0 ${
              isAccountsPopupOpen ? 'text-cyan-400 translate-x-0.5' : 'group-hover:translate-x-0.5'
            }`}
          />
        </div>

        {/* Sub-popup (Accounts Flyout - matches 1st image) */}
        {isAccountsPopupOpen && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-full top-0 ml-2.5 w-[265px] bg-[#1c1e22] border border-slate-700/90 rounded-2xl p-3 shadow-2xl z-[120] animate-fade-in backdrop-blur-2xl text-slate-100"
          >
            {/* Top Row: User Icon & Email */}
            <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-slate-300">
              <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center shrink-0 text-slate-400">
                <User className="w-3 h-3" />
              </div>
              <span className="truncate font-sans text-[12px] text-slate-300 font-normal">
                {userEmail}
              </span>
            </div>

            {/* Active Account Row: Avatar [SK], Name, Checkmark ✓ */}
            <div className="flex items-center justify-between px-1.5 py-2 mt-1 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 transition-colors cursor-pointer group/acct">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-full bg-[#3d4752] text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm overflow-hidden">
                  {avatarImage ? (
                    <img src={avatarImage} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(userName)
                  )}
                </div>
                <span className="text-xs font-medium text-slate-200 truncate group-hover/acct:text-white">
                  {userName}
                </span>
              </div>
              <Check className="w-4 h-4 text-white shrink-0 ml-1.5" />
            </div>

            {/* Divider line */}
            <div className="border-t border-slate-800/90 my-2" />

            {/* + Add account button */}
            <button
              type="button"
              onClick={() => {
                setIsAccountsPopupOpen(false);
                onClose();
                onAddAccount();
              }}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all text-left cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-[12px]">Add account</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Actions */}
      <div className="space-y-1 py-1">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenUpgradePlan();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-300 hover:text-purple-300 hover:bg-purple-950/30 rounded-lg transition-all text-left cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Upgrade plan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenPersonalization();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-300 hover:text-indigo-300 hover:bg-indigo-950/30 rounded-lg transition-all text-left cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Personalization</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenProfile();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/30 rounded-lg transition-all text-left cursor-pointer"
        >
          <User className="w-4 h-4 text-cyan-400" />
          <span>Profile</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 rounded-lg transition-all text-left cursor-pointer font-medium"
        >
          <Settings className="w-4 h-4 text-cyan-400" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenHelp();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/30 rounded-lg transition-all text-left cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Help</span>
        </button>
      </div>

      {/* Logout button */}
      <div className="border-t border-slate-800/80 pt-1.5 mt-0.5">
        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-all text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};
