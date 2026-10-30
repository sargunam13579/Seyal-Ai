import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useSeyalAi } from '../../../context/SeyalAiContext';
import { api } from '../../../services/api';
import {
  defaultNotifSettings,
  playChimePreset,
  MasterSoundCard,
  BannerDisplayCard,
  EventChannelsCard,
  QuietHoursCard,
  WebhooksMobileCard,
  NotificationAuditLogCard,
} from './notifications';
import type { NotificationSettings, NotificationHistoryItem } from './notifications';

export type { NotificationSettings };

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
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookStatusText, setWebhookStatusText] = useState<string | null>(null);
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
        detail: 'Terminal, Filesystem, and System Control tool grants active.',
        timestamp: '15m ago',
        status: 'success',
      },
    ];
  });

  // Keep history synced with recent workspace activities
  useEffect(() => {
    if (activities && activities.length > 0) {
      const latest = activities.slice(0, 5).map((act) => ({
        id: act.id,
        title: act.title,
        detail: act.detail,
        timestamp: new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: (act.status === 'success' ? 'success' : act.status === 'error' ? 'error' : 'info') as any,
      }));
      setHistoryItems(latest);
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

  const handleRequestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPerm(perm);
      } catch (e) {
        console.error('Error requesting notification permission', e);
      }
    }
  };

  const handleSendTestNotification = () => {
    // 1. Play auditory chime synthesizer
    if (notifSettings.soundAlerts && !notifSettings.doNotDisturb) {
      playChimePreset(notifSettings.soundPreset, (notifSettings.soundVolume || 80) / 100);
    }

    // 2. Fire native desktop notification if granted
    if (
      notifSettings.desktopNotifications &&
      !notifSettings.doNotDisturb &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('⚡ Seyal AI Sovereign Alert', {
          body: `Autonomous agent test alert triggered (${notifSettings.soundPreset} theme active).`,
          icon: '/app-logo.png',
        });
      } catch (e) {
        console.warn('Native desktop notification failed:', e);
      }
    }

    // 3. Show in-app live test toast
    setShowTestToast(true);
    if (testToastTimerRef.current) clearTimeout(testToastTimerRef.current);
    testToastTimerRef.current = setTimeout(() => {
      setShowTestToast(false);
    }, (notifSettings.toastDurationSeconds || 5) * 1000);
  };

  const handleTestWebhook = async () => {
    const url = webhookInput.trim();
    if (!url) {
      setWebhookStatusText('Please enter a webhook URL first.');
      return;
    }
    setIsTestingWebhook(true);
    setWebhookStatusText('Dispatching test webhook payload...');
    try {
      const res = await api.testWebhook(url);
      if (res.success) {
        setWebhookStatusText(`✅ Delivered! HTTP ${res.statusCode} (${res.latencyMs}ms)`);
      } else {
        setWebhookStatusText(`❌ Delivery failed: ${res.error || res.message}`);
      }
    } catch (e: any) {
      setWebhookStatusText(`❌ Error: ${e.message}`);
    } finally {
      setIsTestingWebhook(false);
      setTimeout(() => setWebhookStatusText(null), 5000);
    }
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
    localStorage.removeItem('seyal_notif_history');
  };

  const handleRestoreDefaults = () => {
    setNotifSettings(defaultNotifSettings);
    localStorage.removeItem('seyal_notification_config');
    setWebhookInput('');
  };

  const renderNotifToggle = (checked: boolean, onChange: (val: boolean) => void) => (
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
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Notifications & System Alert Soundscapes</span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditory earcon chimes, desktop toast banners, remote webhook relays, and focus shields
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 bg-slate-900/60 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Restore default notification preferences"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Defaults
          </button>

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

        {/* 1. Master Controls & Auditory Sound Themes */}
        <MasterSoundCard
          notifSettings={notifSettings}
          updateNotifSetting={updateNotifSetting}
          browserPerm={browserPerm}
          onRequestDesktopPermission={handleRequestDesktopPermission}
          onPlayPreset={(presetId, vol) => playChimePreset(presetId, vol)}
          renderNotifToggle={renderNotifToggle}
        />

        {/* 2. Banner Position & Display Cadence */}
        <BannerDisplayCard
          notifSettings={notifSettings}
          updateNotifSetting={updateNotifSetting}
        />

        {/* 3. Task-Specific Event Triggers */}
        <EventChannelsCard
          notifSettings={notifSettings}
          updateNotifSetting={updateNotifSetting}
          renderNotifToggle={renderNotifToggle}
        />

        {/* 4. Smart Focus, Vision Shield & Quiet Hours */}
        <QuietHoursCard
          notifSettings={notifSettings}
          updateNotifSetting={updateNotifSetting}
          renderNotifToggle={renderNotifToggle}
        />

        {/* 5. Remote Webhook & Mobile Channels */}
        <WebhooksMobileCard
          notifSettings={notifSettings}
          updateNotifSetting={updateNotifSetting}
          webhookInput={webhookInput}
          setWebhookInput={setWebhookInput}
          webhookSaved={webhookSaved}
          setWebhookSaved={setWebhookSaved}
          isTestingWebhook={isTestingWebhook}
          onTestWebhook={handleTestWebhook}
          webhookStatusText={webhookStatusText}
          renderNotifToggle={renderNotifToggle}
        />

        {/* 6. Recent Notification History Feed */}
        <NotificationAuditLogCard
          historyItems={historyItems}
          onClearHistory={handleClearHistory}
        />
      </div>
    </div>
  );
};

export default NotificationsTab;
