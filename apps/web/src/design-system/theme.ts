export type ColorScheme = 'light' | 'dark';
export type StoredColorScheme = ColorScheme | null;

const STORAGE_KEY = 'color-scheme';

export function getStoredScheme(): StoredColorScheme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function getSystemScheme(): ColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getResolvedScheme(): ColorScheme {
  return getStoredScheme() ?? getSystemScheme();
}

export function applyColorScheme(stored: StoredColorScheme): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  const content = stored ?? 'light dark';
  if (meta) {
    meta.content = content;
  }
}

/**
 * Control de dos estados según la guía `dark-mode-toggle`:
 * - Selecciona el opuesto al esquema actualmente visible.
 * - Si difiere del sistema, se guarda literalmente ("light" o "dark").
 * - Si coincide con el sistema, se borra el valor guardado para volver a seguir al SO.
 */
export function toggleColorScheme(): { stored: StoredColorScheme; resolved: ColorScheme } {
  const currentRendered = getResolvedScheme();
  const target: ColorScheme = currentRendered === 'dark' ? 'light' : 'dark';
  const system = getSystemScheme();

  const nextStored: StoredColorScheme = target === system ? null : target;

  try {
    if (nextStored === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, nextStored);
    }
  } catch {
    // Aplica el tema en la sesión aunque el almacenamiento esté bloqueado.
  }

  applyColorScheme(nextStored);
  return { stored: nextStored, resolved: target };
}

export function subscribeColorSchemeSync(onChange: (resolved: ColorScheme) => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) {
      return;
    }
    const stored = getStoredScheme();
    applyColorScheme(stored);
    onChange(stored ?? getSystemScheme());
  };

  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}
