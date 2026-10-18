import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Play,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Send,
  Check,
  Moon,
  Smartphone,
  Trash2,
  Layers,
  Radio,
} from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';

export interface NotificationSettings {
  desktopNotifications: boolean;
  soundAlerts: boolean;
  soundVolume: number;
  soundPreset: 'cyber-crystal' | 'soft-glass' | 'scifi-pulse' | 'arcade-blip';
  bannerPosition: 'top-right' | 'bottom-right' | 'top-center';
  toastDurationSeconds: number;
  taskCompleted: boolean;
  needsApproval: boolean;
  taskFailed: boolean;
  milestoneSteps: boolean;
  doNotDisturb: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  autoMuteScreenControl: boolean;
  fullScreenSuppress: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  dailySummary: boolean;
  mobilePushEnabled: boolean;
}

const defaultNotifSettings: NotificationSettings = {
  desktopNotifications: true,
  soundAlerts: true,
  soundVolume: 80,
  soundPreset: 'cyber-crystal',
  bannerPosition: 'top-right',
  toastDurationSeconds: 5,
  taskCompleted: true,
  needsApproval: true,
  taskFailed: true,
  milestoneSteps: false,
  doNotDisturb: false,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  autoMuteScreenControl: true,
  fullScreenSuppress: true,
  webhookEnabled: false,
  webhookUrl: '',
  dailySummary: true,
  mobilePushEnabled: true,
};

interface NotificationHistoryItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

const SOUND_PRESETS = [
  {
    id: 'cyber-crystal',
    name: 'Cyber Crystal',
    tag: 'Signature Synth Dual-Tone',
    desc: 'Harmonic sine frequencies (587Hz & 880Hz)',
  },
  {
    id: 'soft-glass',
    name: 'Soft Glass Ping',
    tag: 'Warm Calm Workspace',
    desc: 'Gentle triangle warm tone (440Hz & 659Hz)',
  },
  {
    id: 'scifi-pulse',
    name: 'Sci-Fi Pulse',
    tag: 'Futuristic Sweep',
    desc: 'Ascending sweep with smooth resonance',
  },
  {
    id: 'arcade-blip',
    name: 'Arcade Blip',
    tag: 'Retro 8-Bit Arpeggio',
    desc: 'Triad harmonic square chime (523Hz, 659Hz, 784Hz)',
  },
];

export const NotificationsTab: React.FC = () => {
  const { activities } = useSeyalAi();

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('seyal_notification_config');
      return saved ? { ...defaultNotifSettings, ...JSON.parse(saved) } : defaultNotifSettings;
    } catch {
      return defaultNotifSettings;
    }
  });

  const [browserPerm, setBrowserPerm] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const [showTestToast, setShowTestToast] = useState(false);
  const [webhookInput, setWebhookInput] = useState(() => notifSettings.webhookUrl || '');
  const [webhookSaved, setWebhookSaved] = useState(false);
  const testToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local notification event history
  const [historyItems, setHistoryItems] = useState<NotificationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('seyal_notif_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: '1',
        title: 'Laptop Introspection Completed',
        detail: 'Discovered installed desktop applications and open GUI windows.',
        timestamp: 'Just now',
        status: 'success',
      },
      {
        id: '2',
        title: 'Voice Pipeline Ready',
        detail: 'Bilingual Tamil & English speech model initialized.',
        timestamp: '5m ago',
        status: 'info',
      },
      {
        id: '3',
        title: 'Security Scope Verified',
        detail: 'Autonomous mouse and keyboard permissions active.',
        timestamp: '15m ago',
        status: 'success',
      },
    ];
  });

  // Sync activities from context into history
  useEffect(() => {
    if (activities && activities.length > 0) {
      const latest = activities.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.title,
        detail: a.detail,
        timestamp: 'Recent',
        status: (a.status === 'success' ? 'success' : a.status === 'error' ? 'error' : 'info') as 'success' | 'warning' | 'error' | 'info',
      }));
      setHistoryItems((prev) => {
        const merged = [...latest, ...prev.filter((p) => !latest.some((l) => l.id === p.id))].slice(0, 6);
        try {
          localStorage.setItem('seyal_notif_history', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
  }, [activities]);

  const updateNotifSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setNotifSettings((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('seyal_notification_config', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save notification settings', e);
      }
      return updated;
    });
  };

  const playChimePreset = useCallback((presetId: string, vol = 0.8) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (presetId === 'cyber-crystal') {
        // Tone 1: 587.33 Hz
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(vol * 0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);

        // Tone 2: 880 Hz
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.08);
        gain2.gain.setValueAtTime(vol * 0.35, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.45);
      } else if (presetId === 'soft-glass') {
        // Warm Triangle Tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
        gain.gain.setValueAtTime(vol * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (presetId === 'scifi-pulse') {
        // Sweep Pulse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.2);
        gain.gain.setValueAtTime(vol * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Arcade 8-Bit Triad
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(vol * 0.15, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.12);
        });
      }
    } catch (e) {
      console.warn('Web Audio chime not available:', e);
    }
  }, []);

  const handleRequestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setBrowserPerm(result);
        if (result === 'granted') {
          updateNotifSetting('desktopNotifications', true);
        }
      } catch (e) {
        console.error('Error requesting notification permission:', e);
      }
    }
  };

  const handleSendTestNotification = () => {
    if (notifSettings.soundAlerts) {
      playChimePreset(notifSettings.soundPreset, (notifSettings.soundVolume || 80) / 100);
    }

    if (
      notifSettings.desktopNotifications &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('Seyal AI • System Notification Test', {
          body: 'Autonomous task notification engine is active with low-latency delivery.',
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }

    setShowTestToast(true);
    if (testToastTimerRef.current) clearTimeout(testToastTimerRef.current);
    testToastTimerRef.current = setTimeout(() => {
      setShowTestToast(false);
    }, (notifSettings.toastDurationSeconds || 5) * 1000);
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
    localStorage.removeItem('seyal_notif_history');
  };

  const renderNotifToggle = (checked: boolean, onChange: (val: boolean) => void, disabled?: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${
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
      {/* Header Bar */}
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Notifications & Acoustic Alerts</span>
            </h2>
            <p className="text-xs text-slate-400">
              Autonomous task alerts, auditory sound themes, quiet hours, and remote channels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {notifSettings.doNotDisturb ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              DND ACTIVE
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ALERTS ACTIVE
            </span>
          )}

          <button
            type="button"
            onClick={handleSendTestNotification}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-400 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 border border-cyan-400/40 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Trigger live desktop notification and chime preview"
          >
            <Play className="w-3.5 h-3.5 fill-current text-white" />
            <span>Send Test Notification</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 sm:p-10 space-y-6 w-full max-w-5xl">
        {/* Floating In-App Live Test Toast */}
        {showTestToast && (
          <div className="p-4 rounded-xl bg-[#0b1b36] border-2 border-cyan-400 text-white shadow-[0_8px_30px_rgba(0,240,255,0.4)] ring-2 ring-cyan-400/40 flex items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                ✓
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Seyal AI Notification Preview</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-mono">
                    OPERATIONAL
                  </span>
                </div>
                <div className="text-[11px] text-cyan-100/90 mt-0.5">
                  Autonomous task alerts, auditory cyber chimes ({notifSettings.soundPreset}), and vision shield protection are fully active.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTestToast(false)}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-xs text-cyan-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. MASTER CONTROLS & AUDITORY SOUND PRESETS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Master Controls & Auditory Sound Themes</h3>
                <p className="text-[11px] text-slate-400">Windows desktop toast banners and harmonic Web Audio synthesizer chimes</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Desktop Notifications Toggle */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2 flex-wrap">
                  <span>Desktop Push Banners</span>
                  {browserPerm === 'granted' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                      ✓ Allowed by Windows
                    </span>
                  ) : browserPerm === 'denied' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                      ✕ Blocked in Browser
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestDesktopPermission}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono hover:bg-amber-500/25 transition-colors cursor-pointer"
                    >
                      ! Request Permission
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Display native Windows Toast banners when autonomous tasks complete or need attention.
                </p>
              </div>
              {renderNotifToggle(notifSettings.desktopNotifications, (val) =>
                updateNotifSetting('desktopNotifications', val)
              )}
            </div>

            {/* Sound Alerts Master Toggle */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  {notifSettings.soundAlerts ? (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <span>Auditory Earcon Chimes</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Play melodic acoustic synthesizer frequencies when workflows complete.
                </p>
              </div>
              {renderNotifToggle(notifSettings.soundAlerts, (val) => updateNotifSetting('soundAlerts', val))}
            </div>

            {/* Sound Themes & Volume */}
            {notifSettings.soundAlerts && (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4 animate-fadeIn">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200">
                    Acoustic Chime Theme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {SOUND_PRESETS.map((preset) => {
                      const isSelected = notifSettings.soundPreset === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                                {preset.name}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{preset.tag}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() => {
                                updateNotifSetting('soundPreset', preset.id as any);
                                playChimePreset(preset.id, (notifSettings.soundVolume || 80) / 100);
                              }}
                              className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isSelected ? 'Active' : 'Select'}
                            </button>

                            <button
                              type="button"
                              onClick={() => playChimePreset(preset.id, (notifSettings.soundVolume || 80) / 100)}
                              className="p-1 text-slate-400 hover:text-cyan-300 cursor-pointer"
                              title="Play preview"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-300">Chime Volume Level</span>
                    <p className="text-[10px] text-slate-500 font-mono">Web Audio synthesizer gain</p>
                  </div>
                  <div className="flex items-center gap-3 w-64">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={notifSettings.soundVolume}
                      onChange={(e) => updateNotifSetting('soundVolume', Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <span className="text-xs font-mono text-cyan-300 font-bold w-10 text-right">
                      {notifSettings.soundVolume}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. TOAST BANNER POSITION & DURATION */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Banner Position & Display Cadence</h3>
                <p className="text-[11px] text-slate-400">Desktop popup location and auto-dismiss timer</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Toast Popup Position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'top-right', label: 'Top-Right' },
                  { id: 'bottom-right', label: 'Bottom-Right' },
                  { id: 'top-center', label: 'Top-Center' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => updateNotifSetting('bannerPosition', pos.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      notifSettings.bannerPosition === pos.id
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Dismiss Duration */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Auto-Dismiss Duration</span>
                <span className="font-mono text-cyan-400">{notifSettings.toastDurationSeconds} seconds</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="1"
                value={notifSettings.toastDurationSeconds}
                onChange={(e) => updateNotifSetting('toastDurationSeconds', Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Fast (3s)</span>
                <span>Default (5s)</span>
                <span>Persistent (12s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. TASK-SPECIFIC EVENT TRIGGERS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Autonomous Task Event Triggers</h3>
                <p className="text-[11px] text-slate-400">Select which milestones trigger auditory and desktop alerts</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Task Completed Alert */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Task Completed Alert</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Notify immediately when an autonomous computer-use workflow or command finishes.
                </p>
              </div>
              {renderNotifToggle(notifSettings.taskCompleted, (val) =>
                updateNotifSetting('taskCompleted', val)
              )}
            </div>

            {/* Needs Operator Approval */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Needs Operator Approval</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Instant banner when the agent requires human confirmation (terminal command, payment, file deletion).
                </p>
              </div>
              {renderNotifToggle(notifSettings.needsApproval, (val) =>
                updateNotifSetting('needsApproval', val)
              )}
            </div>

            {/* Task Failure / Errors */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Task Errors & Execution Failures</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Alert if background processes or agent execution encounters unhandled exceptions or timeouts.
                </p>
              </div>
              {renderNotifToggle(notifSettings.taskFailed, (val) => updateNotifSetting('taskFailed', val))}
            </div>

            {/* Milestone Progress Steps */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Intermediate Milestone Steps</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Verbose toast notifications for every sub-step during complex planning decomposition.
                </p>
              </div>
              {renderNotifToggle(notifSettings.milestoneSteps, (val) =>
                updateNotifSetting('milestoneSteps', val)
              )}
            </div>
          </div>
        </div>

        {/* 4. SMART FOCUS, VISION SHIELD & QUIET HOURS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Smart Focus, Vision Shield & Quiet Hours</h3>
                <p className="text-[11px] text-slate-400">Prevent popup toasts from blocking computer vision screenshots and quiet nighttime tasks</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Master DND */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Do Not Disturb (DND)</span>
                  {notifSettings.doNotDisturb && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                      MUTED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Suppress all audio and popup alerts immediately.
                </p>
              </div>
              {renderNotifToggle(notifSettings.doNotDisturb, (val) => updateNotifSetting('doNotDisturb', val))}
            </div>

            {/* Scheduled Quiet Hours */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Overnight Scheduled Quiet Hours</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Auto-mute acoustic chimes while running background tasks overnight so you can sleep peacefully.
                  </p>
                </div>
                {renderNotifToggle(notifSettings.quietHoursEnabled, (val) =>
                  updateNotifSetting('quietHoursEnabled', val)
                )}
              </div>

              {notifSettings.quietHoursEnabled && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center gap-3 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">From:</span>
                    <input
                      type="time"
                      value={notifSettings.quietHoursStart}
                      onChange={(e) => updateNotifSetting('quietHoursStart', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">To:</span>
                    <input
                      type="time"
                      value={notifSettings.quietHoursEnd}
                      onChange={(e) => updateNotifSetting('quietHoursEnd', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Auto-Mute during Screen Control */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Auto-Mute during Autonomous Screen Control</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Suppress banners while the agent takes screenshots to prevent toasts from obscuring clickable UI elements.
                </p>
              </div>
              {renderNotifToggle(notifSettings.autoMuteScreenControl, (val) =>
                updateNotifSetting('autoMuteScreenControl', val)
              )}
            </div>
          </div>
        </div>

        {/* 5. REMOTE WEBHOOK & MOBILE NOTIFICATION CHANNELS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Remote Webhook & Mobile Channels</h3>
                <p className="text-[11px] text-slate-400">Receive alerts on Telegram, Discord, Slack, or connected Android phone</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Connected Mobile Push */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Forward Alerts to Paired Android Smartphone</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Push task milestone updates and urgent confirmations to your connected mobile device.
                </p>
              </div>
              {renderNotifToggle(notifSettings.mobilePushEnabled, (val) =>
                updateNotifSetting('mobilePushEnabled', val)
              )}
            </div>

            {/* Webhook Forwarding */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-200">
                    Webhook Relay (Telegram / Discord / Slack)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    POST JSON payloads when tasks require operator approval or finish running in the background.
                  </p>
                </div>
                {renderNotifToggle(notifSettings.webhookEnabled, (val) =>
                  updateNotifSetting('webhookEnabled', val)
                )}
              </div>

              {notifSettings.webhookEnabled && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 animate-fadeIn">
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => {
                      setWebhookInput(e.target.value);
                      setWebhookSaved(false);
                    }}
                    placeholder="https://api.telegram.org/bot... or https://discord.com/api/webhooks/..."
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateNotifSetting('webhookUrl', webhookInput.trim());
                      setWebhookSaved(true);
                      setTimeout(() => setWebhookSaved(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-medium cursor-pointer transition-all shrink-0 flex items-center gap-1.5"
                  >
                    {webhookSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Save URL</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6. RECENT NOTIFICATION EVENT HISTORY FEED */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Recent Notification History Feed</h3>
                <p className="text-[11px] text-slate-400">Event trail of past task milestones and alerts</p>
              </div>
            </div>

            {historyItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Trash2 className="w-3 h-3 text-slate-400" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {historyItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
                No recent notifications recorded.
              </div>
            ) : (
              historyItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        item.status === 'success'
                          ? 'bg-emerald-400'
                          : item.status === 'error'
                          ? 'bg-rose-400'
                          : 'bg-cyan-400'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-200">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.detail}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
