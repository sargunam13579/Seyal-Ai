import React from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Monitor,
  EyeOff,
} from 'lucide-react';
import { BLACKLIST_PRESETS, BLOCKED_APP_PRESETS } from './types';
import type { SafetySettings } from './types';

interface RestrictedZonesCardProps {
  safetySettings: SafetySettings;
  updateSafetySetting: <K extends keyof SafetySettings>(key: K, val: SafetySettings[K]) => void;
  newBlacklistPath: string;
  setNewBlacklistPath: (val: string) => void;
  newSafeWorkspace: string;
  setNewSafeWorkspace: (val: string) => void;
  newBlockedApp: string;
  setNewBlockedApp: (val: string) => void;
}

export const RestrictedZonesCard: React.FC<RestrictedZonesCardProps> = ({
  safetySettings,
  updateSafetySetting,
  newBlacklistPath,
  setNewBlacklistPath,
  newSafeWorkspace,
  setNewSafeWorkspace,
  newBlockedApp,
  setNewBlockedApp,
}) => {
  return (
    <>
      {/* 5. Dual-Zone Filesystem Sandboxing (Blacklist vs Whitelist) */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Filesystem Zone Protection (Path Blacklist & Whitelist)</h3>
              <p className="text-[11px] text-slate-400">Define prohibited operating paths and allowed development sandboxes</p>
            </div>
          </div>
        </div>

        {/* Blacklisted Paths */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
            🚫 Prohibited Blacklist Directories (Agent strictly blocked from reading/modifying)
          </span>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-500 self-center">Quick add:</span>
            {BLACKLIST_PRESETS.map((bp) => (
              <button
                key={bp}
                type="button"
                onClick={() => {
                  if (!safetySettings.blacklistPaths.includes(bp)) {
                    updateSafetySetting('blacklistPaths', [...safetySettings.blacklistPaths, bp]);
                  }
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              >
                + {bp}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newBlacklistPath}
              onChange={(e) => setNewBlacklistPath(e.target.value)}
              placeholder="e.g. C:\Windows\System32"
              className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!newBlacklistPath.trim()) return;
                if (!safetySettings.blacklistPaths.includes(newBlacklistPath.trim())) {
                  updateSafetySetting('blacklistPaths', [...safetySettings.blacklistPaths, newBlacklistPath.trim()]);
                }
                setNewBlacklistPath('');
              }}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Prohibited Path</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {safetySettings.blacklistPaths.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs text-slate-300"
              >
                <span className="truncate">{path}</span>
                <button
                  type="button"
                  onClick={() => {
                    updateSafetySetting(
                      'blacklistPaths',
                      safetySettings.blacklistPaths.filter((p) => p !== path)
                    );
                  }}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors ml-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Whitelisted Safe Workspaces */}
        <div className="space-y-3 pt-3 border-t border-slate-800/60">
          <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            📁 Safe Workspaces Whitelist (Trusted developer zones with relaxed permissions)
          </span>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSafeWorkspace}
              onChange={(e) => setNewSafeWorkspace(e.target.value)}
              placeholder="e.g. D:\projects or C:\Users\YourName\Workspace"
              className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!newSafeWorkspace.trim()) return;
                if (!safetySettings.safeWorkspaces.includes(newSafeWorkspace.trim())) {
                  updateSafetySetting('safeWorkspaces', [...safetySettings.safeWorkspaces, newSafeWorkspace.trim()]);
                }
                setNewSafeWorkspace('');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Safe Zone</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {safetySettings.safeWorkspaces.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs text-emerald-300/90"
              >
                <span className="truncate">{path}</span>
                <button
                  type="button"
                  onClick={() => {
                    updateSafetySetting(
                      'safeWorkspaces',
                      safetySettings.safeWorkspaces.filter((p) => p !== path)
                    );
                  }}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors ml-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Sensitive Applications & Windows Blacklist */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Sensitive Applications & Windows Blacklist</h3>
              <p className="text-[11px] text-slate-400">
                Applications that Seyal AI must never click, screenshot, or automate
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Quick App Presets */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-500 self-center">Popular apps:</span>
            {BLOCKED_APP_PRESETS.map((app) => (
              <button
                key={app}
                type="button"
                onClick={() => {
                  if (!safetySettings.blockedApplications.includes(app)) {
                    updateSafetySetting('blockedApplications', [...safetySettings.blockedApplications, app]);
                  }
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              >
                + {app}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newBlockedApp}
              onChange={(e) => setNewBlockedApp(e.target.value)}
              placeholder="e.g. Bitwarden, Keepass, Chrome Banking"
              className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!newBlockedApp.trim()) return;
                if (!safetySettings.blockedApplications.includes(newBlockedApp.trim())) {
                  updateSafetySetting('blockedApplications', [...safetySettings.blockedApplications, newBlockedApp.trim()]);
                }
                setNewBlockedApp('');
              }}
              className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Masked App</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {safetySettings.blockedApplications.map((app) => (
              <div
                key={app}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300"
              >
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                <span>{app}</span>
                <button
                  type="button"
                  onClick={() => {
                    updateSafetySetting(
                      'blockedApplications',
                      safetySettings.blockedApplications.filter((a) => a !== app)
                    );
                  }}
                  className="hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
