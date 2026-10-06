import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  ChevronDown,
  Loader2,
  Check,
  HelpCircle,
  X,
  Mic,
  Camera,
  Eye,
  MousePointer,
  Keyboard,
  PlaySquare,
  Cpu,
  FolderOpen,
  HardDrive,
  Bell,
  Smartphone,
  MapPin,
  Laptop,
  Database,
} from 'lucide-react';
import { api } from '../../../services/api';

interface PermissionItemConfig {
  scope: string;
  name: string;
  description: string;
  category: 'media' | 'os' | 'system';
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    border: string;
    text: string;
    badge: string;
  };
}

const PERMISSION_CONFIGS: PermissionItemConfig[] = [
  // Media, Vision & Audio
  {
    scope: 'microphone',
    name: 'Microphone & Audio Input',
    description: 'Access microphone for real-time voice conversations, audio recording, and continuous speech recognition.',
    category: 'media',
    icon: Mic,
    color: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  },
  {
    scope: 'camera',
    name: 'Camera & Webcam',
    description: 'Access connected webcams for visual processing, taking snapshots, and optical character recognition (OCR).',
    category: 'media',
    icon: Camera,
    color: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  },
  {
    scope: 'screen_capture',
    name: 'Screen Capture & Multimodal Vision',
    description: 'Capture active desktop and application displays for multimodal visual inspection, screen OCR, and contextual assistance.',
    category: 'media',
    icon: Eye,
    color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  },

  // Autonomous OS & Input Automation
  {
    scope: 'mouse_control',
    name: 'Autonomous Mouse Control',
    description: 'Direct mouse automation: Move cursor, single click, double click, right click, scroll, and drag across screens.',
    category: 'os',
    icon: MousePointer,
    color: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  },
  {
    scope: 'keyboard_control',
    name: 'Autonomous Keyboard Control',
    description: 'Direct keyboard automation: Type text strings, execute keyboard shortcuts (Ctrl+C, Alt+Tab, Enter), and interact with input fields.',
    category: 'os',
    icon: Keyboard,
    color: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  },
  {
    scope: 'app_control',
    name: 'Application Lifecycle Management',
    description: 'Launch installed desktop applications, bring windows to foreground, switch windows, and gracefully terminate processes.',
    category: 'os',
    icon: PlaySquare,
    color: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  },
  {
    scope: 'accessibility',
    name: 'Accessibility & UI Automation',
    description: 'Inspect UI tree elements, query application accessibility states, and perform programmatic hands-free interactions.',
    category: 'os',
    icon: Cpu,
    color: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  },

  // Storage, Notifications & Devices
  {
    scope: 'file_access',
    name: 'File System Read & Write Access',
    description: 'Read local file contents, create new files, write updates, convert document formats, and manage files.',
    category: 'system',
    icon: FolderOpen,
    color: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  },
  {
    scope: 'file_operations',
    name: 'Directory Discovery & Operations',
    description: 'Search files across Downloads, Desktop, Documents, and inspect folder hierarchies and drive structures.',
    category: 'system',
    icon: HardDrive,
    color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  },
  {
    scope: 'notifications',
    name: 'System Notifications & Alerts',
    description: 'Display interactive desktop notifications, system toast alerts, and status banners when background tasks complete.',
    category: 'system',
    icon: Bell,
    color: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  },
  {
    scope: 'device_control',
    name: 'Cross-Device & Mobile ADB Control',
    description: 'Control connected Android smartphones and external tablets: Launch mobile apps, push files, and invoke ADB commands.',
    category: 'system',
    icon: Smartphone,
    color: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  },
  {
    scope: 'location',
    name: 'Device Location & Geolocation',
    description: 'Access device approximate coordinates, timezone, and regional context for weather and local queries.',
    category: 'system',
    icon: MapPin,
    color: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  },
];

const formatLastAccessed = (timestamp?: number | null, by?: string | null): string => {
  if (!timestamp) return 'Never accessed';
  const now = Date.now() / 1000;
  const diff = Math.max(0, Math.floor(now - timestamp));
  let timeStr = '';
  if (diff < 60) timeStr = 'Just now';
  else if (diff < 3600) timeStr = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) timeStr = `${Math.floor(diff / 3600)}h ago`;
  else {
    const d = new Date(timestamp * 1000);
    timeStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return by ? `${timeStr} by ${by}` : timeStr;
};

export const PermissionsTab: React.FC = () => {
  const [permissionsState, setPermissionsState] = useState<Record<string, any>>({});
  const [isUpdatingPermission, setIsUpdatingPermission] = useState<Record<string, boolean>>({});
  const [openDropdownScope, setOpenDropdownScope] = useState<string | null>(null);

  const loadPermissionsData = async () => {
    try {
      const perms = await api.getPermissions();
      if (perms && typeof perms === 'object') {
        setPermissionsState(perms);
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  useEffect(() => {
    loadPermissionsData();
  }, []);

  const handleSetPermissionMode = async (scope: string, mode: 'allow' | 'ask' | 'block') => {
    setIsUpdatingPermission((prev) => ({ ...prev, [scope]: true }));
    try {
      const res = await api.setPermissionMode(scope, mode);
      setPermissionsState((prev) => ({
        ...prev,
        [scope]: {
          ...prev[scope],
          granted: mode === 'allow',
          mode: mode,
          last_accessed_at: res?.last_accessed_at ?? prev[scope]?.last_accessed_at,
          last_accessed_by: res?.last_accessed_by ?? prev[scope]?.last_accessed_by,
        },
      }));
    } catch (err) {
      console.error(`Failed to set permission mode for ${scope}:`, err);
    } finally {
      setIsUpdatingPermission((prev) => ({ ...prev, [scope]: false }));
    }
  };

  const renderPermissionCard = (item: PermissionItemConfig) => {
    const IconComponent = item.icon;
    const permData = permissionsState[item.scope];
    const mode = permData?.mode || (permData?.granted ?? true ? 'allow' : 'block');
    const isBusy = !!isUpdatingPermission[item.scope];
    const lastAccessedText = formatLastAccessed(permData?.last_accessed_at, permData?.last_accessed_by);

    return (
      <div
        key={item.scope}
        className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl ${item.color.bg} border ${item.color.border} flex items-center justify-center ${item.color.text} shrink-0 mt-0.5`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-100">{item.name}</span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  mode === 'allow'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : mode === 'ask'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {mode === 'allow' ? 'Allowed' : mode === 'ask' ? 'Ask Every Time' : 'Not Allowed'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              {permData?.description || item.description}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px]">
              <span className="font-mono text-[10px] text-slate-500">scope: {item.scope}</span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400/80" />
                <span>
                  Last accessed: <span className={permData?.last_accessed_at ? 'text-slate-200 font-medium' : 'text-slate-500'}>{lastAccessedText}</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 3-Way Mode Dropdown Selector */}
        <div className="relative shrink-0 self-start sm:self-center">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setOpenDropdownScope(openDropdownScope === item.scope ? null : item.scope)}
            className={`flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm min-w-[168px] ${
              mode === 'allow'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                : mode === 'ask'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
            } ${isBusy ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2">
              {isBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : mode === 'allow' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : mode === 'ask' ? (
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <X className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{mode === 'allow' ? 'Allowed' : mode === 'ask' ? 'Ask Every Time' : 'Not Allowed'}</span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                openDropdownScope === item.scope
                  ? 'rotate-180 ' + (mode === 'allow' ? 'text-emerald-300' : mode === 'ask' ? 'text-amber-300' : 'text-rose-300')
                  : 'text-slate-400'
              }`}
            />
          </button>

          {/* Dropdown Menu Popover */}
          {openDropdownScope === item.scope && (
            <div
              onMouseLeave={() => setOpenDropdownScope(null)}
              className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#090f1d]/95 border border-slate-700/80 shadow-2xl p-1 z-50 backdrop-blur-xl space-y-0.5 animate-fadeIn"
            >
              <button
                type="button"
                onClick={() => {
                  handleSetPermissionMode(item.scope, 'allow');
                  setOpenDropdownScope(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'allow'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Allowed</span>
                </div>
                {mode === 'allow' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSetPermissionMode(item.scope, 'ask');
                  setOpenDropdownScope(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'ask'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ask Every Time</span>
                </div>
                {mode === 'ask' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSetPermissionMode(item.scope, 'block');
                  setOpenDropdownScope(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'block'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <X className="w-3.5 h-3.5 text-rose-400" />
                  <span>Not Allowed</span>
                </div>
                {mode === 'block' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Header Bar */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <span>Capability Permissions</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure hardware access, autonomous system inputs, and security execution scopes for Seyal AI agent.
        </p>
      </div>

      <div className="p-8 sm:p-10 space-y-7 w-full">
        {/* Section 1: Media, Vision & Audio */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
            <Mic className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Media, Vision & Audio Sensors
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {PERMISSION_CONFIGS.filter((c) => c.category === 'media').map(renderPermissionCard)}
          </div>
        </div>

        {/* Section 2: Autonomous OS & Input Automation */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Autonomous OS & Input Automation
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {PERMISSION_CONFIGS.filter((c) => c.category === 'os').map(renderPermissionCard)}
          </div>
        </div>

        {/* Section 3: Storage, Notifications & Devices */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Storage, Notifications & Connected Devices
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {PERMISSION_CONFIGS.filter((c) => c.category === 'system').map(renderPermissionCard)}
          </div>
        </div>
      </div>
    </div>
  );
};
