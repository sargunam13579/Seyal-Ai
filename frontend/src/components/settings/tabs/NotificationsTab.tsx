import React, { useState, useRef, useCallback } from 'react';
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
  Activity,
} from 'lucide-react';

export interface NotificationSettings {
  desktopNotifications: boolean;
  soundAlerts: boolean;
  soundVolume: number;
  taskCompleted: boolean;
  needsApproval: boolean;
  taskFailed: boolean;
  milestoneSteps: boolean;
  doNotDisturb: boolean;
  autoMuteScreenControl: boolean;
  fullScreenSuppress: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  dailySummary: boolean;
}

const defaultNotifSettings: NotificationSettings = {
  desktopNotifications: true,
  soundAlerts: true,
  soundVolume: 80,
  taskCompleted: true,
  needsApproval: true,
  taskFailed: true,
  milestoneSteps: false,
  doNotDisturb: false,
  autoMuteScreenControl: true,
  fullScreenSuppress: true,
  webhookEnabled: false,
  webhookUrl: '',
  dailySummary: true,
};

export const NotificationsTab: React.FC = () => {
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('nexus_notification_config');
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

  const updateNotifSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setNotifSettings((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('nexus_notification_config', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save notification settings', e);
      }
      return updated;
    });
  };

  const playCyberChime = useCallback((vol = 0.8) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // Tone 1: 587.33 Hz (D5)
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

      // Tone 2: 880 Hz (A5)
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
      playCyberChime((notifSettings.soundVolume || 80) / 100);
    }

    if (notifSettings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
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
    }, 4500);
  };

  const renderNotifToggle = (checked: boolean, onChange: (val: boolean) => void, disabled?: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${checked ? 'bg-cyan-500 justify-end shadow-sm shadow-cyan-500/50' : 'bg-slate-700 justify-start'}`}
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
              <span>Notifications & System Alerts</span>
            </h2>
            <p className="text-xs text-slate-400">
              Autonomous task alerts, auditory cues, DND protection, and remote channels
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
                  Autonomous task alerts, auditory cyber chimes, and vision shield protection are fully active.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTestToast(false)}
              className="px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-xs text-cyan-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. MASTER CONTROLS & SOUND ALERTS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Master Controls & Sound Alerts</h3>
                <p className="text-[11px] text-slate-400">Windows desktop toast banners and cyber audio chimes</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Desktop Notifications */}
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

            {/* Sound Alerts */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  {notifSettings.soundAlerts ? (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <span>Auditory Cyber Chimes</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Play harmonic frequencies on task completion and operator notifications.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => playCyberChime((notifSettings.soundVolume || 80) / 100)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Test Chime Sound"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Preview</span>
                </button>
                {renderNotifToggle(notifSettings.soundAlerts, (val) => updateNotifSetting('soundAlerts', val))}
              </div>
            </div>

            {/* Volume Slider */}
            {notifSettings.soundAlerts && (
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between gap-4 pl-6 animate-fadeIn">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-300">Chime Volume Level</span>
                  <p className="text-[10px] text-slate-500 font-mono">Web Audio synthesizer gain</p>
                </div>
                <div className="flex items-center gap-3 w-60">
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
            )}
          </div>
        </div>

        {/* 2. AUTONOMOUS TASK & AGENT ALERTS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Autonomous Task & Agent Alerts</h3>
                <p className="text-[11px] text-slate-400">Trigger alerts based on real-time task milestones and operator safety</p>
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
                  Notify immediately when an autonomous computer-use task or command workflow finishes.
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
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
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
                  <span>Task Errors & Failures</span>
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

        {/* 3. SMART FOCUS & VISION PROTECTION (DND) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Smart Focus & Vision Protection</h3>
                <p className="text-[11px] text-slate-400">Silence popups to prevent obscuring computer vision screenshot OCR</p>
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
                  Suppress all audio and popup alerts. Notifications are still collected in the notification center.
                </p>
              </div>
              {renderNotifToggle(notifSettings.doNotDisturb, (val) => updateNotifSetting('doNotDisturb', val))}
            </div>

            {/* Auto-Mute during Screen Control */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Auto-Mute during Autonomous Screen Control</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically suppress banners while the agent is taking screenshots to prevent popup toasts from obscuring clickable UI elements.
                </p>
              </div>
              {renderNotifToggle(notifSettings.autoMuteScreenControl, (val) =>
                updateNotifSetting('autoMuteScreenControl', val)
              )}
            </div>

            {/* Full-Screen App Suppression */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Full-Screen App Suppression
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Silence alerts when presentations, full-screen video, or gaming sessions are running in foreground.
                </p>
              </div>
              {renderNotifToggle(notifSettings.fullScreenSuppress, (val) =>
                updateNotifSetting('fullScreenSuppress', val)
              )}
            </div>
          </div>
        </div>

        {/* 4. REMOTE WEBHOOK & MOBILE CHANNELS */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Remote Webhook & Mobile Channels</h3>
                <p className="text-[11px] text-slate-400">Receive alerts on Telegram, Discord, Slack, or webhook endpoints</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
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

            {/* Daily Summary */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Daily Executive Activity Summary
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Receive an end-of-day summary banner of all agent tasks, success rate, and time saved.
                </p>
              </div>
              {renderNotifToggle(notifSettings.dailySummary, (val) =>
                updateNotifSetting('dailySummary', val)
              )}
            </div>
          </div>
        </div>

        {/* 5. LIVE NOTIFICATION DIAGNOSTIC HUD */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Notification Diagnostics & Live Test</h3>
                <p className="text-[11px] text-slate-400">Real-time status indicators and instant verification trigger</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Push Delivery</div>
              <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{notifSettings.desktopNotifications ? 'Desktop Active' : 'Disabled'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Audio Engine</div>
              <div className="text-xs font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{notifSettings.soundAlerts ? `Synth @ ${notifSettings.soundVolume}%` : 'Muted'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Vision Shield</div>
              <div className="text-xs font-bold text-blue-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{notifSettings.autoMuteScreenControl ? 'Screen Guard Armed' : 'Unprotected'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/40 text-xs font-semibold text-cyan-300 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Trigger Diagnostic Test Notification</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
