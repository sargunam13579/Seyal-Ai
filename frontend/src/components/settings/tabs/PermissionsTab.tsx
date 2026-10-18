import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
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
  Terminal,
  Globe,
  Clipboard,
  Zap,
  Search,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../services/api';

interface PermissionItemConfig {
  scope: string;
  name: string;
  description: string;
  category: 'media' | 'os' | 'exec' | 'system';
  riskLevel: 'low' | 'medium' | 'high';
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    border: string;
    text: string;
  };
}

const PERMISSION_CONFIGS: PermissionItemConfig[] = [
  // 1. Media, Vision & Sensors
  {
    scope: 'microphone',
    name: 'Microphone & Audio Input',
    description: 'Access microphone for real-time hands-free voice conversations, wake-word listening, and audio transcription.',
    category: 'media',
    riskLevel: 'medium',
    icon: Mic,
    color: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  },
  {
    scope: 'camera',
    name: 'Camera & Webcam',
    description: 'Access connected webcams for visual processing, document photo capture, and visual question answering.',
    category: 'media',
    riskLevel: 'medium',
    icon: Camera,
    color: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  },
  {
    scope: 'screen_capture',
    name: 'Screen Capture & Multimodal Vision',
    description: 'Capture active desktop displays for Set-of-Marks visual UI grounding, screen OCR, and contextual assistance.',
    category: 'media',
    riskLevel: 'medium',
    icon: Eye,
    color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  },

  // 2. Autonomous OS & Input Automation
  {
    scope: 'mouse_control',
    name: 'Autonomous Mouse Control',
    description: 'Direct mouse automation: Move cursor, left/right click, double click, scroll wheel, and drag-and-drop elements.',
    category: 'os',
    riskLevel: 'high',
    icon: MousePointer,
    color: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  },
  {
    scope: 'keyboard_control',
    name: 'Autonomous Keyboard Control',
    description: 'Direct keyboard automation: Type text strings, send system shortcuts (Ctrl+C, Alt+Tab, Enter), and input hotkeys.',
    category: 'os',
    riskLevel: 'high',
    icon: Keyboard,
    color: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  },
  {
    scope: 'clipboard_access',
    name: 'System Clipboard Read & Write',
    description: 'Read copied text and paste content to/from the Windows operating system clipboard.',
    category: 'os',
    riskLevel: 'medium',
    icon: Clipboard,
    color: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  },
  {
    scope: 'app_control',
    name: 'Application Lifecycle Management',
    description: 'Launch installed desktop applications, bring windows to foreground, switch windows, and gracefully close apps.',
    category: 'os',
    riskLevel: 'medium',
    icon: PlaySquare,
    color: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  },
  {
    scope: 'accessibility',
    name: 'Accessibility & UI Automation Tree',
    description: 'Inspect UI tree elements, query accessibility states, and perform programmatic hands-free element focus.',
    category: 'os',
    riskLevel: 'low',
    icon: Cpu,
    color: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  },

  // 3. Execution, Browser & Code Tools
  {
    scope: 'terminal_execution',
    name: 'PowerShell & Terminal Shell Execution',
    description: 'Execute PowerShell, Command Prompt, and bash commands directly on the host machine for developers.',
    category: 'exec',
    riskLevel: 'high',
    icon: Terminal,
    color: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  },
  {
    scope: 'browser_automation',
    name: 'Playwright Browser Automation',
    description: 'Launch browser instances, navigate websites, fill web forms, and extract live web research data.',
    category: 'exec',
    riskLevel: 'medium',
    icon: Globe,
    color: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' },
  },
  {
    scope: 'background_tasks',
    name: 'Background Daemon Autonomous Workflows',
    description: 'Execute scheduled workflows and continuous autonomous agent steps even when Seyal AI is minimized.',
    category: 'exec',
    riskLevel: 'medium',
    icon: Zap,
    color: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  },

  // 4. Storage, Notifications & Connected Devices
  {
    scope: 'file_access',
    name: 'File System Read & Write Access',
    description: 'Read local file contents, create new documents, write code changes, and manage directories.',
    category: 'system',
    riskLevel: 'high',
    icon: FolderOpen,
    color: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400' },
  },
  {
    scope: 'file_operations',
    name: 'Directory Discovery & Search',
    description: 'Search files across Downloads, Desktop, Documents, and inspect folder hierarchies and drive structures.',
    category: 'system',
    riskLevel: 'medium',
    icon: HardDrive,
    color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  },
  {
    scope: 'notifications',
    name: 'Desktop Notifications & System Alerts',
    description: 'Display interactive desktop notifications, task completion toasts, and acoustic alerts.',
    category: 'system',
    riskLevel: 'low',
    icon: Bell,
    color: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  },
  {
    scope: 'device_control',
    name: 'Cross-Device & Mobile ADB Control',
    description: 'Bridge connected Android devices: Launch mobile apps, push files, and invoke ADB commands.',
    category: 'system',
    riskLevel: 'high',
    icon: Smartphone,
    color: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  },
  {
    scope: 'location',
    name: 'Device Location & Geolocation',
    description: 'Access device approximate coordinates, timezone, and regional context for weather and localized answers.',
    category: 'system',
    riskLevel: 'low',
    icon: MapPin,
    color: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
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

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'media' | 'os' | 'exec' | 'system'>('all');

  // Preset loading state & feedback
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

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

  // 1-Click Security Profiles
  const handleApplySecurityProfile = async (preset: 'paranoid' | 'balanced' | 'autonomous') => {
    setIsApplyingPreset(true);
    setFeedbackMessage(null);

    const updates: Record<string, 'allow' | 'ask' | 'block'> = {};

    PERMISSION_CONFIGS.forEach((item) => {
      if (preset === 'paranoid') {
        // Paranoid: Ask for everything
        updates[item.scope] = 'ask';
      } else if (preset === 'balanced') {
        // Balanced: High risk asks, low/medium allows
        if (item.riskLevel === 'high') {
          updates[item.scope] = 'ask';
        } else {
          updates[item.scope] = 'allow';
        }
      } else {
        // Autonomous: Everything allowed
        updates[item.scope] = 'allow';
      }
    });

    try {
      await Promise.all(
        Object.entries(updates).map(([scope, mode]) =>
          api.setPermissionMode(scope, mode).catch(() => {})
        )
      );

      setPermissionsState((prev) => {
        const nextState = { ...prev };
        Object.entries(updates).forEach(([scope, mode]) => {
          nextState[scope] = {
            ...nextState[scope],
            granted: mode === 'allow',
            mode: mode,
          };
        });
        return nextState;
      });

      const presetNames = {
        paranoid: 'Zero-Trust Paranoid (Ask Every Time for all scopes)',
        balanced: 'Balanced Operator (High-risk commands require confirmation)',
        autonomous: 'Full Autonomous Power Mode (All capabilities allowed)',
      };
      setFeedbackMessage(`Security profile applied: ${presetNames[preset]}`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Failed to apply preset:', err);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  // Emergency Revoke All
  const handleRevokeAllPermissions = async () => {
    setIsApplyingPreset(true);
    setShowRevokeConfirm(false);
    try {
      await Promise.all(
        PERMISSION_CONFIGS.map((item) =>
          api.setPermissionMode(item.scope, 'block').catch(() => {})
        )
      );

      setPermissionsState((prev) => {
        const nextState = { ...prev };
        PERMISSION_CONFIGS.forEach((item) => {
          nextState[item.scope] = {
            ...nextState[item.scope],
            granted: false,
            mode: 'block',
          };
        });
        return nextState;
      });

      setFeedbackMessage('All autonomous permissions have been revoked. Agent actions are frozen.');
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err) {
      console.error('Revoke all error:', err);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  // Compute counts
  const counts = useMemo(() => {
    let allowed = 0;
    let ask = 0;
    let blocked = 0;

    PERMISSION_CONFIGS.forEach((c) => {
      const p = permissionsState[c.scope];
      const mode = p?.mode || (p?.granted ?? true ? 'allow' : 'block');
      if (mode === 'allow') allowed++;
      else if (mode === 'ask') ask++;
      else blocked++;
    });

    return { allowed, ask, blocked };
  }, [permissionsState]);

  // Filtered list
  const filteredConfigs = useMemo(() => {
    return PERMISSION_CONFIGS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.scope.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

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
              <span className="text-xs font-bold text-slate-100">{item.name}</span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  mode === 'allow'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : mode === 'ask'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {mode === 'allow' ? 'Allowed' : mode === 'ask' ? 'Ask Every Time' : 'Blocked'}
              </span>

              {item.riskLevel === 'high' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                  HIGH RISK
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              {item.description}
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
            disabled={isBusy || isApplyingPreset}
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
              <span>{mode === 'allow' ? 'Allowed' : mode === 'ask' ? 'Ask Every Time' : 'Blocked'}</span>
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
                  <span>Blocked</span>
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
      {/* Sticky Header Bar */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Autonomous Capability Permissions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Granular access scopes, confirmation guardrails, and security profiles for Seyal AI agent
          </p>
        </div>

        {/* Live Privilege Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {counts.allowed} Allowed
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {counts.ask} Require Confirmation
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            {counts.blocked} Blocked
          </span>
        </div>
      </div>

      <div className="p-8 sm:p-10 space-y-7 w-full">
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fadeIn shadow-md">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 1. 1-CLICK SECURITY PROFILES (PRESETS) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">1-Click Security Profiles</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Quick system-wide security baselines</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Zero-Trust */}
            <button
              type="button"
              disabled={isApplyingPreset}
              onClick={() => handleApplySecurityProfile('paranoid')}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-900/80 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Zero-Trust (Paranoid)
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Maximum Safe
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Requires explicit confirmation prompt for every single tool and hardware sensor.
              </p>
            </button>

            {/* Balanced */}
            <button
              type="button"
              disabled={isApplyingPreset}
              onClick={() => handleApplySecurityProfile('balanced')}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Balanced Operator
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Recommended
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Smooth natural operation; Terminal scripts, deletions, and high-risk actions prompt for approval.
              </p>
            </button>

            {/* Full Autonomous */}
            <button
              type="button"
              disabled={isApplyingPreset}
              onClick={() => handleApplySecurityProfile('autonomous')}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Full Autonomous
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Hands-Free
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Grants uninterrupted permission across all 16 scopes for seamless automated workflows.
              </p>
            </button>
          </div>
        </div>

        {/* 2. FILTER PILLS & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `All (${PERMISSION_CONFIGS.length})` },
              { id: 'media', label: 'Sensors (3)' },
              { id: 'os', label: 'OS & Input (5)' },
              { id: 'exec', label: 'Code & Terminal (3)' },
              { id: 'system', label: 'Storage & Devices (5)' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box & Revoke Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scopes (e.g. terminal)..."
                className="w-full bg-slate-900/80 border border-slate-700/60 focus:border-cyan-500/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Emergency Revoke All */}
            {showRevokeConfirm ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRevokeConfirm(false)}
                  className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAllPermissions}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-rose-600/30"
                >
                  Block All
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(true)}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Revoke all autonomous privileges"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Revoke All</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. PERMISSIONS LIST */}
        <div className="space-y-3">
          {filteredConfigs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-2xl bg-slate-900/40">
              No permission scopes matched your search query.
            </div>
          ) : (
            filteredConfigs.map(renderPermissionCard)
          )}
        </div>
      </div>
    </div>
  );
};
