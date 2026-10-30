import React from 'react';
import { Monitor, LogOut, Smartphone } from 'lucide-react';

interface ActiveSessionsDeviceCardProps {
  onRevokeAllOther: () => void;
  onDisconnectMobileRelay: () => void;
}

export const ActiveSessionsDeviceCard: React.FC<ActiveSessionsDeviceCardProps> = ({
  onRevokeAllOther,
  onDisconnectMobileRelay,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Active Workstation Sessions & Devices</h3>
            <p className="text-[11px] text-slate-400">Authorized workstation instances and background socket connections</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRevokeAllOther}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Revoke All Other</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {/* Session 1: Current Desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-100 font-semibold flex items-center gap-2">
                <span>Windows 11 Desktop (Primary Electron Workstation)</span>
                <span className="text-[9px] px-2 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CURRENT
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                127.0.0.1:8000 • Autonomous Engine Active • Last ping: Just now
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">Active Now</span>
        </div>

        {/* Session 2: Connected Mobile Relay */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-100 font-semibold flex items-center gap-2">
                <span>Connected Mobile Relay (Seyal Mobile Push Companion)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Encrypted push notification sync • Authenticated via Supabase UID
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onDisconnectMobileRelay}
            className="px-2.5 py-1 text-[11px] rounded bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 transition-all self-start sm:self-auto"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
