import { useId, useState, type ReactNode } from 'react';
import {
  Brain,
  Layers,
  Lock,
  Menu,
  Palette,
  Ruler,
  ShieldAlert,
  Shirt,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { ThemeToggle } from '@/design-system/components/ThemeToggle';
import { cn } from '@/design-system/utils';
import type { UiVaultStatus } from '@/features/vault/vaultStore';

export type NavSection = 'fitting' | 'closet' | 'outfits' | 'color' | 'memory';

export interface NavItem {
  readonly id: NavSection;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'fitting', label: 'Probador', icon: Ruler },
  { id: 'closet', label: 'Clóset', icon: Shirt },
  { id: 'outfits', label: 'Outfits', icon: Layers },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'memory', label: 'Memoria', icon: Brain },
] as const;

export interface AppShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  vaultStatus?: UiVaultStatus;
  onLockVault?: () => void;
  children: ReactNode;
}

export function AppShell({
  activeSection,
  onSelectSection,
  vaultStatus,
  onLockVault,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavId = useId();

  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
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
            <Badge variant="accent">v0.5</Badge>
          </div>

          <nav aria-label="Navegación principal" className="hidden md:block">
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
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {vaultStatus === 'unlocked' && onLockVault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLockVault}
                aria-label="Bloquear bóveda"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Bloquear</span>
              </Button>
            )}
            <Badge aria-label="Idioma actual: Español">ES</Badge>
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls={mobileNavId}
              aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
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
            aria-label="Navegación móvil"
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
                      <span>{item.label}</span>
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
          className="border-b border-border bg-surface px-4 py-2 text-xs text-muted"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 sm:px-2">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#E0A526]" aria-hidden="true" />
            <span>
              Modo sin cifrado: tus datos se guardan solo en este dispositivo, pero sin contraseña.
            </span>
          </div>
        </div>
      )}

      <main id="contenido-principal" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:px-6">
          <span>Luca · Datos cifrados solo en tu dispositivo</span>
          <span className="tabular-nums">Luca v0.5 · Fotos cifradas y API sin estado</span>
        </div>
      </footer>
    </div>
  );
}
