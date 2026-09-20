import React, { useState, useEffect } from 'react';
import {
  Laptop,
  RefreshCw,
  Layers,
  Activity,
  Monitor,
  Cpu,
  Battery,
  Shield,
  MousePointer,
  Keyboard,
  PlaySquare,
  FolderOpen,
  Search,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useNexus } from '../../../context/NexusContext';

const formatLaptopDateTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString.includes('T') ? isoString : isoString.replace(' ', 'T'));
  if (isNaN(date.getTime())) return isoString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const datePart = `${day}/${month}/${year}`;

  const timePart = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${datePart} ${timePart}`;
};

export const ComputerAwarenessTab: React.FC = () => {
  const { addActivity } = useNexus();

  const [awarenessData, setAwarenessData] = useState<any>(null);
  const [isLoadingAwareness, setIsLoadingAwareness] = useState<boolean>(false);
  const [isScanningAwareness, setIsScanningAwareness] = useState<boolean>(false);
  const [awarenessSearch, setAwarenessSearch] = useState<string>('');
  const [awarenessSubTab, setAwarenessSubTab] = useState<'all' | 'control' | 'apps' | 'running' | 'windows' | 'files' | 'sysinfo'>('all');
  const [permissionsState, setPermissionsState] = useState<Record<string, any>>({});
  const [isUpdatingPermission, setIsUpdatingPermission] = useState<Record<string, boolean>>({});
  const [autoUpdateAwareness, setAutoUpdateAwareness] = useState<boolean>(true);
  const [isLiveUpdateActive, setIsLiveUpdateActive] = useState<boolean>(false);

  const loadAwarenessAndPermissions = async (forceScan: boolean = false) => {
    if (forceScan) {
      setIsScanningAwareness(true);
    } else {
      setIsLoadingAwareness(true);
    }
    try {
      const [awareness, permissions] = await Promise.all([
        forceScan ? api.scanLaptopAwareness() : api.getLaptopAwareness(),
        api.getPermissions().catch(() => ({})),
      ]);
      if (awareness) {
        setAwarenessData(awareness);
      }
      if (permissions) {
        setPermissionsState(permissions);
      }
      if (forceScan) {
        addActivity({
          type: 'tool_exec',
          title: 'Laptop Introspection Synced',
          detail: `Discovered ${awareness?.installed_apps_count || 0} installed apps, ${awareness?.running_apps_count || 0} running processes`,
          status: 'success',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch laptop awareness / permissions:', err);
    } finally {
      setIsLoadingAwareness(false);
      setIsScanningAwareness(false);
    }
  };

  useEffect(() => {
    loadAwarenessAndPermissions(false);
  }, []);

  // Live Telemetry Auto-Polling ONLY when isLiveUpdateActive is TRUE
  useEffect(() => {
    if (!isLiveUpdateActive) return;

    const interval = setInterval(async () => {
      try {
        const live = await api.getLiveTelemetry();
        if (live) {
          setAwarenessData((prev: any) => {
            if (!prev) return live;
            return {
              ...prev,
              running_apps_count: live.running_apps_count,
              open_windows_count: live.open_windows_count,
              running_apps: live.running_apps,
              open_windows: live.open_windows,
              last_scan_iso: live.last_scan_iso,
              system_info: {
                ...prev.system_info,
                ram: live.system_info?.ram || prev.system_info?.ram,
                battery: live.system_info?.battery || prev.system_info?.battery,
                cpu: live.system_info?.cpu || prev.system_info?.cpu,
              },
            };
          });
        }
      } catch (err) {
        console.warn('Live telemetry polling tick failed:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isLiveUpdateActive]);

  const handleTogglePermission = async (scope: string, currentGranted: boolean) => {
    setIsUpdatingPermission((prev) => ({ ...prev, [scope]: true }));
    try {
      const nextGranted = !currentGranted;
      const res = await api.setPermissionMode(scope, nextGranted ? 'allow' : 'block');
      setPermissionsState((prev) => ({
        ...prev,
        [scope]: {
          ...prev[scope],
          granted: nextGranted,
          mode: nextGranted ? 'allow' : 'block',
          last_accessed_at: res.last_accessed_at || prev[scope]?.last_accessed_at,
          last_accessed_by: res.last_accessed_by || prev[scope]?.last_accessed_by,
        },
      }));
    } catch (err) {
      console.error(`Failed to toggle permission for ${scope}:`, err);
    } finally {
      setIsUpdatingPermission((prev) => ({ ...prev, [scope]: false }));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Top Sticky Header */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Computer Awareness & Computer Control
              </h2>
            </div>
          </div>
        </div>

        {/* Top Right Action Area */}
        <div className="flex flex-wrap items-center gap-3">
          {awarenessData?.last_scan_iso && (
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Last Scan</div>
              <div className="text-xs font-mono text-slate-300">
                {formatLaptopDateTime(awarenessData.last_scan_iso)}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={isScanningAwareness || isLoadingAwareness}
            onClick={() => loadAwarenessAndPermissions(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-400 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 border border-cyan-400/40 disabled:opacity-50 transition-all cursor-pointer group shrink-0"
            title="Scan this laptop to detect installed apps, running processes, and open windows"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isScanningAwareness
                  ? 'animate-spin text-white'
                  : 'text-cyan-200 group-hover:rotate-180 transition-transform duration-500'
              }`}
            />
            <span>{isScanningAwareness ? 'Scanning Laptop...' : 'Update / Scan Laptop'}</span>
          </button>

          {/* LIVE UPDATE ON/OFF SWITCH */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 shrink-0">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5 select-none">
              {isLiveUpdateActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              <span>Live Update</span>
            </span>
            <button
              type="button"
              onClick={() => setIsLiveUpdateActive(!isLiveUpdateActive)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                isLiveUpdateActive ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
              title={
                isLiveUpdateActive
                  ? 'Live Telemetry Active: Polling open windows, active window, running apps, battery, and RAM'
                  : 'Live Telemetry Paused: Click to enable real-time polling'
              }
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 sm:p-10 space-y-8 w-full">
        {/* 1. Quick Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Installed Apps</div>
              <div className="text-lg font-bold text-white font-mono">
                {awarenessData?.installed_apps_count || 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Running Apps</div>
              <div className="text-lg font-bold text-white font-mono">
                {awarenessData?.running_apps_count || 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Open Windows</div>
              <div className="text-lg font-bold text-white font-mono">
                {awarenessData?.open_windows_count || 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">RAM Usage</div>
              <div className="text-lg font-bold text-white font-mono">
                {awarenessData?.system_info?.ram?.used_percent || 0}%
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Battery / Power</div>
              <div className="text-sm font-bold text-white font-mono truncate">
                {awarenessData?.system_info?.battery
                  ? `${awarenessData.system_info.battery.percent}% ${
                      awarenessData.system_info.battery.power_plugged ? '⚡ AC' : '🔋 Batt'
                    }`
                  : '⚡ AC Power'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Sub-Tabs Filter Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
          {[
            { id: 'all', label: 'All Overview' },
            { id: 'control', label: '🛡️ Computer Control (Permissions)' },
            { id: 'apps', label: `📦 Installed Apps (${awarenessData?.installed_apps_count || 0})` },
            { id: 'running', label: `⚡ Running Apps (${awarenessData?.running_apps_count || 0})` },
            { id: 'windows', label: `🪟 Open Windows (${awarenessData?.open_windows_count || 0})` },
            { id: 'files', label: '📂 Files & Drives' },
            { id: 'sysinfo', label: '💻 System Info' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAwarenessSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                awarenessSubTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. SECTION: Computer Control (Permissions & Capabilities) */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'control') && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Computer Control Permissions</span>
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
                      Allows agent to autonomously move mouse cursor, click buttons, double-click, and drag elements on screen.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUpdatingPermission['mouse_control']}
                  onClick={() =>
                    handleTogglePermission('mouse_control', permissionsState['mouse_control']?.granted ?? true)
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
                      Allows agent to autonomously type text, press hotkeys (Win, Ctrl, Alt, Enter), and paste clipboard content.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUpdatingPermission['keyboard_control']}
                  onClick={() =>
                    handleTogglePermission('keyboard_control', permissionsState['keyboard_control']?.granted ?? true)
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
                      Allows agent to launch installed apps directly, bring windows to foreground, switch windows, and close apps.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUpdatingPermission['app_control']}
                  onClick={() =>
                    handleTogglePermission('app_control', permissionsState['app_control']?.granted ?? true)
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
                    handleTogglePermission('file_operations', permissionsState['file_operations']?.granted ?? true)
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
        )}

        {/* 4. SECTION: Installed Apps Explorer */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'apps') && (
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Installed Applications ({awarenessData?.installed_apps_count || 0})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Discovered software on this machine via Windows Registry and Start Menu shortcuts.
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

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                        {app.source === 'registry' ? 'Registry' : 'Start Menu'}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* 5. SECTION: Running Apps & Open Windows */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'running' || awarenessSubTab === 'windows') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
            {/* Open Windows */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-400" />
                <span>Open Windows ({awarenessData?.open_windows_count || 0})</span>
              </h3>
              <div className="max-h-72 overflow-y-auto custom-scrollbar border border-slate-800/80 rounded-2xl bg-slate-950/40 p-2 space-y-1.5">
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
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-900/60 border-slate-800/70 text-slate-300'
                      }`}
                    >
                      <span className="truncate font-mono">{win.title}</span>
                      {win.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/30 text-cyan-300 shrink-0">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Running Processes */}
            <div className="space-y-3">
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
                  awarenessData.running_apps.slice(0, 30).map((proc: any, idx: number) => (
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
          </div>
        )}

        {/* 6. SECTION: Files & Drives */}
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

        {/* 7. SECTION: System Diagnostics & Hardware */}
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
      </div>
    </div>
  );
};
