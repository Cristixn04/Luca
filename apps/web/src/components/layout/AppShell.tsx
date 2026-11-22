import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Brain,
  Compass,
  Layers,
  Lock,
  Menu,
  Palette,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';
import { cn } from '@/design-system/utils';
import { useFittingStore } from '@/features/fitting/store';
import type { UiVaultStatus } from '@/features/vault/vaultStore';
import { useI18nStore, useT } from '@/i18n/i18nStore';
import { InteractiveStageBackground } from './InteractiveStageBackground';

export type NavSection = 'fitting' | 'closet' | 'outfits' | 'color' | 'memory' | 'privacy';

export interface NavItem {
  readonly id: Exclude<NavSection, 'privacy'>;
  readonly icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'fitting', icon: Ruler },
  { id: 'closet', icon: Shirt },
  { id: 'outfits', icon: Layers },
  { id: 'color', icon: Palette },
  { id: 'memory', icon: Brain },
] as const;

export interface AppShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  vaultStatus?: UiVaultStatus;
  onLockVault?: () => void;
  onOpenOnboarding?: () => void;
  children: ReactNode;
}

export function AppShell({
  activeSection,
  onSelectSection,
  vaultStatus,
  onLockVault,
  onOpenOnboarding,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavId = useId();
  const locale = useI18nStore((s) => s.locale);
  const toggleLocale = useI18nStore((s) => s.toggleLocale);
  const t = useT();

  const unit = useFittingStore((s) => s.unit);
  const setUnit = useFittingStore((s) => s.setUnit);

  const navListRef = useRef<HTMLUListElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const syncIndicator = useCallback(() => {
    const activeLink = linkRefs.current[activeSection];
    const listEl = navListRef.current;
    if (!activeLink || !listEl) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const left = activeLink.offsetLeft;
    const width = activeLink.offsetWidth;
    if (width <= 0) {
      return;
    }
    setIndicator({ left, width, visible: true });
  }, [activeSection]);

  useLayoutEffect(() => {
    syncIndicator();
  }, [syncIndicator, locale]);

  useEffect(() => {
    const handleResize = () => syncIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [syncIndicator]);

  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    setMobileMenuOpen(false);
  };

  const isFullBleedSection =
    activeSection === 'outfits' ||
    activeSection === 'fitting' ||
    activeSection === 'color' ||
    activeSection === 'memory';

  return (
    <div className="relative flex min-h-dvh flex-col bg-transparent text-ink">
      <InteractiveStageBackground />

      <a href="#contenido-principal" className="skip-link">
        {t.header.skipToMain}
      </a>

      {/* Barra de navegación superior flotante en vidrio líquido (diseño de interfaz base) */}
      <header className="sticky top-0 z-30 w-full bg-transparent px-4 pb-2 pt-3 sm:px-6 lg:px-10">
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3">
          {/* Marca Luca en píldora minimalista flotante */}
          <div className="flex items-center">
            <a
              href="#probador"
              onClick={(event) => {
                event.preventDefault();
                handleSelect('fitting');
              }}
              className="vf-glass inline-flex h-[46px] items-center rounded-full px-5 font-display text-base font-bold tracking-tight text-ink no-underline transition-transform duration-200 hover:scale-[1.02]"
            >
              Luca
            </a>
          </div>

          {/* Navegación central flotante estilo cápsula con indicador deslizante */}
          <div className="flex justify-center">
            <nav
              aria-label={t.header.mainNavAria}
              className="vf-glass relative hidden rounded-full p-[5px] md:inline-flex md:items-center"
            >
              <span
                aria-hidden="true"
                className="vf-nav-indicator"
                style={{
                  transform: `translate3d(${indicator.left}px, 0, 0)`,
                  width: `${indicator.width}px`,
                  opacity: indicator.visible ? 1 : 0,
                }}
              />
              <ul ref={navListRef} className="z-10 flex items-center gap-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <a
                        ref={(node) => {
                          linkRefs.current[item.id] = node;
                        }}
                        href={`#${item.id}`}
                        aria-current={isCurrent ? 'page' : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          handleSelect(item.id);
                        }}
                        className={cn(
                          'inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium no-underline transition-colors duration-300 lg:px-5',
                          isCurrent
                            ? 'text-[var(--vf-nav-active-ink)]'
                            : 'text-[var(--vf-nav-muted-ink)] hover:text-ink',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{t.nav[item.id]}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Controles utilitarios en cápsula flotante a la derecha */}
          <div className="vf-glass inline-flex h-[46px] items-center gap-1 rounded-full px-1.5">
            {vaultStatus === 'unlocked' && onLockVault && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLockVault}
                aria-label={t.header.lockAria}
                className="h-8 rounded-full px-2.5 text-xs"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t.header.lock}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Cambiar unidades (actual: ${unit})`}
              onClick={() => setUnit(unit === 'cm' ? 'in' : 'cm')}
              className="hidden h-8 rounded-full px-2.5 tabular-nums text-xs sm:inline-flex"
            >
              {unit}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t.header.switchLanguageAria}
              onClick={toggleLocale}
              className="h-8 rounded-full px-2.5 text-xs font-semibold"
            >
              {locale.toUpperCase()}
            </Button>
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls={mobileNavId}
              aria-label={mobileMenuOpen ? t.header.closeMenu : t.header.openMenu}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Navegación móvil desplegable en cápsula de vidrio */}
        {mobileMenuOpen && (
          <nav
            id={mobileNavId}
            aria-label={t.header.mobileNavAria}
            className="vf-glass mt-2.5 rounded-3xl p-2 md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        handleSelect(item.id);
                      }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm no-underline transition-colors duration-[var(--motion-fast)]',
                        isCurrent
                          ? 'bg-[var(--vf-nav-indicator-bg)] font-semibold text-[var(--vf-nav-active-ink)] shadow-xs'
                          : 'font-medium text-[var(--vf-nav-muted-ink)] hover:text-ink',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{t.nav[item.id]}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      {vaultStatus === 'plaintext' && (
        <div
          role="status"
          className="relative z-10 border-b border-[var(--glass-divider)] bg-[var(--glass-pill-bg)]/80 px-4 py-1.5 text-xs text-muted backdrop-blur-sm sm:px-6 lg:px-10"
        >
          <div className="flex w-full items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#E0A526]" aria-hidden="true" />
            <span>{t.header.plaintextWarning}</span>
          </div>
        </div>
      )}

      <main
        id="contenido-principal"
        className={cn(
          'relative z-10 w-full flex-1 overflow-x-clip',
          isFullBleedSection
            ? 'px-4 py-3 sm:px-6 sm:py-4 lg:px-10'
            : 'mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8',
          (activeSection === 'color' || activeSection === 'memory') && 'flex flex-col',
        )}
      >
        {children}
      </main>

      <footer className="relative z-10 border-t border-[var(--glass-divider)] bg-[var(--glass-pill-bg)] backdrop-blur-md">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-xs text-muted sm:px-6 lg:px-10">
          <span>{t.footer.localPromise}</span>
          <div className="flex flex-wrap items-center gap-3">
            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="inline-flex cursor-pointer items-center gap-1 text-muted hover:text-ink"
              >
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                {t.footer.onboardingLink}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelect('privacy')}
              className="inline-flex cursor-pointer items-center gap-1 text-muted hover:text-ink"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t.footer.privacyLink}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
