import React from 'react';
import { Shield, Mail, Key, CheckCircle2, LogOut } from 'lucide-react';

interface AuthenticationSecurityCardProps {
  email?: string;
  isResettingPassword: boolean;
  authActionMessage: string | null;
  showSignOutConfirm: boolean;
  isSigningOut: boolean;
  onPasswordReset: () => void;
  setShowSignOutConfirm: (val: boolean) => void;
  onSignOut: () => void;
}

export const AuthenticationSecurityCard: React.FC<AuthenticationSecurityCardProps> = ({
  email,
  isResettingPassword,
  authActionMessage,
  showSignOutConfirm,
  isSigningOut,
  onPasswordReset,
  setShowSignOutConfirm,
  onSignOut,
}) => {
  return (
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
            <span className="truncate">{email || 'local-developer@seyal.ai'}</span>
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
            onClick={onPasswordReset}
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
              onClick={onSignOut}
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
  );
};
