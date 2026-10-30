export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  gender: 'Female' | 'Male';
  locale: string;
  category: 'global' | 'tamil' | 'indian';
  gradientClass: string;
  samplePhrase: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'en-US-AvaMultilingualNeural',
    name: 'Breeze',
    description: 'Animated & earnest — Universal Multilingual Female',
    gender: 'Female',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#5468ff] via-[#8fa5ff] to-[#ffffff]',
    samplePhrase: 'Hello! I am Breeze. Ready to assist you with tasks, code, and automations.',
  },
  {
    id: 'en-US-AndrewMultilingualNeural',
    name: 'Andrew',
    description: 'Polite & warm — Universal Multilingual Male',
    gender: 'Male',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#3b82f6] via-[#6366f1] to-[#cbd5e1]',
    samplePhrase: 'Greetings! I am Andrew, your desktop copilot. How can I help you today?',
  },
  {
    id: 'en-US-EmmaMultilingualNeural',
    name: 'Emma',
    description: 'Soft & thoughtful — Universal Multilingual Female',
    gender: 'Female',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#f472b6] via-[#c084fc] to-[#fdf2f8]',
    samplePhrase: 'Hi there! I am Emma. Looking forward to making your workflow smooth and effortless.',
  },
  {
    id: 'en-US-BrianMultilingualNeural',
    name: 'Brian',
    description: 'Crisp & expressive — Universal Multilingual Male',
    gender: 'Male',
    locale: 'Universal (40+ Languages)',
    category: 'global',
    gradientClass: 'from-[#14b8a6] via-[#0284c7] to-[#e2e8f0]',
    samplePhrase: 'Hello! Brian here. Fast, concise, and focused on getting work done.',
  },
  {
    id: 'ta-IN-PallaviNeural',
    name: 'Pallavi',
    description: 'Natural & sweet — Tamil Master Neural Female',
    gender: 'Female',
    locale: 'Tamil (India)',
    category: 'tamil',
    gradientClass: 'from-[#10b981] via-[#06b6d4] to-[#c7d2fe]',
    samplePhrase: 'வணக்கம்! நான் பல்லவி. நீங்கள் கேட்கும் கேள்விகளுக்கு தமிழில் சரளமாக பதிலளிக்க தயாராக இருக்கிறேன்.',
  },
  {
    id: 'ta-IN-ValluvarNeural',
    name: 'Valluvar',
    description: 'Traditional & deep — Tamil Master Neural Male',
    gender: 'Male',
    locale: 'Tamil (India)',
    category: 'tamil',
    gradientClass: 'from-[#64748b] via-[#3b82f6] to-[#e2e8f0]',
    samplePhrase: 'வணக்கம் நண்பரே! நான் வள்ளுவர். உங்கள் பணிகளையும் கணினி இயக்கங்களையும் உடனடி கவனத்துடன் செய்து முடிப்போம்.',
  },
  {
    id: 'en-IN-NeerjaNeural',
    name: 'Neerja',
    description: 'Warm & conversational — Indian English Female',
    gender: 'Female',
    locale: 'Indian English',
    category: 'indian',
    gradientClass: 'from-[#ec4899] via-[#8b5cf6] to-[#fed7aa]',
    samplePhrase: 'Hello! I am Neerja. Proudly tuned for natural Indian English and conversational flow.',
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat',
    description: 'Articulate & clear — Indian English Male',
    gender: 'Male',
    locale: 'Indian English',
    category: 'indian',
    gradientClass: 'from-[#f97316] via-[#eab308] to-[#fef08a]',
    samplePhrase: 'Hello! Prabhat here. Clear, professional, and ready for all your system operations.',
  },
];

export const SPEED_PRESETS = [
  { label: '🧘 Relaxed', value: 0.80 },
  { label: '🌿 Natural Human', value: 0.88 },
  { label: '⚡ Standard', value: 1.00 },
  { label: '🚀 Fast Coder', value: 1.15 },
];
