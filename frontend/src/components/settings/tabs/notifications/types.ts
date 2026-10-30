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

export const defaultNotifSettings: NotificationSettings = {
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

export interface NotificationHistoryItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export const SOUND_PRESETS = [
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

export const playChimePreset = (presetId: string, vol = 0.8) => {
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
};
