export interface SecuritySettings {
  pinLockEnabled: boolean;
  pinCode: string;
  biometricsEnabled: boolean;
  autoLockMinutes: number;
  localVaultEncrypted: boolean;
  clearClipboardOnLock: boolean;
  antiBruteForceLockout: boolean;
  maxFailedAttempts: number;
  recoveryKey: string;
}

export const defaultSecuritySettings: SecuritySettings = {
  pinLockEnabled: false,
  pinCode: '1234',
  biometricsEnabled: false,
  autoLockMinutes: 15,
  localVaultEncrypted: true,
  clearClipboardOnLock: true,
  antiBruteForceLockout: true,
  maxFailedAttempts: 5,
  recoveryKey: 'seyal-94f2-8a1c-3b7e-e5d0',
};
