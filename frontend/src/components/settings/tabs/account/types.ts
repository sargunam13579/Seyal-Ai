export interface AvatarPreset {
  id: string;
  label: string;
  bg: string;
  icon: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'cyan', label: 'Cyber Operator', bg: 'from-cyan-500 to-blue-600', icon: '⚡' },
  { id: 'violet', label: 'Cosmic Architect', bg: 'from-purple-500 to-indigo-600', icon: '🪐' },
  { id: 'emerald', label: 'Neural Explorer', bg: 'from-emerald-500 to-teal-600', icon: '🌿' },
  { id: 'amber', label: 'Core Sentinel', bg: 'from-amber-500 to-orange-600', icon: '🛡️' },
  { id: 'rose', label: 'Digital Visionary', bg: 'from-rose-500 to-pink-600', icon: '🌸' },
  { id: 'slate', label: 'Stealth Admin', bg: 'from-slate-700 to-slate-900', icon: '💻' },
];

export interface LanguageOption {
  id: string;
  label: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { id: 'Tamil', label: 'Tamil (தமிழ்)' },
  { id: 'English', label: 'English' },
  { id: 'Tanglish', label: 'Tanglish' },
  { id: 'Hindi', label: 'Hindi (हिन्दी)' },
  { id: 'Telugu', label: 'Telugu (తెలుగు)' },
  { id: 'Malayalam', label: 'Malayalam (മലയാളം)' },
];
