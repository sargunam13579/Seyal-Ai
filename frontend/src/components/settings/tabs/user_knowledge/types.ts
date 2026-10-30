// Starter presets for Standing Rules
export const RULE_TEMPLATES = [
  {
    id: 'rule_terminal_guard',
    title: '🛡️ Destructive Terminal Guard',
    description: 'Always require explicit user confirmation before executing destructive commands (rm -rf, git reset --hard, DROP TABLE).',
    trigger_type: 'safety_hook',
  },
  {
    id: 'rule_desktop_cleanup',
    title: '🖥️ Desktop Clutter Sentinel',
    description: 'Alert me at 6:00 PM if my Windows desktop has accumulated more than 15 unorganized files.',
    trigger_type: 'background_watch',
  },
  {
    id: 'rule_deep_work_focus',
    title: '🔇 Deep Work Focus Hours',
    description: 'Suppress spoken voice responses and long notifications between 2:00 PM and 5:00 PM on weekdays.',
    trigger_type: 'scheduled_routine',
  },
  {
    id: 'rule_night_owl',
    title: '🌙 Night Owl Work Warning',
    description: 'Remind me to commit all pending code changes and conclude workspace tasks at 11:30 PM.',
    trigger_type: 'scheduled_routine',
  },
  {
    id: 'rule_concise_coder',
    title: '⚡ Code First, Zero Filler',
    description: 'In all coding queries, give clean executable TypeScript/Python code directly with minimal chat prologue.',
    trigger_type: 'prompt_directive',
  },
];

// Quick knowledge topic suggestions
export const KNOWLEDGE_SUGGESTIONS = [
  { key: 'primary_role', label: 'Work Role', placeholder: 'e.g. Senior Fullstack Developer' },
  { key: 'tech_stack', label: 'Tech Stack', placeholder: 'e.g. React, TypeScript, FastAPI, Electron' },
  { key: 'preferred_editor', label: 'Primary IDE', placeholder: 'e.g. VS Code / Antigravity IDE' },
  { key: 'location_city', label: 'City / Region', placeholder: 'e.g. Chennai, Tamil Nadu' },
  { key: 'github_username', label: 'GitHub Profile', placeholder: 'e.g. @sargunam13579' },
  { key: 'communication_lang', label: 'Preferred Language', placeholder: 'e.g. Tanglish & English' },
];
