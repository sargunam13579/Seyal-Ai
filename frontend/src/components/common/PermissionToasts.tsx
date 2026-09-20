import React, { useState, useEffect } from 'react';
import { Mic, Bell, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api';

type PermissionStep = 'mic' | 'notification' | 'done';

export const PermissionToasts: React.FC = () => {
  const [step, setStep] = useState<PermissionStep | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Determine which popup needs to be shown based on persistent localStorage and session skip
    const checkPermissions = async () => {
      const micGranted = localStorage.getItem('seyal_mic_permission_granted') === 'true';
      const micSkipped = sessionStorage.getItem('seyal_mic_permission_skipped') === 'true';

      const notifGranted = localStorage.getItem('seyal_notif_permission_granted') === 'true';
      const notifSkipped = sessionStorage.getItem('seyal_notif_permission_skipped') === 'true';

      // Check native browser permissions if available
      let nativeMicGranted = false;
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        try {
          const micStatus = await navigator.permissions.query({ name: 'microphone' as any });
          if (micStatus.state === 'granted') {
            nativeMicGranted = true;
            localStorage.setItem('seyal_mic_permission_granted', 'true');
          }
        } catch {
          // Ignore permissions.query not supported for mic in some browsers
        }
      }

      let nativeNotifGranted = false;
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          nativeNotifGranted = true;
          localStorage.setItem('seyal_notif_permission_granted', 'true');
        }
      }

      // 1. If mic not granted and not skipped in this session, show mic popup
      if (!micGranted && !nativeMicGranted && !micSkipped) {
        setStep('mic');
        return;
      }

      // 2. If mic is resolved (or skipped), check if notification needs prompt
      if (!notifGranted && !nativeNotifGranted && !notifSkipped) {
        setStep('notification');
        return;
      }

      setStep('done');
    };

    // Slight delay so the app loads smoothly first
    const timer = setTimeout(checkPermissions, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleAllowMic = async () => {
    setIsRequesting(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop tracks immediately after granting
        stream.getTracks().forEach((track) => track.stop());
      }
      localStorage.setItem('seyal_mic_permission_granted', 'true');
      // Also grant on backend
      await api.grantPermission('microphone').catch((e) => console.warn('Backend mic grant notice:', e));
      await api.grantPermission('accessibility').catch(() => {});
    } catch (err) {
      console.warn('Microphone permission request error or denied:', err);
    } finally {
      setIsRequesting(false);
      // Next, check or transition to notification popup
      const notifGranted =
        localStorage.getItem('seyal_notif_permission_granted') === 'true' ||
        (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
      const notifSkipped = sessionStorage.getItem('seyal_notif_permission_skipped') === 'true';

      if (!notifGranted && !notifSkipped) {
        setStep('notification');
      } else {
        setStep('done');
      }
    }
  };

  const handleSkipMic = () => {
    sessionStorage.setItem('seyal_mic_permission_skipped', 'true');
    // After skip, check notification prompt
    const notifGranted =
      localStorage.getItem('seyal_notif_permission_granted') === 'true' ||
      (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
    const notifSkipped = sessionStorage.getItem('seyal_notif_permission_skipped') === 'true';

    if (!notifGranted && !notifSkipped) {
      setStep('notification');
    } else {
      setStep('done');
    }
  };

  const handleAllowNotification = async () => {
    setIsRequesting(true);
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          localStorage.setItem('seyal_notif_permission_granted', 'true');
        }
      } else {
        localStorage.setItem('seyal_notif_permission_granted', 'true');
      }
      // Also grant on backend
      await api.grantPermission('notifications').catch((e) => console.warn('Backend notification grant notice:', e));
    } catch (err) {
      console.warn('Notification permission request error:', err);
    } finally {
      setIsRequesting(false);
      setStep('done');
    }
  };

  const handleSkipNotification = () => {
    sessionStorage.setItem('seyal_notif_permission_skipped', 'true');
    setStep('done');
  };

  if (!step || step === 'done') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slideUp">
      {step === 'mic' && (
        <div className="bg-slate-900/95 border border-cyan-500/40 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl shadow-black/90 text-slate-100 flex flex-col gap-3 transition-all duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Mic className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Microphone Access
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </h4>
                <button
                  type="button"
                  onClick={handleSkipMic}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Allow microphone access so Seyal AI can listen and communicate with you through voice commands.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleSkipMic}
              className="px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={isRequesting}
              onClick={handleAllowMic}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-950/50 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isRequesting ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Allow</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'notification' && (
        <div className="bg-slate-900/95 border border-blue-500/40 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl shadow-black/90 text-slate-100 flex flex-col gap-3 transition-all duration-300 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Desktop Notifications
                </h4>
                <button
                  type="button"
                  onClick={handleSkipNotification}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Allow notifications to get alerts when Seyal AI completes tasks or needs your confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleSkipNotification}
              className="px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={isRequesting}
              onClick={handleAllowNotification}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-950/50 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isRequesting ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Allow</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
