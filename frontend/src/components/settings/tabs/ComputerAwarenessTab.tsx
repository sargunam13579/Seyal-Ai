import React, { useState, useEffect } from 'react';
import {
  Laptop,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import {
  defaultControlConfig,
  formatLaptopDateTime,
  QuickMetricsGrid,
  VisionPerceptionCard,
  ControlSpeedSafetyCard,
  ToolPermissionsCard,
  WindowsAndAppsCatalog,
} from './computer_awareness';
import type { ComputerControlConfig } from './computer_awareness';

export type { ComputerControlConfig };

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
        <QuickMetricsGrid awarenessData={awarenessData} />

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

        {/* 3. SECTION: VISION & SCREEN PERCEPTION INSPECTOR */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'vision') && (
          <VisionPerceptionCard
            isCapturingScreen={isCapturingScreen}
            onCaptureScreenSnapshot={handleCaptureScreenSnapshot}
            controlConfig={controlConfig}
            updateControlConfig={updateControlConfig}
            screenObservation={screenObservation}
            renderToggle={renderToggle}
          />
        )}

        {/* 4. SECTION: AUTONOMOUS SPEED & SAFETY CONTROLS */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'control') && (
          <ControlSpeedSafetyCard
            controlConfig={controlConfig}
            updateControlConfig={updateControlConfig}
            newBlacklistApp={newBlacklistApp}
            setNewBlacklistApp={setNewBlacklistApp}
            onAddBlacklistApp={handleAddBlacklistApp}
            onRemoveBlacklistApp={handleRemoveBlacklistApp}
            renderToggle={renderToggle}
          />
        )}

        {/* 5. SECTION: Computer Control Permissions */}
        {(awarenessSubTab === 'all' || awarenessSubTab === 'control') && (
          <ToolPermissionsCard
            permissionsState={permissionsState}
            isUpdatingPermission={isUpdatingPermission}
            onTogglePermission={handleTogglePermission}
            autoUpdateAwareness={autoUpdateAwareness}
            setAutoUpdateAwareness={setAutoUpdateAwareness}
          />
        )}

        {/* 6 to 10. Open Windows, Installed Apps, Running Processes, Files, System Info */}
        <WindowsAndAppsCatalog
          awarenessSubTab={awarenessSubTab}
          awarenessData={awarenessData}
          awarenessSearch={awarenessSearch}
          setAwarenessSearch={setAwarenessSearch}
          isLoadingAwareness={isLoadingAwareness}
          onFocusWindow={handleFocusWindow}
          onCloseWindow={handleCloseWindow}
          onLaunchApp={handleLaunchApp}
        />
      </div>
    </div>
  );
};

export default ComputerAwarenessTab;
