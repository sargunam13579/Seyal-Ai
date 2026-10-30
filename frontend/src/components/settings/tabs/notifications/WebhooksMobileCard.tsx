import React from 'react';
import { Send, Smartphone, Check, Radio } from 'lucide-react';
import type { NotificationSettings } from './types';

interface WebhooksMobileCardProps {
  notifSettings: NotificationSettings;
  updateNotifSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  webhookInput: string;
  setWebhookInput: (v: string) => void;
  webhookSaved: boolean;
  setWebhookSaved: (v: boolean) => void;
  isTestingWebhook: boolean;
  onTestWebhook: () => void;
  webhookStatusText: string | null;
  renderNotifToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const WebhooksMobileCard: React.FC<WebhooksMobileCardProps> = ({
  notifSettings,
  updateNotifSetting,
  webhookInput,
  setWebhookInput,
  webhookSaved,
  setWebhookSaved,
  isTestingWebhook,
  onTestWebhook,
  webhookStatusText,
  renderNotifToggle,
}) => {
  return (
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
            <div className="pt-2 border-t border-slate-800/60 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
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
                <button
                  type="button"
                  disabled={isTestingWebhook || !webhookInput.trim()}
                  onClick={onTestWebhook}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-medium cursor-pointer transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Radio className="w-3.5 h-3.5 text-purple-300" />
                  <span>{isTestingWebhook ? 'Testing...' : 'Test Webhook'}</span>
                </button>
              </div>
              {webhookStatusText && (
                <div className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300">
                  {webhookStatusText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
