import { useId, useState, type ReactNode } from 'react';
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

  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-transparent text-ink">
      <InteractiveStageBackground />

      <a href="#contenido-principal" className="skip-link">
        {t.header.skipToMain}
      </a>

      <header className="relative z-10 border-b border-[var(--glass-divider)] bg-[var(--glass-pill-bg)] backdrop-blur-md">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <a
              href="#probador"
              onClick={(event) => {
                event.preventDefault();
                handleSelect('fitting');
              }}
              className="font-display text-xl font-bold tracking-tight text-ink no-underline"
            >
              Luca
            </a>
          </div>

          <nav aria-label={t.header.mainNavAria} className="hidden md:block">
            <ul className="flex items-center gap-1">
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
                        'inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm no-underline transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]',
                        isCurrent
                          ? 'border-b-2 border-accent font-semibold text-accent'
                          : 'font-medium text-muted hover:bg-bg hover:text-ink',
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

          <div className="flex items-center gap-1.5">
            {vaultStatus === 'unlocked' && onLockVault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLockVault}
                aria-label={t.header.lockAria}
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
              className="hidden sm:inline-flex tabular-nums text-xs"
            >
              {unit}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t.header.switchLanguageAria}
              onClick={toggleLocale}
              className="text-xs font-semibold"
            >
              {locale.toUpperCase()}
            </Button>
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls={mobileNavId}
              aria-label={mobileMenuOpen ? t.header.closeMenu : t.header.openMenu}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id={mobileNavId}
            aria-label={t.header.mobileNavAria}
            className="border-t border-border bg-surface px-4 py-2 md:hidden"
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
                        'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm no-underline transition-colors duration-[var(--motion-fast)]',
                        isCurrent
                          ? 'border-l-2 border-accent bg-bg font-semibold text-accent'
                          : 'font-medium text-muted hover:bg-bg hover:text-ink',
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
          'relative z-10 w-full flex-1',
          activeSection === 'outfits'
            ? 'px-4 py-4 sm:px-6 sm:py-5 lg:px-10'
            : 'mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8',
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
