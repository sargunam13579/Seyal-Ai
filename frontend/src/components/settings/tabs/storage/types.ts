export interface StorageSettings {
  retentionDays: number;
  autoCleanEnabled: boolean;
  maxCacheLimitMb: number;
  compressVectorDb: boolean;
}

export const defaultStorageSettings: StorageSettings = {
  retentionDays: 30,
  autoCleanEnabled: true,
  maxCacheLimitMb: 500,
  compressVectorDb: true,
};
