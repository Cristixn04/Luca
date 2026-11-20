export interface StoragePersistenceInfo {
  readonly supported: boolean;
  readonly persisted: boolean;
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly usagePercent: number | null;
  readonly isIosNonStandalone: boolean;
  readonly backupReminderDue: boolean;
  readonly daysSinceBackup: number | null;
}

const MS_PER_DAY = 86_400_000;
export const DEFAULT_BACKUP_REMINDER_DAYS = 30;

export function detectIosNonStandalone(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  isStandalone?: boolean,
): boolean {
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);
  if (!isIos) {
    return false;
  }

  if (isStandalone !== undefined) {
    return !isStandalone;
  }

  const navStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  const mediaStandalone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  return !(navStandalone || mediaStandalone);
}

export function evaluateBackupReminder(
  lastBackupAt?: string,
  now: Date = new Date(),
  maxAgeDays = DEFAULT_BACKUP_REMINDER_DAYS,
): { due: boolean; daysSinceBackup: number | null } {
  if (!lastBackupAt) {
    return { due: true, daysSinceBackup: null };
  }

  const parsed = Date.parse(lastBackupAt);
  if (Number.isNaN(parsed)) {
    return { due: true, daysSinceBackup: null };
  }

  const days = Math.max(0, Math.floor((now.getTime() - parsed) / MS_PER_DAY));
  return {
    due: days >= maxAgeDays,
    daysSinceBackup: days,
  };
}

export async function getStoragePersistenceInfo(
  lastBackupAt?: string,
  now: Date = new Date(),
): Promise<StoragePersistenceInfo> {
  const reminder = evaluateBackupReminder(lastBackupAt, now);
  const isIosNonStandalone = detectIosNonStandalone();

  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage) {
    return {
      supported: false,
      persisted: false,
      usageBytes: null,
      quotaBytes: null,
      usagePercent: null,
      isIosNonStandalone,
      backupReminderDue: reminder.due,
      daysSinceBackup: reminder.daysSinceBackup,
    };
  }

  let persisted = false;
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  let usagePercent: number | null = null;

  try {
    if (typeof storage.persisted === 'function') {
      persisted = await storage.persisted();
    }
    if (typeof storage.estimate === 'function') {
      const estimate = await storage.estimate();
      usageBytes = estimate.usage ?? null;
      quotaBytes = estimate.quota ?? null;
      if (usageBytes !== null && quotaBytes !== null && quotaBytes > 0) {
        usagePercent = Number(((usageBytes / quotaBytes) * 100).toFixed(2));
      }
    }
  } catch {
    // Algunos contextos privados restringen StorageManager; degradamos sin fallar.
  }

  return {
    supported: true,
    persisted,
    usageBytes,
    quotaBytes,
    usagePercent,
    isIosNonStandalone,
    backupReminderDue: reminder.due,
    daysSinceBackup: reminder.daysSinceBackup,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage || typeof storage.persist !== 'function') {
    return false;
  }
  try {
    return await storage.persist();
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) {
    return 'No disponible';
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
