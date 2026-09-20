/**
 * Languages configuration for Seyal AI Onboarding and User Profile.
 * Provides curated options for Mother Tongue and Known Languages (including Tanglish/Hinglish).
 */

export interface LanguageOption {
  id: string;
  name: string;
  nativeName?: string;
  isPopular?: boolean;
}

export const POPULAR_MOTHER_TONGUES: LanguageOption[] = [
  { id: 'Tamil', name: 'Tamil', nativeName: 'தமிழ்', isPopular: true },
  { id: 'English', name: 'English', nativeName: 'English', isPopular: true },
  { id: 'Malayalam', name: 'Malayalam', nativeName: 'മലയാളം', isPopular: true },
  { id: 'Telugu', name: 'Telugu', nativeName: 'తెలుగు', isPopular: true },
  { id: 'Hindi', name: 'Hindi', nativeName: 'हिन्दी', isPopular: true },
  { id: 'Kannada', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isPopular: true },
  { id: 'Bengali', name: 'Bengali', nativeName: 'বাংলা' },
  { id: 'Marathi', name: 'Marathi', nativeName: 'मराठी' },
  { id: 'Gujarati', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { id: 'Urdu', name: 'Urdu', nativeName: 'اردو' },
  { id: 'French', name: 'French', nativeName: 'Français' },
  { id: 'German', name: 'German', nativeName: 'Deutsch' },
  { id: 'Spanish', name: 'Spanish', nativeName: 'Español' },
  { id: 'Arabic', name: 'Arabic', nativeName: 'العربية' },
  { id: 'Japanese', name: 'Japanese', nativeName: '日本語' },
];

export const KNOWN_LANGUAGE_SUGGESTIONS: LanguageOption[] = [
  { id: 'Tamil', name: 'Tamil', nativeName: 'தமிழ்', isPopular: true },
  { id: 'English', name: 'English', nativeName: 'English', isPopular: true },
  { id: 'Tanglish', name: 'Tanglish', nativeName: 'Tamil + English (Mix)', isPopular: true },
  { id: 'Malayalam', name: 'Malayalam', nativeName: 'മലയാളം', isPopular: true },
  { id: 'Telugu', name: 'Telugu', nativeName: 'తెలుగు', isPopular: true },
  { id: 'Hindi', name: 'Hindi', nativeName: 'हिन्दी', isPopular: true },
  { id: 'Kannada', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { id: 'Hinglish', name: 'Hinglish', nativeName: 'Hindi + English (Mix)' },
  { id: 'French', name: 'French', nativeName: 'Français' },
  { id: 'German', name: 'German', nativeName: 'Deutsch' },
  { id: 'Spanish', name: 'Spanish', nativeName: 'Español' },
];
