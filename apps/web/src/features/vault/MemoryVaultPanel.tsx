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
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system/components/Card';
import { formatBytes } from '@/infrastructure/storage/persistence';
import { MIN_PASSWORD_LENGTH } from '@/infrastructure/vault/vaultService';
import { useVaultStore } from './vaultStore';

export function MemoryVaultPanel() {
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [importJson, setImportJson] = useState('');
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
      setPasswordMessage('Contraseña actualizada. La DEK se reenvolvió sin recifrar tus datos.');
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
      setBackupStatus('Respaldo cifrado exportado correctamente.');
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
      setImportCredential('');
      setBackupStatus(`Respaldo restaurado (${count} registros verificados).`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : 'No se pudo importar el respaldo.');
    }
  };

  const handleCompact = async () => {
    const summary = await compactEventsBefore();
    setCompactMessage(
      summary.compactedEvents > 0
        ? `Compactados ${summary.compactedEvents} eventos en ${summary.updatedMonths.length} mes(es).`
        : 'No hay eventos pendientes por compactar.',
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="vault-heading" className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Bóveda y memoria · v0.2</Badge>
          <Badge>Esquema v{meta?.schemaVersion ?? 2}</Badge>
        </div>
        <h1 id="vault-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Memoria y bóveda local
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Tus medidas, historial y configuraciones permanecen en IndexedDB dentro de este
          dispositivo. El servidor no tiene cuentas ni copias de tus datos.
        </p>
      </section>

      {/* Avisos críticos: modo sin cifrado, iOS Safari y recordatorio de respaldo (T3.6) */}
      {!isEncrypted && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[#E0A526] bg-surface p-4 text-sm"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#E0A526]" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-ink">Modo sin cifrado activo</p>
            <p className="text-xs text-muted">
              Tus datos viven solo en tu dispositivo, pero no están cifrados con contraseña. Puedes
              borrar e inicializar una bóveda cifrada cuando quieras.
            </p>
          </div>
        </div>
      )}

      {persistence?.isIosNonStandalone && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#E0A526]" aria-hidden="true" />
          <p className="text-xs text-muted">
            En Safari iOS, el navegador puede purgar datos locales tras varios días sin uso.
            Instala Luca desde Compartir → «Añadir a pantalla de inicio» y exporta respaldos
            periódicos.
          </p>
        </div>
      )}

      {isEncrypted && persistence?.backupReminderDue && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4"
        >
          <div className="flex items-start gap-2.5 text-xs text-muted">
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              {persistence.daysSinceBackup === null
                ? 'Aún no has exportado tu primer respaldo cifrado.'
                : `Han pasado ${persistence.daysSinceBackup} días desde tu último respaldo cifrado.`}
            </span>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => void handleExport()}>
            Exportar respaldo ahora
          </Button>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Estado de bóveda */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Estado de la bóveda</CardTitle>
              {isEncrypted ? (
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-[#E0A526]" aria-hidden="true" />
              )}
            </div>
            <CardDescription>
              {isEncrypted
                ? `AES-256-GCM · PBKDF2-SHA256 (${(meta?.kdfParams?.iterations ?? 600_000).toLocaleString()} iteraciones)`
                : 'Almacenamiento local sin cifrado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-xs">
              <span className="text-muted">Bloqueo automático por inactividad</span>
              <span className="tabular-nums font-semibold text-ink">
                {meta?.autoLockMinutes ?? 15} min
              </span>
            </div>
            {isEncrypted && (
              <Button type="button" variant="secondary" onClick={lock}>
                <Lock className="h-4 w-4" aria-hidden="true" />
                Bloquear bóveda ahora
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Persistencia y cuota (T3.6) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Almacenamiento persistente</CardTitle>
              <HardDrive className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <CardDescription>Estado de IndexedDB y cuota del navegador</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2">
              <span className="text-muted">Protección contra purga</span>
              <Badge variant={persistence?.persisted ? 'accent' : 'neutral'}>
                {persistence?.persisted ? 'Persistente' : 'Estándar'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2">
              <span className="text-muted">Uso / cuota estimada</span>
              <span className="tabular-nums font-medium text-ink">
                {formatBytes(persistence?.usageBytes ?? null)} /{' '}
                {formatBytes(persistence?.quotaBytes ?? null)}
              </span>
            </div>
            {!persistence?.persisted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void requestPersistence()}
              >
                Solicitar almacenamiento persistente
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Respaldo cifrado (T3.7) */}
        {isEncrypted && (
          <Card>
            <CardHeader>
              <CardTitle>Respaldo cifrado</CardTitle>
              <CardDescription>
                Solo puede abrirse con tu contraseña o tu clave de recuperación.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button type="button" variant="secondary" onClick={() => void handleExport()}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar respaldo cifrado (.json)
              </Button>

              <form
                onSubmit={handleImport}
                className="flex flex-col gap-2.5 border-t border-border pt-3"
              >
                <label htmlFor="panel-import-file" className="text-xs font-semibold text-ink">
                  Importar respaldo cifrado
                </label>
                <input
                  id="panel-import-file"
                  type="file"
                  accept="application/json,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) setImportJson(await file.text());
                  }}
                  className="text-xs text-muted"
                />
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={importMethod === 'password' ? 'primary' : 'outline'}
                    onClick={() => setImportMethod('password')}
                  >
                    Contraseña
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={importMethod === 'recovery' ? 'primary' : 'outline'}
                    onClick={() => setImportMethod('recovery')}
                  >
                    Clave de recuperación
                  </Button>
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
                  className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={busy || !importJson.trim() || !importCredential.trim()}
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Restaurar archivo
                </Button>
              </form>

              {backupStatus && (
                <p role="status" className="text-xs font-medium text-accent">
                  {backupStatus}
                </p>
              )}
              {backupError && (
                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                  {backupError}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cambio de contraseña (ADR-004: reenvuelve DEK) */}
        {isEncrypted && (
          <Card>
            <CardHeader>
              <CardTitle>Cambiar contraseña</CardTitle>
              <CardDescription>
                Reenvuelve la clave de datos (DEK) sin recifrar tus registros.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="change-current-pass" className="text-xs font-medium text-muted">
                    Contraseña actual
                  </label>
                  <input
                    id="change-current-pass"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="change-new-pass" className="text-xs font-medium text-muted">
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
                    className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
                  />
                </div>

                {passwordMessage && (
                  <p role="status" className="text-xs font-medium text-accent">
                    {passwordMessage}
                  </p>
                )}
                {passwordError && (
                  <p role="alert" className="text-xs font-medium text-[#C2410C]">
                    {passwordError}
                  </p>
                )}

                <Button type="submit" size="sm" disabled={busy}>
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Actualizar contraseña
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Registro de eventos y compactación (T3.5) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Registro de eventos</CardTitle>
              <Archive className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <CardDescription>
              Bitácora de solo añadir compactable en resúmenes mensuales.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2">
              <span className="text-muted">Eventos activos</span>
              <span className="tabular-nums font-semibold text-ink">{eventCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2">
              <span className="text-muted">Resúmenes mensuales</span>
              <span className="tabular-nums font-semibold text-ink">{snapshotCount}</span>
            </div>
            {compactMessage && (
              <p role="status" className="text-xs text-accent">
                {compactMessage}
              </p>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCompact()}>
              Compactar eventos en resúmenes
            </Button>
          </CardContent>
        </Card>

        {/* Borrado total (T3.7) */}
        <Card>
          <CardHeader>
            <CardTitle>Borrado total del dispositivo</CardTitle>
            <CardDescription>
              Elimina permanentemente la bóveda, tus medidas y todos los registros locales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWipeDialogOpen(true)}
              className="border-[#C2410C] text-[#C2410C]"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Borrar todos los datos
            </Button>

            <dialog
              ref={wipeDialogRef}
              aria-labelledby={wipeTitleId}
              onClose={() => {
                if (wipeDialogRef.current) wipeDialogRef.current.returnValue = '';
                setWipeDialogOpen(false);
              }}
            >
              <div className="flex flex-col gap-4 p-5">
                <h2 id={wipeTitleId} className="text-lg font-semibold text-ink">
                  ¿Borrar todos los datos locales?
                </h2>
                <p className="text-sm text-muted">
                  Esta acción elimina tu bóveda, medidas y eventos de este navegador. Asegúrate de
                  tener un respaldo cifrado si deseas conservarlos.
                </p>
                <div className="flex justify-end gap-2">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
