export interface PersonalizationConfig {
  communicationTone: 'action' | 'executive' | 'copilot' | 'mentor';
  customInstructions: string;
  proactiveSuggestions: boolean;
  languageAutoSwitching: boolean;
  conciseCodeOnly: boolean;
}

export const defaultPersonalizationConfig: PersonalizationConfig = {
  communicationTone: 'action',
  customInstructions:
    'Prefer Tamil when speaking aloud, English when writing code. Always write modular Python & TypeScript. Prefer PowerShell syntax for Windows commands.',
  proactiveSuggestions: true,
  languageAutoSwitching: true,
  conciseCodeOnly: false,
};

export const TONE_PRESETS = [
  {
    id: 'action',
    name: 'Action-First Operator',
    tag: 'Direct & Rapid Execution (Default)',
    desc: 'Zero pleasantries, immediate execution, concise status updates.',
    icon: '⚡',
  },
  {
    id: 'executive',
    name: 'Executive Advisor',
    tag: 'Structured & Formal',
    desc: 'Polished briefings, bulleted action items, executive tone.',
    icon: '💼',
  },
  {
    id: 'copilot',
    name: 'Pair-Programmer & Co-Pilot',
    tag: 'Friendly Tech Collaborator',
    desc: 'Pragmatic coding companion, architectural insights.',
    icon: '🤝',
  },
  {
    id: 'mentor',
    name: 'Detailed Mentor',
    tag: 'Explanatory & Educational',
    desc: 'Step-by-step reasoning, helpful background context.',
    icon: '🎓',
  },
];

export const POPULAR_ALIAS_CHIPS = ['Seyal', 'Computer', 'Aria', 'Friday', 'Nova', 'Assistant'];
