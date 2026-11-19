import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyColorScheme,
  getResolvedScheme,
  getStoredScheme,
  subscribeColorSchemeSync,
  toggleColorScheme,
} from '../theme';

function mockSystemDark(isDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? isDark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Design System · Control de tema claro/oscuro (T0.4)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
    mockSystemDark(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sigue al sistema por defecto cuando no hay valor almacenado', () => {
    expect(getStoredScheme()).toBeNull();
    expect(getResolvedScheme()).toBe('light');

    mockSystemDark(true);
    expect(getResolvedScheme()).toBe('dark');
  });

  it('guarda la sobrescritura cuando difiere del sistema y la elimina al volver al esquema del sistema', () => {
    mockSystemDark(false);

    // 1. Alterna a oscuro (difiere de light) -> guarda "dark"
    const first = toggleColorScheme();
    expect(first).toEqual({ stored: 'dark', resolved: 'dark' });
    expect(window.localStorage.getItem('color-scheme')).toBe('dark');
    expect(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content).toBe(
      'dark',
    );

    // 2. Alterna de vuelta a claro (coincide con el sistema) -> borra la clave y vuelve a "light dark"
    const second = toggleColorScheme();
    expect(second).toEqual({ stored: null, resolved: 'light' });
    expect(window.localStorage.getItem('color-scheme')).toBeNull();
    expect(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content).toBe(
      'light dark',
    );
  });

  it('aplica el tema en sesión aunque localStorage lance error', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    const result = toggleColorScheme();
    expect(result.resolved).toBe('dark');
    expect(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content).toBe(
      'dark',
    );
  });

  it('sincroniza cambios provenientes de otra pestaña mediante el evento storage', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeColorSchemeSync(onChange);

    window.localStorage.setItem('color-scheme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'color-scheme', newValue: 'dark' }));

    expect(onChange).toHaveBeenCalledWith('dark');
    expect(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content).toBe(
      'dark',
    );

    applyColorScheme(null);
    expect(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content).toBe(
      'light dark',
    );

    unsubscribe();
  });
});
