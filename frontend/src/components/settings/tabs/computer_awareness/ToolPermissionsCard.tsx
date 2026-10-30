import React from 'react';
import {
  Shield,
  MousePointer,
  Keyboard,
  PlaySquare,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';

interface ToolPermissionsCardProps {
  permissionsState: Record<string, any>;
  isUpdatingPermission: Record<string, boolean>;
  onTogglePermission: (scope: string, currentGranted: boolean) => void;
  autoUpdateAwareness: boolean;
  setAutoUpdateAwareness: (val: boolean) => void;
}

export const ToolPermissionsCard: React.FC<ToolPermissionsCardProps> = ({
  permissionsState,
  isUpdatingPermission,
  onTogglePermission,
  autoUpdateAwareness,
  setAutoUpdateAwareness,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Operating System Autonomous Tool Permissions</span>
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure explicit autonomous action permissions for the agent on this PC.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mouse Control */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <MousePointer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Mouse Control</div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Allows agent to move cursor, click buttons, double-click, and drag elements on screen.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdatingPermission['mouse_control']}
            onClick={() =>
              onTogglePermission('mouse_control', permissionsState['mouse_control']?.granted ?? true)
            }
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              permissionsState['mouse_control']?.granted ?? true
                ? 'bg-cyan-500 justify-end'
                : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Keyboard Control */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Keyboard Control</div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Allows agent to type text, press hotkeys (Win, Ctrl, Alt, Enter), and paste clipboard content.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdatingPermission['keyboard_control']}
            onClick={() =>
              onTogglePermission('keyboard_control', permissionsState['keyboard_control']?.granted ?? true)
            }
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              permissionsState['keyboard_control']?.granted ?? true
                ? 'bg-cyan-500 justify-end'
                : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Applications Control */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Applications Control</div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Allows agent to launch apps directly, bring windows to foreground, switch windows, and close apps.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdatingPermission['app_control']}
            onClick={() =>
              onTogglePermission('app_control', permissionsState['app_control']?.granted ?? true)
            }
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              permissionsState['app_control']?.granted ?? true
                ? 'bg-cyan-500 justify-end'
                : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* File Operations */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">File Operations</div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Allows agent to search files in Downloads/Desktop/Documents, read files, and create/modify documents.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdatingPermission['file_operations']}
            onClick={() =>
              onTogglePermission('file_operations', permissionsState['file_operations']?.granted ?? true)
            }
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              permissionsState['file_operations']?.granted ?? true
                ? 'bg-cyan-500 justify-end'
                : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Automatic Updates */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-start justify-between gap-4 md:col-span-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Automatic Updates</div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Periodically refresh laptop awareness in background so the agent always knows newly installed software, files, and running processes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutoUpdateAwareness(!autoUpdateAwareness)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              autoUpdateAwareness ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>
      </div>
    </div>
  );
};
