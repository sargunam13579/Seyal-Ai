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
  Eye,
  Camera,
  Gauge,
  PauseCircle,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
  XSquare,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useSeyalAi } from '../../../context/SeyalAiContext';

interface ComputerControlConfig {
  cursorGlideSpeed: 'natural' | 'smooth' | 'instant';
  keystrokeDelayMs: number;
  autoPauseOnUserMouseMove: boolean;
  maskSensitiveInputFields: boolean;
  somGroundingTags: boolean;
  blacklistedApps: string[];
}

const defaultControlConfig: ComputerControlConfig = {
  cursorGlideSpeed: 'natural',
  keystrokeDelayMs: 35,
  autoPauseOnUserMouseMove: true,
  maskSensitiveInputFields: true,
  somGroundingTags: true,
  blacklistedApps: ['Bitwarden', '1Password', 'KeePass', 'Banking'],
};

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
  const { addActivity } = useSeyalAi();

  const [awarenessData, setAwarenessData] = useState<any>(null);
  const [isLoadingAwareness, setIsLoadingAwareness] = useState<boolean>(false);
  const [isScanningAwareness, setIsScanningAwareness] = useState<boolean>(false);
  const [awarenessSearch, setAwarenessSearch] = useState<string>('');
  const [awarenessSubTab, setAwarenessSubTab] = useState<
    'all' | 'vision' | 'control' | 'apps' | 'running' | 'windows' | 'files' | 'sysinfo'
  >('all');
  const [permissionsState, setPermissionsState] = useState<Record<string, any>>({});
  const [isUpdatingPermission, setIsUpdatingPermission] = useState<Record<string, boolean>>({});
  const [autoUpdateAwareness, setAutoUpdateAwareness] = useState<boolean>(true);
  const [isLiveUpdateActive, setIsLiveUpdateActive] = useState<boolean>(false);

  // Computer Control Tuning Settings
  const [controlConfig, setControlConfig] = useState<ComputerControlConfig>(() => {
    try {
      const saved = localStorage.getItem('seyal_computer_control_config');
      return saved ? { ...defaultControlConfig, ...JSON.parse(saved) } : defaultControlConfig;
    } catch {
      return defaultControlConfig;
    }
  });

  // Action status / feedback toast
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [newBlacklistApp, setNewBlacklistApp] = useState<string>('');

  // Live Screen Vision Test Snapshot state
  const [isCapturingScreen, setIsCapturingScreen] = useState<boolean>(false);
  const [screenObservation, setScreenObservation] = useState<{
    active_window: string;
    detected_elements_count: number;
    screen_width: number;
    screen_height: number;
    som_base64_image?: string;
    base64_image?: string;
    timestamp: number;
  } | null>(null);

  const updateControlConfig = <K extends keyof ComputerControlConfig>(
    key: K,
    val: ComputerControlConfig[K]
  ) => {
    setControlConfig((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_computer_control_config', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save computer control config:', err);
      }
      return updated;
    });
  };

  const handleAddBlacklistApp = () => {
    const trimmed = newBlacklistApp.trim();
    if (!trimmed || controlConfig.blacklistedApps.includes(trimmed)) return;
    updateControlConfig('blacklistedApps', [...controlConfig.blacklistedApps, trimmed]);
    setNewBlacklistApp('');
  };

  const handleRemoveBlacklistApp = (appToRemove: string) => {
    updateControlConfig(
      'blacklistedApps',
      controlConfig.blacklistedApps.filter((a) => a !== appToRemove)
    );
  };

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

  // Direct Laptop Actions
  const handleLaunchApp = async (appName: string) => {
    setActionFeedback(`Launching ${appName}...`);
    try {
      const electron = (window as any).electronAPI;
      if (electron?.openApp) {
        await electron.openApp(appName);
      } else {
        await api.executeLaptopTool('launch_app', { app_name: appName });
      }
      setActionFeedback(`Successfully launched ${appName}.`);
      setTimeout(() => {
        loadAwarenessAndPermissions(false);
        setActionFeedback(null);
      }, 2000);
    } catch (err: any) {
      setActionFeedback(`Failed to launch ${appName}: ${err?.message || err}`);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleFocusWindow = async (windowTitle: string) => {
    setActionFeedback(`Focusing window '${windowTitle}'...`);
    try {
      await api.executeLaptopTool('focus_window', { window_title: windowTitle });
      setActionFeedback(`Brought '${windowTitle}' to foreground.`);
      setTimeout(() => {
        loadAwarenessAndPermissions(false);
        setActionFeedback(null);
      }, 1500);
    } catch (err: any) {
      setActionFeedback(`Failed to focus window: ${err?.message || err}`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleCloseWindow = async (windowTitle: string) => {
    setActionFeedback(`Closing window '${windowTitle}'...`);
    try {
      await api.executeLaptopTool('close_window', { window_title: windowTitle });
      setActionFeedback(`Closed '${windowTitle}'.`);
      setTimeout(() => {
        loadAwarenessAndPermissions(false);
        setActionFeedback(null);
      }, 1500);
    } catch (err: any) {
      setActionFeedback(`Failed to close window: ${err?.message || err}`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleCaptureScreenSnapshot = async () => {
    setIsCapturingScreen(true);
    setActionFeedback('Capturing screen and grounding UI elements...');
    try {
      const obs = await api.observeScreenState(controlConfig.somGroundingTags);
      if (obs) {
        setScreenObservation(obs);
        setActionFeedback(`Screen captured: ${obs.screen_width}x${obs.screen_height} with ${obs.detected_elements_count} UI elements detected.`);
        addActivity({
          type: 'tool_exec',
          title: 'Vision Observation Captured',
          detail: `Grounding tagged ${obs.detected_elements_count} interactable buttons & inputs on '${obs.active_window || 'Desktop'}'`,
          status: 'success',
        });
      }
    } catch (err: any) {
      console.error('Screen capture test failed:', err);
      setActionFeedback(`Perception test failed: ${err?.response?.data?.detail || err?.message || err}`);
    } finally {
      setIsCapturingScreen(false);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer shrink-0 ${
        checked
          ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50'
          : 'bg-slate-700/80 justify-start hover:bg-slate-600'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

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
                <span>Computer Awareness & Autonomous Control</span>
              </h2>
              <p className="text-xs text-slate-400">
                Visual perception, Set-of-Marks grounding, live process introspection, and execution speeds
              </p>
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

          {/* LIVE UPDATE SWITCH */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 shrink-0">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5 select-none">
              {isLiveUpdateActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              <span>Live Telemetry</span>
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
      <div className="p-8 sm:p-10 space-y-7 w-full">
        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fadeIn shadow-md">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

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
            { id: 'vision', label: '👁️ Vision & Perception' },
            { id: 'control', label: '🛡️ Control & Speed' },
            { id: 'windows', label: `🪟 Open Windows (${awarenessData?.open_windows_count || 0})` },
            { id: 'apps', label: `📦 Installed Apps (${awarenessData?.installed_apps_count || 0})` },
            { id: 'running', label: `⚡ Running Apps (${awarenessData?.running_apps_count || 0})` },
            { id: 'files', label: '📂 Files & Drives' },
            { id: 'sysinfo', label: '💻 System Info' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAwarenessSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                awarenessSubTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. NEW SECTION: VISION & SCREEN PERCEPTION INSPECTOR */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'vision') && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Live Vision Perception & Grounding</h3>
                  <p className="text-[11px] text-slate-400">
                    Test what the AI visual agent perceives on your screen with Set-of-Marks UI element grounding
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isCapturingScreen}
                onClick={handleCaptureScreenSnapshot}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-950/40"
              >
                <Camera className={`w-3.5 h-3.5 ${isCapturingScreen ? 'animate-pulse' : ''}`} />
                <span>{isCapturingScreen ? 'Observing Screen...' : 'Capture & Inspect Screen'}</span>
              </button>
            </div>

            {/* Set of Marks Grounding Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Set-of-Marks (SoM) Grounding Tag Overlay
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Automatically draw numeric markers and bounding boxes over interactable UI buttons & inputs.
                  </p>
                </div>
                {renderToggle(controlConfig.somGroundingTags, (val) =>
                  updateControlConfig('somGroundingTags', val)
                )}
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Mask Sensitive Passwords & OTPs
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Auto-blur confidential inputs and banking screens when sending visual frames to the vision LLM.
                  </p>
                </div>
                {renderToggle(controlConfig.maskSensitiveInputFields, (val) =>
                  updateControlConfig('maskSensitiveInputFields', val)
                )}
              </div>
            </div>

            {/* Live Observation Result Card */}
            {screenObservation && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-cyan-300 font-bold">Active Focus:</span>
                    <span className="text-white truncate max-w-xs">{screenObservation.active_window || 'Desktop'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span>Resolution: {screenObservation.screen_width} x {screenObservation.screen_height}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      {screenObservation.detected_elements_count} Grounded Elements
                    </span>
                  </div>
                </div>

                {/* Thumbnail Snapshot */}
                {(screenObservation.som_base64_image || screenObservation.base64_image) && (
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-72 flex justify-center bg-black/80">
                    <img
                      src={`data:image/png;base64,${
                        screenObservation.som_base64_image || screenObservation.base64_image
                      }`}
                      alt="Grounding Snapshot"
                      className="max-h-72 w-auto object-contain rounded"
                    />
                    <span className="absolute bottom-2 right-2 text-[10px] bg-slate-950/80 text-cyan-300 px-2 py-1 rounded font-mono border border-cyan-500/30">
                      Visual Grounding Feed
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. SECTION: AUTONOMOUS SPEED & SAFETY CONTROLS */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'control') && (
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Execution Speed & Operator Takeover Guards</h3>
                  <p className="text-[11px] text-slate-400">
                    Fine-tune cursor physics, keystroke delays, and automatic safety pause on physical mouse takeover
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cursor Glide Speed */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                    Mouse Movement Motion
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono uppercase">{controlConfig.cursorGlideSpeed}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'natural', label: 'Natural Curve', desc: 'Curved human-like trajectory' },
                    { id: 'smooth', label: 'Smooth Linear', desc: 'Direct smooth sweep' },
                    { id: 'instant', label: 'Instant Jump', desc: 'Sub-millisecond snap' },
                  ].map((speed) => (
                    <button
                      key={speed.id}
                      type="button"
                      onClick={() => updateControlConfig('cursorGlideSpeed', speed.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        controlConfig.cursorGlideSpeed === speed.id
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{speed.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{speed.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keystroke Delay Slider */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5 text-blue-400" />
                    Keystroke Delay (Typing Cadence)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">{controlConfig.keystrokeDelayMs} ms / key</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={controlConfig.keystrokeDelayMs}
                  onChange={(e) => updateControlConfig('keystrokeDelayMs', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Fast (5ms)</span>
                  <span>Balanced (35ms)</span>
                  <span>Human (120ms)</span>
                </div>
              </div>

              {/* Physical Takeover Safety Pause */}
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 md:col-span-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <PauseCircle className="w-3.5 h-3.5 text-rose-400" />
                    Physical Mouse Takeover Auto-Pause (Anti-Collision Guard)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    When you move your real physical mouse, immediately pause autonomous AI movement to prevent fighting for the cursor.
                  </p>
                </div>
                {renderToggle(controlConfig.autoPauseOnUserMouseMove, (val) =>
                  updateControlConfig('autoPauseOnUserMouseMove', val)
                )}
              </div>
            </div>

            {/* Blacklisted App Windows */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-200">
                Protected / Blacklisted Windows (Never Automate Or Capture)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBlacklistApp}
                  onChange={(e) => setNewBlacklistApp(e.target.value)}
                  placeholder="App or window title (e.g. 1Password, WhatsApp, Outlook)..."
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBlacklistApp()}
                />
                <button
                  type="button"
                  onClick={handleAddBlacklistApp}
                  disabled={!newBlacklistApp.trim()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Blacklist</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {controlConfig.blacklistedApps.map((app) => (
                  <span
                    key={app}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-1.5"
                  >
                    <span>{app}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlacklistApp(app)}
                      className="hover:text-rose-100 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. SECTION: Computer Control Permissions */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'control') && (
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
                      Allows agent to type text, press hotkeys (Win, Ctrl, Alt, Enter), and paste clipboard content.
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
                      Allows agent to launch apps directly, bring windows to foreground, switch windows, and close apps.
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
                          onClick={() => handleFocusWindow(win.title)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold border border-slate-700 cursor-pointer flex items-center gap-1"
                          title="Bring to foreground"
                        >
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                          <span>Focus</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCloseWindow(win.title)}
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
                          onClick={() => handleLaunchApp(app.name)}
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
      </div>
    </div>
  );
};
