export interface GeneralSettings {
  // Desktop & System Behavior
  launchOnStartup: boolean;
  startMinimized: boolean;
  minimizeToTrayOnClose: boolean;
  alwaysOnTop: boolean;
  hardwareAcceleration: boolean;

  // Appearance
  theme: 'cyber-dark' | 'oled-black' | 'deep-slate';
  accentColor: 'cyan' | 'emerald' | 'violet' | 'amber';
  uiDensity: 'compact' | 'standard' | 'spacious';

  // Language & Regional
  language: 'en' | 'ta' | 'tanglish' | 'hi';
  timeFormat: '12h' | '24h';

  // Assistant Response Behavior
  responseVerbosity: 'concise' | 'balanced' | 'detailed';
  showThinkingSteps: boolean;
  soundChimeOnComplete: boolean;
}

export const defaultGeneralSettings: GeneralSettings = {
  launchOnStartup: false,
  startMinimized: false,
  minimizeToTrayOnClose: true,
  alwaysOnTop: false,
  hardwareAcceleration: true,
  theme: 'cyber-dark',
  accentColor: 'cyan',
  uiDensity: 'standard',
  language: 'en',
  timeFormat: '12h',
  responseVerbosity: 'concise',
  showThinkingSteps: true,
  soundChimeOnComplete: true,
};

export const PERSONA_PRESETS = [
  { name: 'Seyal AI', tag: 'Autonomous Multi-Agent (Default)', icon: '⚡' },
  { name: 'Seyal Prime', tag: 'Tactical High-Tech Assistant', icon: '🤖' },
  { name: 'Aria', tag: 'Friendly Everyday Companion', icon: '🌸' },
  { name: 'Friday', tag: 'Security & Automation Pro', icon: '🛡️' },
  { name: 'Nova', tag: 'Deep Thinking & Analysis', icon: '🪐' },
];

export interface HotkeyItem {
  id: string;
  name: string;
  description: string;
  defaultKeys: string[];
  keys: string[];
  category: 'global' | 'voice' | 'vision' | 'agent';
}

export const DEFAULT_SHORTCUTS: HotkeyItem[] = [
  {
    id: 'summon',
    name: 'Global Summon / Spotlight Overlay',
    description: 'Toggle floating Seyal agent overlay anywhere in Windows',
    defaultKeys: ['Alt', 'Space'],
    keys: ['Alt', 'Space'],
    category: 'global',
  },
  {
    id: 'voice_ptt',
    name: 'Push-To-Talk Voice Dictation',
    description: 'Activate local speech-to-text whisper listening while pressed',
    defaultKeys: ['Ctrl', 'Shift', 'V'],
    keys: ['Ctrl', 'Shift', 'V'],
    category: 'voice',
  },
  {
    id: 'screen_capture',
    name: 'Screen Vision Context Capture',
    description: 'Capture active window screenshot for vision understanding',
    defaultKeys: ['Ctrl', 'Shift', 'X'],
    keys: ['Ctrl', 'Shift', 'X'],
    category: 'vision',
  },
  {
    id: 'abort_agent',
    name: 'Emergency Action Kill-Switch',
    description: 'Immediately abort running tool calls, commands, and browser clicks',
    defaultKeys: ['Esc'],
    keys: ['Esc'],
    category: 'agent',
  },
  {
    id: 'new_chat',
    name: 'New Agent Session',
    description: 'Flush current chat context and start a brand-new workspace session',
    defaultKeys: ['Ctrl', 'N'],
    keys: ['Ctrl', 'N'],
    category: 'global',
  },
  {
    id: 'toggle_mini',
    name: 'Toggle Mini Float Bar',
    description: 'Switch between the full desktop window and compact float bar widget',
    defaultKeys: ['Alt', 'M'],
    keys: ['Alt', 'M'],
    category: 'global',
  },
];
