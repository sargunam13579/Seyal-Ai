import React from 'react';
import {
  Monitor,
  ExternalLink,
  XSquare,
  Layers,
  Search,
  Activity,
  FolderOpen,
  Cpu,
} from 'lucide-react';

interface WindowsAndAppsCatalogProps {
  awarenessSubTab: 'all' | 'vision' | 'control' | 'apps' | 'running' | 'windows' | 'files' | 'sysinfo';
  awarenessData: any;
  awarenessSearch: string;
  setAwarenessSearch: (val: string) => void;
  isLoadingAwareness: boolean;
  onFocusWindow: (windowTitle: string) => void;
  onCloseWindow: (windowTitle: string) => void;
  onLaunchApp: (appName: string) => void;
}

export const WindowsAndAppsCatalog: React.FC<WindowsAndAppsCatalogProps> = ({
  awarenessSubTab,
  awarenessData,
  awarenessSearch,
  setAwarenessSearch,
  isLoadingAwareness,
  onFocusWindow,
  onCloseWindow,
  onLaunchApp,
}) => {
  return (
    <>
      {/* 6. SECTION: INTERACTIVE OPEN WINDOWS CONTROL */}
      {(awarenessSubTab === 'all' || awarenessSubTab === 'windows') && (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-400" />
            <span>Interactive Open Windows Control ({awarenessData?.open_windows_count || 0})</span>
          </h3>

          <div className="max-h-80 overflow-y-auto custom-scrollbar border border-slate-800/80 rounded-2xl bg-slate-950/40 p-2 space-y-1.5">
            {!awarenessData?.open_windows || awarenessData.open_windows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No active desktop GUI windows detected.
              </div>
            ) : (
              awarenessData.open_windows.map((win: any, idx: number) => (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    win.is_active
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-mono">{win.title}</span>
                    {win.is_active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/30 text-cyan-300 shrink-0">
                        ACTIVE FOCUS
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!win.is_active && (
                      <button
                        type="button"
                        onClick={() => onFocusWindow(win.title)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold border border-slate-700 cursor-pointer flex items-center gap-1"
                        title="Bring to foreground"
                      >
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                        <span>Focus</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onCloseWindow(win.title)}
                      className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[10px] border border-rose-500/30 cursor-pointer"
                      title="Close window"
                    >
                      <XSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. SECTION: INSTALLED APPS EXPLORER WITH 1-CLICK LAUNCH */}
      {(awarenessSubTab === 'all' || awarenessSubTab === 'apps') && (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Installed Applications ({awarenessData?.installed_apps_count || 0})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Launch apps directly or allow the autonomous agent to control them
              </p>
            </div>

            {/* Search App Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-cyan-400/80 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={awarenessSearch}
                onChange={(e) => setAwarenessSearch(e.target.value)}
                placeholder="Filter installed apps..."
                className="w-full bg-slate-900/90 border border-slate-700/60 focus:border-cyan-500/60 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar border border-slate-800/80 rounded-2xl bg-slate-950/40 p-2 space-y-1.5">
            {!awarenessData?.installed_apps || awarenessData.installed_apps.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {isLoadingAwareness ? 'Scanning installed applications...' : 'Click "Update / Scan Laptop" to detect installed apps.'}
              </div>
            ) : (
              awarenessData.installed_apps
                .filter((app: any) =>
                  !awarenessSearch.trim() ||
                  app.name.toLowerCase().includes(awarenessSearch.toLowerCase()) ||
                  app.publisher?.toLowerCase().includes(awarenessSearch.toLowerCase())
                )
                .map((app: any, idx: number) => (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/70 hover:border-cyan-500/30 flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-cyan-600/15 border border-cyan-400/20 text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {app.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-200 truncate">{app.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {app.publisher ? `${app.publisher}` : ''}
                          {app.version ? ` • v${app.version}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLaunchApp(app.name)}
                        className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-semibold cursor-pointer transition-all"
                      >
                        Launch
                      </button>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {app.source === 'registry' ? 'Registry' : 'Start Menu'}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* 8. SECTION: Running Processes */}
      {(awarenessSubTab === 'all' || awarenessSubTab === 'running') && (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Running Apps / Processes ({awarenessData?.running_apps_count || 0})</span>
          </h3>

          <div className="max-h-72 overflow-y-auto custom-scrollbar border border-slate-800/80 rounded-2xl bg-slate-950/40 p-2 space-y-1.5">
            {!awarenessData?.running_apps || awarenessData.running_apps.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {isLoadingAwareness ? 'Scanning processes...' : 'No running process data.'}
              </div>
            ) : (
              awarenessData.running_apps.slice(0, 40).map((proc: any, idx: number) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-200 truncate">{proc.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">PID:{proc.pid}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {proc.memory_percent}% RAM
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 9. SECTION: Files & Drives */}
      {(awarenessSubTab === 'all' || awarenessSubTab === 'files') && (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>Files, Folders & Storage Drives</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Directories */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">Standard User Directories</div>
              <div className="grid grid-cols-2 gap-2">
                {awarenessData?.files_and_folders?.folders &&
                  Object.entries(awarenessData.files_and_folders.folders).map(([label, f]: any) => (
                    <div
                      key={label}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs"
                    >
                      <div className="font-semibold text-slate-200">{label}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        {f.file_count} files • {f.folder_count} dirs
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Hard Disk Drives */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">Storage Partitions (Drives)</div>
              <div className="space-y-2">
                {awarenessData?.files_and_folders?.drives?.map((drive: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-200">
                        {drive.device} ({drive.mountpoint})
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {drive.free_gb} GB free of {drive.total_gb} GB
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          drive.percent > 85 ? 'bg-rose-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${drive.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. SECTION: System Diagnostics & Hardware */}
      {(awarenessSubTab === 'all' || awarenessSubTab === 'sysinfo') && (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>System Hardware & OS Diagnostics</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">OS Build</div>
              <div className="font-mono text-slate-200 mt-1 truncate">
                {awarenessData?.system_info?.os || 'Windows OS'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Processor / Cores</div>
              <div className="font-mono text-slate-200 mt-1 truncate">
                {awarenessData?.system_info?.cpu?.cores_logical || 0} Cores (
                {awarenessData?.system_info?.cpu?.current_percent || 0}% load)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total RAM</div>
              <div className="font-mono text-slate-200 mt-1">
                {awarenessData?.system_info?.ram?.total_gb || 0} GB ({awarenessData?.system_info?.ram?.available_gb || 0} GB free)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Screen Resolution</div>
              <div className="font-mono text-slate-200 mt-1">
                {awarenessData?.system_info?.resolution || '1920 x 1080'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
