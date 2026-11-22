import { useCallback, useEffect, useState } from 'react';
import { AppShell, type NavSection } from '@/components/layout/AppShell';
import { ClosetView } from '@/features/closet/ClosetView';
import { useClosetStore } from '@/features/closet/closetStore';
import { ColorView } from '@/features/color/ColorView';
import { FittingRoom } from '@/features/fitting/FittingRoom';
import { OnboardingDialog } from '@/features/onboarding/OnboardingDialog';
import { OutfitsView } from '@/features/outfits/OutfitsView';
import { PrivacyView } from '@/features/privacy/PrivacyView';
import { MemoryVaultPanel } from '@/features/vault/MemoryVaultPanel';
import { VaultGate } from '@/features/vault/VaultGate';
import { useVaultStore } from '@/features/vault/vaultStore';

const SECTION_ORDER: Readonly<Record<NavSection, number>> = {
  fitting: 0,
  closet: 1,
  outfits: 2,
  color: 3,
  memory: 4,
  privacy: 5,
};

type TransitionDirection = 'none' | 'forward' | 'backward';

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('fitting');
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('none');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const navigateToSection = useCallback((next: NavSection) => {
    setActiveSection((prev) => {
      if (prev === next) return prev;
      setTransitionDirection(SECTION_ORDER[next] >= SECTION_ORDER[prev] ? 'forward' : 'backward');
      return next;
    });
  }, []);

  const vaultStatus = useVaultStore((s) => s.status);
  const vaultMeta = useVaultStore((s) => s.meta);
  const pendingRecoveryKey = useVaultStore((s) => s.pendingRecoveryKey);
  const bootstrap = useVaultStore((s) => s.bootstrap);
  const lock = useVaultStore((s) => s.lock);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Bloqueo automático por inactividad cuando la bóveda está cifrada y desbloqueada (T3.3).
  useEffect(() => {
    if (vaultStatus !== 'unlocked') {
      return;
    }
    const timeoutMs = Math.max(1, vaultMeta?.autoLockMinutes ?? 15) * 60_000;
    let timerId = window.setTimeout(() => lock(), timeoutMs);

    const resetTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => lock(), timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    for (const evt of events) {
      window.addEventListener(evt, resetTimer, { passive: true });
    }

    return () => {
      window.clearTimeout(timerId);
      for (const evt of events) {
        window.removeEventListener(evt, resetTimer);
      }
    };
  }, [lock, vaultMeta?.autoLockMinutes, vaultStatus]);

  if (vaultStatus === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-muted">
        Inicializando almacenamiento local...
      </div>
    );
  }

  if (vaultStatus === 'uninitialized' || vaultStatus === 'locked' || pendingRecoveryKey !== null) {
    return (
      <div className="min-h-dvh bg-bg text-ink">
        <VaultGate />
      </div>
    );
  }

  const openGarmentInCloset = (garmentId: string) => {
    useClosetStore.getState().selectGarment(garmentId);
    navigateToSection('closet');
  };

  const sectionAnimClass =
    transitionDirection === 'forward'
      ? 'luca-section-enter-forward'
      : transitionDirection === 'backward'
        ? 'luca-section-enter-backward'
        : '';

  return (
    <AppShell
      activeSection={activeSection}
      onSelectSection={navigateToSection}
      vaultStatus={vaultStatus}
      onLockVault={lock}
      onOpenOnboarding={() => setOnboardingOpen(true)}
    >
      <div
        key={activeSection}
        data-section-transition={transitionDirection}
        className={`w-full ${activeSection === 'color' ? 'flex flex-1 flex-col' : ''} ${sectionAnimClass}`}
      >
        {activeSection === 'fitting' && (
          <FittingRoom onOpenCloset={() => navigateToSection('closet')} />
        )}
        {activeSection === 'closet' && (
          <ClosetView onOpenInFitting={() => navigateToSection('fitting')} />
        )}
        {activeSection === 'outfits' && (
          <OutfitsView
            onOpenGarmentInCloset={openGarmentInCloset}
            onOpenCloset={() => navigateToSection('closet')}
          />
        )}
        {activeSection === 'color' && (
          <ColorView onOpenGarmentInCloset={openGarmentInCloset} />
        )}
        {activeSection === 'memory' && <MemoryVaultPanel />}
        {activeSection === 'privacy' && (
          <PrivacyView
            onBack={() => navigateToSection('fitting')}
            onOpenMemory={() => navigateToSection('memory')}
          />
        )}
      </div>

      <OnboardingDialog
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onFinishToSection={(section) => navigateToSection(section)}
      />
    </AppShell>
  );
}

export default App;
