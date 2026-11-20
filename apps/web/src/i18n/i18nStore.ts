import { create } from 'zustand';

export type Locale = 'es' | 'en';

const LOCALE_KEY = 'luca-locale';

function readInitialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // Entornos sin localStorage
  }
  return 'es';
}

function applyDocumentLang(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export interface TranslationDictionary {
  readonly nav: {
    readonly fitting: string;
    readonly closet: string;
    readonly outfits: string;
    readonly color: string;
    readonly memory: string;
  };
  readonly header: {
    readonly skipToMain: string;
    readonly mainNavAria: string;
    readonly mobileNavAria: string;
    readonly lock: string;
    readonly lockAria: string;
    readonly switchLanguageAria: string;
    readonly openMenu: string;
    readonly closeMenu: string;
    readonly plaintextWarning: string;
  };
  readonly footer: {
    readonly localPromise: string;
    readonly privacyLink: string;
    readonly onboardingLink: string;
  };
  readonly headings: {
    readonly fitting: string;
    readonly closet: string;
    readonly outfits: string;
    readonly color: string;
    readonly memory: string;
    readonly privacy: string;
  };
}

export const TRANSLATIONS: Readonly<Record<Locale, TranslationDictionary>> = {
  es: {
    nav: {
      fitting: 'Probador',
      closet: 'Clóset',
      outfits: 'Outfits',
      color: 'Color',
      memory: 'Memoria',
    },
    header: {
      skipToMain: 'Saltar al contenido principal',
      mainNavAria: 'Navegación principal',
      mobileNavAria: 'Navegación móvil',
      lock: 'Bloquear',
      lockAria: 'Bloquear bóveda',
      switchLanguageAria: 'Cambiar idioma a inglés',
      openMenu: 'Abrir menú de navegación',
      closeMenu: 'Cerrar menú de navegación',
      plaintextWarning:
        'Modo sin cifrado: tus datos se guardan solo en este dispositivo, pero sin contraseña.',
    },
    footer: {
      localPromise: 'Luca · Datos guardados solo en tu dispositivo',
      privacyLink: 'Cómo se protegen tus datos',
      onboardingLink: 'Guía de inicio rápido',
    },
    headings: {
      fitting: 'Probador de calce',
      closet: 'Clóset local',
      outfits: 'Outfits',
      color: 'Colorimetría estacional',
      memory: 'Memoria y bóveda local',
      privacy: 'Cómo se protegen tus datos',
    },
  },
  en: {
    nav: {
      fitting: 'Fitting',
      closet: 'Closet',
      outfits: 'Outfits',
      color: 'Color',
      memory: 'Memory',
    },
    header: {
      skipToMain: 'Skip to main content',
      mainNavAria: 'Main navigation',
      mobileNavAria: 'Mobile navigation',
      lock: 'Lock',
      lockAria: 'Lock vault',
      switchLanguageAria: 'Switch language to Spanish',
      openMenu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
      plaintextWarning:
        'Unencrypted mode: your data stays on this device only, without a password.',
    },
    footer: {
      localPromise: 'Luca · Data stored on your device only',
      privacyLink: 'How your data is protected',
      onboardingLink: 'Quick start guide',
    },
    headings: {
      fitting: 'Fit room',
      closet: 'Local closet',
      outfits: 'Outfits',
      color: 'Seasonal color analysis',
      memory: 'Memory & local vault',
      privacy: 'How your data is protected',
    },
  },
};

export interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const initialLocale = readInitialLocale();
applyDocumentLang(initialLocale);

export const useI18nStore = create<I18nState>((set, get) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    try {
      window.localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // Ignora restricciones de almacenamiento
    }
    applyDocumentLang(locale);
    set({ locale });
  },
  toggleLocale: () => {
    const next: Locale = get().locale === 'es' ? 'en' : 'es';
    get().setLocale(next);
  },
}));

export function useT(): TranslationDictionary {
  const locale = useI18nStore((s) => s.locale);
  return TRANSLATIONS[locale];
}
