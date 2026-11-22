import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Archive,
  Download,
  HardDrive,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { TasteMemorySection } from '@/features/taste/TasteMemorySection';
import { useT } from '@/i18n/i18nStore';
import { formatBytes } from '@/infrastructure/storage/persistence';
import { MIN_PASSWORD_LENGTH } from '@/infrastructure/vault/vaultService';
import { useVaultStore } from './vaultStore';

export function MemoryVaultPanel() {
  const t = useT();
  const status = useVaultStore((s) => s.status);
  const meta = useVaultStore((s) => s.meta);
  const persistence = useVaultStore((s) => s.persistence);
  const eventCount = useVaultStore((s) => s.eventCount);
  const snapshotCount = useVaultStore((s) => s.snapshotCount);
  const busy = useVaultStore((s) => s.busy);

  const lock = useVaultStore((s) => s.lock);
  const changePassword = useVaultStore((s) => s.changePassword);
  const exportBackup = useVaultStore((s) => s.exportBackup);
  const importBackup = useVaultStore((s) => s.importBackup);
  const compactEventsBefore = useVaultStore((s) => s.compactEventsBefore);
  const requestPersistence = useVaultStore((s) => s.requestPersistence);
  const wipeAll = useVaultStore((s) => s.wipeAll);

  const [securityTab, setSecurityTab] = useState<'backup' | 'password'>('backup');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importCredential, setImportCredential] = useState('');
  const [importMethod, setImportMethod] = useState<'password' | 'recovery'>('password');

  const [compactMessage, setCompactMessage] = useState<string | null>(null);
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);

  const wipeDialogRef = useRef<HTMLDialogElement>(null);
  const wipeTitleId = useId();

  useEffect(() => {
    const dialog = wipeDialogRef.current;
    if (!dialog) return;
    if (wipeDialogOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    } else if (!wipeDialogOpen && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [wipeDialogOpen]);

  const isEncrypted = status === 'unlocked';

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage('Contraseña actualizada.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    }
  };

  const handleExport = async () => {
    setBackupStatus(null);
    setBackupError(null);
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `luca-respaldo-cifrado-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupStatus('Respaldo cifrado exportado.');
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : 'No se pudo exportar el respaldo.');
    }
  };

  const handleImport = async (event: FormEvent) => {
    event.preventDefault();
    setBackupStatus(null);
    setBackupError(null);
    try {
      const count = await importBackup(importJson, importCredential, importMethod);
      setImportJson('');
      setImportFileName(null);
      setImportCredential('');
      setBackupStatus(`Respaldo restaurado (${count} registros).`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : 'No se pudo importar el respaldo.');
    }
  };

  const handleCompact = async () => {
    const summary = await compactEventsBefore();
    setCompactMessage(
      summary.compactedEvents > 0
        ? `Compactados ${summary.compactedEvents} eventos en ${summary.updatedMonths.length} mes(es).`
        : 'Sin eventos pendientes.',
    );
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-3.5 xl:gap-4">
      {/* Encabezado compacto a ancho completo */}
      <section
        aria-labelledby="vault-heading"
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-1"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1
            id="vault-heading"
            className="font-display text-2xl font-normal tracking-[-0.025em] text-[var(--rw-ink)] sm:text-3xl"
          >
            {t.headings.memory}
          </h1>

          <span className="vf-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-ink">
            {isEncrypted ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                Cifrada · {meta?.autoLockMinutes ?? 15} min
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-[#E0A526]" aria-hidden="true" />
                Sin cifrado
              </>
            )}
          </span>

          {persistence?.isIosNonStandalone && (
            <span className="vf-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-[#E0A526]">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              iOS Safari: añade a pantalla de inicio
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEncrypted && (
            <>
              <button
                type="button"
                onClick={() => void handleExport()}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  persistence?.backupReminderDue
                    ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs hover:opacity-90'
                    : 'vf-glass text-ink hover:opacity-90'
                }`}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {persistence?.backupReminderDue ? 'Exportar respaldo ahora' : 'Exportar respaldo'}
              </button>

              <button
                type="button"
                onClick={lock}
                className="vf-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink transition-opacity hover:opacity-90"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Bloquear ahora
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setWipeDialogOpen(true)}
            className="vf-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#C2410C] transition-opacity hover:opacity-90"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Borrar todos los datos
          </button>
        </div>
      </section>

      {/* Bento principal a ancho y alto completos (sin scroll vertical en escritorio) */}
      <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-12 xl:gap-4">
        {/* COLUMNA IZQUIERDA (7 cols): Gustos aprendidos y preferencias explícitas */}
        <TasteMemorySection className="lg:col-span-7" />

        {/* COLUMNA DERECHA (5 cols): Almacenamiento local + Seguridad y respaldos */}
        <div className="flex min-h-0 flex-col gap-3.5 lg:col-span-5 xl:gap-4">
          {/* Panel superior derecho: Almacenamiento y eventos */}
          <section
            aria-label="Almacenamiento y registro local"
            className="vf-glass-drawer flex shrink-0 flex-col gap-3 rounded-[26px] p-4 xl:p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-divider)] pb-2.5">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-accent" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                  Almacenamiento local
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  persistence?.persisted
                    ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)]'
                    : 'bg-[var(--vf-chip-bg)] text-muted'
                }`}
              >
                {persistence?.persisted ? 'Persistente' : 'Estándar'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Auto-bloqueo', value: `${meta?.autoLockMinutes ?? 15} min` },
                { label: 'Uso local', value: formatBytes(persistence?.usageBytes ?? null) },
                { label: 'Eventos', value: String(eventCount) },
                { label: 'Resúmenes', value: String(snapshotCount) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[var(--glass-border)] bg-[var(--vf-chip-bg)]/60 px-3 py-2 text-center"
                >
                  <p className="text-[10px] font-medium text-muted">{stat.label}</p>
                  <p className="tabular-nums text-xs font-semibold text-ink">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleCompact()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-bg)] px-3 py-1.5 text-[11px] font-medium text-ink transition-opacity hover:opacity-85"
                >
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                  Compactar eventos
                </button>

                {!persistence?.persisted && (
                  <button
                    type="button"
                    onClick={() => void requestPersistence()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-bg)] px-3 py-1.5 text-[11px] font-medium text-ink transition-opacity hover:opacity-85"
                  >
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    Solicitar persistencia
                  </button>
                )}
              </div>

              {compactMessage && (
                <p role="status" className="text-[11px] font-medium text-accent">
                  {compactMessage}
                </p>
              )}
            </div>
          </section>

          {/* Panel inferior derecho: Respaldo cifrado y contraseña (en pestañas limpias) */}
          <section
            aria-label="Seguridad y respaldos"
            className="vf-glass-drawer flex min-h-0 flex-1 flex-col justify-between gap-3 rounded-[26px] p-4 xl:p-5"
          >
            {isEncrypted ? (
              <>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-divider)] pb-2.5">
                  <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                    Seguridad
                  </h2>
                  <div
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--vf-chip-bg)] p-1"
                    role="tablist"
                    aria-label="Opciones de seguridad"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={securityTab === 'backup'}
                      onClick={() => setSecurityTab('backup')}
                      className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                        securityTab === 'backup'
                          ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Respaldo
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={securityTab === 'password'}
                      onClick={() => setSecurityTab('password')}
                      className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                        securityTab === 'password'
                          ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Contraseña
                    </button>
                  </div>
                </div>

                {securityTab === 'backup' ? (
                  <form
                    onSubmit={handleImport}
                    className="flex flex-1 flex-col justify-between gap-3"
                  >
                    <div className="flex flex-col gap-2.5">
                      <label
                        htmlFor="panel-import-file"
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-dashed border-[var(--glass-border)] bg-[var(--vf-chip-bg)]/50 px-3.5 py-2.5 text-xs transition-colors hover:border-ink/40"
                      >
                        <span className="truncate font-medium text-ink">
                          {importFileName ?? 'Seleccionar respaldo cifrado (.json)'}
                        </span>
                        <span className="shrink-0 rounded-full bg-[var(--vf-chip-bg)] px-2.5 py-0.5 text-[11px] text-muted">
                          Explorar
                        </span>
                        <input
                          id="panel-import-file"
                          type="file"
                          accept="application/json,.json"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setImportFileName(file.name);
                              setImportJson(await file.text());
                            }
                          }}
                          className="sr-only"
                        />
                      </label>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setImportMethod('password')}
                          className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                            importMethod === 'password'
                              ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)]'
                              : 'bg-[var(--vf-chip-bg)] text-muted hover:text-ink'
                          }`}
                        >
                          Contraseña
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportMethod('recovery')}
                          className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                            importMethod === 'recovery'
                              ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)]'
                              : 'bg-[var(--vf-chip-bg)] text-muted hover:text-ink'
                          }`}
                        >
                          Clave de recuperación
                        </button>
                      </div>

                      <input
                        type={importMethod === 'password' ? 'password' : 'text'}
                        placeholder={
                          importMethod === 'password'
                            ? 'Contraseña del respaldo'
                            : 'Clave de recuperación'
                        }
                        value={importCredential}
                        onChange={(event) => setImportCredential(event.target.value)}
                        className="rounded-xl border border-[var(--glass-border)] bg-bg/70 px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-divider)] pt-3">
                      <div className="min-w-0 text-xs">
                        {backupStatus && (
                          <p role="status" className="font-medium text-accent">
                            {backupStatus}
                          </p>
                        )}
                        {backupError && (
                          <p role="alert" className="font-medium text-[#C2410C]">
                            {backupError}
                          </p>
                        )}
                        {!backupStatus && !backupError && (
                          <span className="text-[11px] text-muted">
                            Solo legible con tu clave local
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={busy || !importJson.trim() || !importCredential.trim()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-4 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        Restaurar archivo
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={handleChangePassword}
                    className="flex flex-1 flex-col justify-between gap-3"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="change-current-pass"
                          className="text-[11px] font-medium text-muted"
                        >
                          Contraseña actual
                        </label>
                        <input
                          id="change-current-pass"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          className="rounded-xl border border-[var(--glass-border)] bg-bg/70 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="change-new-pass"
                          className="text-[11px] font-medium text-muted"
                        >
                          Nueva contraseña (mín. {MIN_PASSWORD_LENGTH} caracteres)
                        </label>
                        <input
                          id="change-new-pass"
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={MIN_PASSWORD_LENGTH}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="rounded-xl border border-[var(--glass-border)] bg-bg/70 px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-divider)] pt-3">
                      <div className="min-w-0 text-xs">
                        {passwordMessage && (
                          <p role="status" className="font-medium text-accent">
                            {passwordMessage}
                          </p>
                        )}
                        {passwordError && (
                          <p role="alert" className="font-medium text-[#C2410C]">
                            {passwordError}
                          </p>
                        )}
                        {!passwordMessage && !passwordError && (
                          <span className="text-[11px] text-muted">Reenvuelve tu DEK local</span>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-4 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                        Actualizar contraseña
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E0A526]/15 text-[#E0A526]">
                  <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="flex max-w-xs flex-col gap-1">
                  <h2 className="font-display text-base font-semibold text-ink">
                    Modo sin cifrado activo
                  </h2>
                  <p className="text-xs text-muted">
                    Tus datos viven solo en este dispositivo sin contraseña. Borra e inicializa una
                    bóveda cifrada para habilitar respaldos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWipeDialogOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-4 py-2 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Inicializar bóveda cifrada
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Diálogo modal de borrado total en vidrio líquido */}
      <dialog
        ref={wipeDialogRef}
        aria-labelledby={wipeTitleId}
        onClose={() => {
          if (wipeDialogRef.current) wipeDialogRef.current.returnValue = '';
          setWipeDialogOpen(false);
        }}
        className="vf-glass-drawer m-auto w-[min(92vw,28rem)] rounded-[28px] p-0 text-ink"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id={wipeTitleId} className="font-display text-lg font-semibold text-ink">
            ¿Borrar todos los datos locales?
          </h2>
          <p className="text-xs leading-relaxed text-muted">
            Se eliminarán tu bóveda, prendas, medidas y gustos de este navegador de forma
            permanente.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <form method="dialog">
              <Button type="submit" variant="secondary" autoFocus>
                Cancelar
              </Button>
            </form>
            <Button
              type="button"
              onClick={async () => {
                setWipeDialogOpen(false);
                await wipeAll();
              }}
              className="bg-[#C2410C] text-white"
            >
              Confirmar borrado total
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
