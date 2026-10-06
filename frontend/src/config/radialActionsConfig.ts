import {
  Mic,
  Camera,
  Monitor,
  FolderOpen,
  Cpu,
  MessageSquare,
  Power,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface RadialActionDefinition {
  id: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
  border: string;
  text: string;
  glow: string;
  badge: string;
}

export const RADIAL_ACTIONS_CATALOG: Record<string, RadialActionDefinition> = {
  voice: {
    id: 'voice',
    label: 'Live Voice',
    sublabel: 'Mic Toggle',
    icon: Mic,
    color: 'from-cyan-500/30 to-blue-600/40',
    border: 'border-cyan-400',
    text: 'text-cyan-300',
    glow: 'shadow-[0_0_25px_rgba(34,211,238,0.7)]',
    badge: 'bg-cyan-950/90 border-cyan-400/60 text-cyan-300',
  },
  camera: {
    id: 'camera',
    label: 'Vision Snap',
    sublabel: 'Screenshot',
    icon: Camera,
    color: 'from-emerald-500/30 to-teal-600/40',
    border: 'border-emerald-400',
    text: 'text-emerald-300',
    glow: 'shadow-[0_0_25px_rgba(52,211,153,0.7)]',
    badge: 'bg-emerald-950/90 border-emerald-400/60 text-emerald-300',
  },
  computer_use: {
    id: 'computer_use',
    label: 'Agent Task',
    sublabel: 'Computer Use',
    icon: Monitor,
    color: 'from-blue-500/30 to-indigo-600/40',
    border: 'border-blue-400',
    text: 'text-blue-300',
    glow: 'shadow-[0_0_25px_rgba(96,165,250,0.7)]',
    badge: 'bg-blue-950/90 border-blue-400/60 text-blue-300',
  },
  files: {
    id: 'files',
    label: 'Files OS',
    sublabel: 'Explorer',
    icon: FolderOpen,
    color: 'from-amber-500/30 to-orange-600/40',
    border: 'border-amber-400',
    text: 'text-amber-300',
    glow: 'shadow-[0_0_25px_rgba(251,191,36,0.7)]',
    badge: 'bg-amber-950/90 border-amber-400/60 text-amber-300',
  },
  system: {
    id: 'system',
    label: 'Telemetry',
    sublabel: 'CPU / RAM',
    icon: Cpu,
    color: 'from-purple-500/30 to-violet-600/40',
    border: 'border-purple-400',
    text: 'text-purple-300',
    glow: 'shadow-[0_0_25px_rgba(192,132,252,0.7)]',
    badge: 'bg-purple-950/90 border-purple-400/60 text-purple-300',
  },
  chat: {
    id: 'chat',
    label: 'Directive',
    sublabel: 'Agent Chat',
    icon: MessageSquare,
    color: 'from-pink-500/30 to-rose-600/40',
    border: 'border-pink-400',
    text: 'text-pink-300',
    glow: 'shadow-[0_0_25px_rgba(244,114,182,0.7)]',
    badge: 'bg-pink-950/90 border-pink-400/60 text-pink-300',
  },
  kill_switch: {
    id: 'kill_switch',
    label: 'Kill Switch',
    sublabel: 'Emergency Stop',
    icon: Power,
    color: 'from-red-600/35 to-rose-700/45',
    border: 'border-red-500',
    text: 'text-red-300',
    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.85)]',
    badge: 'bg-red-950/90 border-red-500/60 text-red-300',
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    sublabel: 'Preferences',
    icon: Settings,
    color: 'from-teal-500/30 to-cyan-600/40',
    border: 'border-teal-400',
    text: 'text-teal-300',
    glow: 'shadow-[0_0_25px_rgba(45,212,191,0.7)]',
    badge: 'bg-teal-950/90 border-teal-400/60 text-teal-300',
  },
};

// Default chronological roll order: [0: Voice, 1: Camera, 2: Computer, 3: Files, 4: Telemetry, 5: Directive, 6: KillSwitch, 7: Settings]
export const DEFAULT_RADIAL_ORDER = [
  'voice',
  'camera',
  'computer_use',
  'files',
  'system',
  'chat',
  'kill_switch',
  'settings',
];

// Slot metadata around the circle (Clock position and settled angle)
export const RADIAL_SLOTS = [
  { index: 0, label: 'Slot 1: Top-Left', clock: '10:30', angle: 315 },
  { index: 1, label: 'Slot 2: Left', clock: '9:00', angle: 270 },
  { index: 2, label: 'Slot 3: Bottom-Left', clock: '7:30', angle: 225 },
  { index: 3, label: 'Slot 4: Bottom', clock: '6:00', angle: 180 },
  { index: 4, label: 'Slot 5: Bottom-Right', clock: '4:30', angle: 135 },
  { index: 5, label: 'Slot 6: Right', clock: '3:00', angle: 90 },
  { index: 6, label: 'Slot 7: Top-Right', clock: '1:30', angle: 45 },
  { index: 7, label: 'Slot 8: Top', clock: '12:00', angle: 0 },
];

const STORAGE_KEY = 'seyal_frequent_task_shortcuts_order';

export function loadSavedRadialOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 8) {
        // Validate all IDs exist in catalog
        const isValid = parsed.every((id) => id in RADIAL_ACTIONS_CATALOG);
        if (isValid) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_RADIAL_ORDER];
}

export function saveRadialOrder(order: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // ignore
  }
}
