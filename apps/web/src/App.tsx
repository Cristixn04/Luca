import { useEffect, useState } from 'react';
import { AppShell, type NavSection } from '@/components/layout/AppShell';
import { ClosetView } from '@/features/closet/ClosetView';
import { useClosetStore } from '@/features/closet/closetStore';
import { ColorView } from '@/features/color/ColorView';
import { FittingRoom } from '@/features/fitting/FittingRoom';
import { OutfitsView } from '@/features/outfits/OutfitsView';
import { MemoryVaultPanel } from '@/features/vault/MemoryVaultPanel';
import { VaultGate } from '@/features/vault/VaultGate';
import { useVaultStore } from '@/features/vault/vaultStore';

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('fitting');

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
    setActiveSection('closet');
  };

  return (
    <AppShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      vaultStatus={vaultStatus}
      onLockVault={lock}
    >
      {activeSection === 'fitting' && <FittingRoom />}
      {activeSection === 'closet' && (
        <ClosetView onOpenInFitting={() => setActiveSection('fitting')} />
      )}
      {activeSection === 'outfits' && (
        <OutfitsView onOpenGarmentInCloset={openGarmentInCloset} />
      )}
      {activeSection === 'color' && (
        <ColorView onOpenGarmentInCloset={openGarmentInCloset} />
      )}
      {activeSection === 'memory' && <MemoryVaultPanel />}
    </AppShell>
  );
}

export default App;
