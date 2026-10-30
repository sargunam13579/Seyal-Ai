export interface SafetySettings {
  profile: 'zero_trust' | 'balanced' | 'developer';
  requireConfirmDelete: boolean;
  requireConfirmTerminal: boolean;
  blockPaymentGateways: boolean;
  preventSelfKill: boolean;
  credentialProtection: boolean;
  maskApiKeys: boolean;
  maskCreditCards: boolean;
  maskPasswords: boolean;
  confirmationTimeoutSec: number;
  blacklistPaths: string[];
  safeWorkspaces: string[];
  blockedApplications: string[];
}

export const defaultSafetySettings: SafetySettings = {
  profile: 'balanced',
  requireConfirmDelete: true,
  requireConfirmTerminal: true,
  blockPaymentGateways: true,
  preventSelfKill: true,
  credentialProtection: true,
  maskApiKeys: true,
  maskCreditCards: true,
  maskPasswords: true,
  confirmationTimeoutSec: 30,
  blacklistPaths: ['C:\\Windows\\System32', 'C:\\Program Files', 'C:\\Windows\\SysWOW64'],
  safeWorkspaces: ['D:\\projects', 'C:\\Users\\Public\\Workspace'],
  blockedApplications: ['Bitwarden', '1Password', 'KeePass', 'Personal Banking Tab'],
};

export const BLACKLIST_PRESETS = [
  'C:\\Windows\\System32',
  'C:\\Program Files',
  'C:\\Windows\\Registry',
  'C:\\Users\\%USERNAME%\\AppData\\Roaming',
];

export const BLOCKED_APP_PRESETS = [
  'Bitwarden',
  '1Password',
  'KeePass',
  'WhatsApp Desktop',
  'Signal',
];
