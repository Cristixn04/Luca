import { useId, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Upload,
} from 'lucide-react';
import { LucaBrandLogo } from '@/components/layout/LucaBrandLogo';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system/components/Card';
import { MIN_PASSWORD_LENGTH } from '@/infrastructure/vault/vaultService';
import { useVaultStore } from './vaultStore';

type LockedView = 'password' | 'recovery' | 'import';

export function VaultGate() {
  const status = useVaultStore((s) => s.status);
  const pendingRecoveryKey = useVaultStore((s) => s.pendingRecoveryKey);
  const busy = useVaultStore((s) => s.busy);
  const error = useVaultStore((s) => s.error);

  const createVault = useVaultStore((s) => s.createVault);
  const confirmRecoveryKeySaved = useVaultStore((s) => s.confirmRecoveryKeySaved);
  const continueWithoutVault = useVaultStore((s) => s.continueWithoutVault);
  const unlock = useVaultStore((s) => s.unlock);
  const recover = useVaultStore((s) => s.recover);
  const importBackup = useVaultStore((s) => s.importBackup);
  const clearError = useVaultStore((s) => s.clearError);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lockedView, setLockedView] = useState<LockedView>('password');
  const [showImportInSetup, setShowImportInSetup] = useState(false);

  const [backupText, setBackupText] = useState('');
  const [backupCredential, setBackupCredential] = useState('');
  const [backupMethod, setBackupMethod] = useState<'password' | 'recovery'>('password');

  const passwordHintId = useId();

  // Paso obligatorio único: mostrar clave de recuperación tras crear la bóveda (T3.4).
  if (pendingRecoveryKey) {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(pendingRecoveryKey);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };

    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-10">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="accent">Paso único obligatorio</Badge>
            </div>
            <CardTitle>Guarda tu clave de recuperación</CardTitle>
            <CardDescription>
              Esta clave de 256 bits se muestra una sola vez. Si olvidas tu contraseña y pierdes
              esta clave, tus datos cifrados no se podrán recuperar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-3">
              <code
                data-testid="recovery-key-value"
                className="tabular-nums block break-all font-mono text-xs leading-relaxed text-ink"
              >
                {pendingRecoveryKey}
              </code>
            </div>

            <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-accent" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? 'Clave copiada' : 'Copiar clave de recuperación'}
            </Button>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={recoveryConfirmed}
                onChange={(event) => setRecoveryConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span>Confirmé que guardé esta clave en un lugar seguro fuera de Luca.</span>
            </label>

            <Button
              type="button"
              disabled={!recoveryConfirmed}
              onClick={confirmRecoveryKeySaved}
            >
              Entrar a Luca
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleImportSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!backupText.trim() || !backupCredential.trim()) return;
    try {
      await importBackup(backupText, backupCredential, backupMethod);
      setBackupText('');
      setBackupCredential('');
    } catch {
      // El error queda reflejado en el estado del store.
    }
  };

  const handleFileLoad = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setBackupText(text);
  };

  // Pantalla de primer arranque: crear bóveda o restaurar respaldo.
  if (status === 'uninitialized') {
    const handleCreate = async (event: FormEvent) => {
      event.preventDefault();
      await createVault(password);
      setPassword('');
    };

    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-10">
        <Card className="w-full">
          <CardHeader>
            <div className="mb-1 flex items-center justify-between gap-2">
              <LucaBrandLogo className="h-9 w-auto text-ink" />
              <Badge variant="accent">Privacidad por diseño</Badge>
            </div>
            <CardTitle>Crea tu bóveda cifrada</CardTitle>
            <CardDescription>
              Tus medidas, clóset y preferencias se guardan solo en este dispositivo, cifrados con
              AES-256-GCM.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            {!showImportInSetup ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vault-new-password" className="text-sm font-medium text-ink">
                    Contraseña de la bóveda
                  </label>
                  <span id={passwordHintId} className="text-xs text-muted">
                    Mínimo {MIN_PASSWORD_LENGTH} caracteres. Puedes usar un gestor de contraseñas.
                  </span>
                  <div className="flex gap-2">
                    <input
                      id="vault-new-password"
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      enterKeyHint="done"
                      aria-describedby={passwordHintId}
                      value={password}
                      onChange={(event) => {
                        clearError();
                        setPassword(event.target.value);
                      }}
                      className="vault-input flex-1 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-ink"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-xs font-medium text-[#C2410C]">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={busy || password.length < MIN_PASSWORD_LENGTH}>
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Creando bóveda...' : 'Crear bóveda cifrada'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleImportSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="setup-backup-file" className="text-sm font-medium text-ink">
                    Archivo de respaldo cifrado (.json)
                  </label>
                  <input
                    id="setup-backup-file"
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => void handleFileLoad(event.target.files?.[0])}
                    className="text-xs text-muted"
                  />
                  <textarea
                    aria-label="Contenido JSON del respaldo cifrado"
                    rows={3}
                    placeholder="O pega aquí el contenido del archivo de respaldo..."
                    value={backupText}
                    onChange={(event) => setBackupText(event.target.value)}
                    className="rounded-[var(--radius-sm)] border border-border bg-bg p-2 font-mono text-xs text-ink"
                  />
                </div>

                <div className="flex gap-2" role="group" aria-label="Tipo de credencial del respaldo">
                  <Button
                    type="button"
                    size="sm"
                    variant={backupMethod === 'password' ? 'primary' : 'outline'}
                    onClick={() => setBackupMethod('password')}
                  >
                    Con contraseña
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={backupMethod === 'recovery' ? 'primary' : 'outline'}
                    onClick={() => setBackupMethod('recovery')}
                  >
                    Con clave de recuperación
                  </Button>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="setup-backup-cred" className="text-sm font-medium text-ink">
                    {backupMethod === 'password' ? 'Contraseña del respaldo' : 'Clave de recuperación'}
                  </label>
                  <input
                    id="setup-backup-cred"
                    type={backupMethod === 'password' ? 'password' : 'text'}
                    autoComplete={backupMethod === 'password' ? 'current-password' : 'off'}
                    required
                    value={backupCredential}
                    onChange={(event) => {
                      clearError();
                      setBackupCredential(event.target.value);
                    }}
                    className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-xs font-medium text-[#C2410C]">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={busy}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Restaurando...' : 'Restaurar respaldo cifrado'}
                </Button>
              </form>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearError();
                  setShowImportInSetup((prev) => !prev);
                }}
              >
                {showImportInSetup
                  ? 'Volver a crear una bóveda nueva'
                  : '¿Ya tienes un respaldo cifrado? Restaurarlo'}
              </Button>

              <div className="flex flex-col gap-1.5 rounded-[var(--radius-sm)] border border-border bg-bg p-3">
                <div className="flex items-start gap-2 text-xs text-muted">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E0A526]"
                    aria-hidden="true"
                  />
                  <span>
                    Si omites la bóveda, tus datos seguirán solo en tu dispositivo pero se guardarán
                    sin cifrar.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void continueWithoutVault()}
                >
                  Continuar sin cifrado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de desbloqueo de bóveda existente (Sección 5.4).
  const handleUnlock = async (event: FormEvent) => {
    event.preventDefault();
    await unlock(password);
    setPassword('');
  };

  const handleRecover = async (event: FormEvent) => {
    event.preventDefault();
    await recover(recoveryInput, newPassword);
    setRecoveryInput('');
    setNewPassword('');
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-1 flex items-center justify-center">
            <LucaBrandLogo className="h-10 w-auto text-ink" />
          </div>
          <CardTitle className="sr-only">Luca</CardTitle>
          <CardDescription>Tus datos están cifrados en este dispositivo</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {lockedView === 'password' && (
            <form onSubmit={handleUnlock} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="vault-unlock-password" className="text-sm font-medium text-ink">
                  Contraseña
                </label>
                <div className="flex gap-2">
                  <input
                    id="vault-unlock-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    enterKeyHint="done"
                    value={password}
                    onChange={(event) => {
                      clearError();
                      setPassword(event.target.value);
                    }}
                    className="flex-1 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-ink"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy || password.length === 0}>
                {busy ? 'Desbloqueando...' : 'Desbloquear'}
              </Button>
            </form>
          )}

          {lockedView === 'recovery' && (
            <form onSubmit={handleRecover} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="vault-recovery-key" className="text-sm font-medium text-ink">
                  Clave de recuperación
                </label>
                <input
                  id="vault-recovery-key"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="XXXXXXXX-XXXXXXXX-..."
                  value={recoveryInput}
                  onChange={(event) => {
                    clearError();
                    setRecoveryInput(event.target.value);
                  }}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 font-mono text-xs text-ink"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="vault-recovery-new-pass" className="text-sm font-medium text-ink">
                  Nueva contraseña
                </label>
                <span className="text-xs text-muted">
                  Mínimo {MIN_PASSWORD_LENGTH} caracteres.
                </span>
                <input
                  id="vault-recovery-new-pass"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(event) => {
                    clearError();
                    setNewPassword(event.target.value);
                  }}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-ink"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy}>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {busy ? 'Recuperando...' : 'Recuperar y desbloquear'}
              </Button>
            </form>
          )}

          {lockedView === 'import' && (
            <form onSubmit={handleImportSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="locked-backup-file" className="text-sm font-medium text-ink">
                  Respaldo cifrado (.json)
                </label>
                <input
                  id="locked-backup-file"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void handleFileLoad(event.target.files?.[0])}
                  className="text-xs text-muted"
                />
                <textarea
                  aria-label="Contenido JSON del respaldo"
                  rows={3}
                  value={backupText}
                  onChange={(event) => setBackupText(event.target.value)}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg p-2 font-mono text-xs text-ink"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={backupMethod === 'password' ? 'primary' : 'outline'}
                  onClick={() => setBackupMethod('password')}
                >
                  Contraseña
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={backupMethod === 'recovery' ? 'primary' : 'outline'}
                  onClick={() => setBackupMethod('recovery')}
                >
                  Clave de recuperación
                </Button>
              </div>

              <input
                type={backupMethod === 'password' ? 'password' : 'text'}
                aria-label="Credencial del respaldo"
                required
                value={backupCredential}
                onChange={(event) => {
                  clearError();
                  setBackupCredential(event.target.value);
                }}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-ink"
              />

              {error && (
                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Restaurar respaldo
              </Button>
            </form>
          )}

          <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-center">
            {lockedView !== 'recovery' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearError();
                  setLockedView('recovery');
                }}
              >
                ¿Olvidaste la contraseña? Usar clave de recuperación
              </Button>
            )}
            {lockedView !== 'password' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearError();
                  setLockedView('password');
                }}
              >
                Volver a desbloquear con contraseña
              </Button>
            )}
            {lockedView !== 'import' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearError();
                  setLockedView('import');
                }}
              >
                Restaurar un respaldo cifrado
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
