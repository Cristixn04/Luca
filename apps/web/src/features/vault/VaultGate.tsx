import { useId, useState, type FormEvent } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Upload,
  UserRound,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { LucaBrandLogo } from '@/components/layout/LucaBrandLogo';
import { MIN_PASSWORD_LENGTH } from '@/infrastructure/vault/vaultService';
import { CosmicConstellationCanvas } from './CosmicConstellationCanvas';
import { useVaultStore } from './vaultStore';

type LockedView = 'password' | 'recovery' | 'import';

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];
const EASE_IN_OUT_STRONG: [number, number, number, number] = [0.77, 0, 0.175, 1];

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

  const shouldReduceMotion = useReducedMotion();

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

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    await createVault(password);
    setPassword('');
  };

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

  const handleCopyRecovery = async () => {
    if (!pendingRecoveryKey) return;
    try {
      await navigator.clipboard.writeText(pendingRecoveryKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // Clave única para coordinar transiciones limpias de vista en AnimatePresence
  const activeStageKey = pendingRecoveryKey
    ? 'pending-recovery'
    : status === 'uninitialized'
      ? showImportInSetup
        ? 'setup-import'
        : 'setup-primary'
      : `locked-${lockedView}`;

  const isCompactSubpanel =
    Boolean(pendingRecoveryKey) ||
    (status === 'uninitialized' && showImportInSetup) ||
    (status !== 'uninitialized' && lockedView !== 'password');

  const stageMotionProps = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 },
    transition: { duration: shouldReduceMotion ? 0.16 : 0.28, ease: EASE_OUT_EXPO },
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#05070B] px-5 py-10 text-white selection:bg-white/25 selection:text-white">
        {/* Fondo cósmico interactivo con constelaciones animadas */}
        <CosmicConstellationCanvas />

        <main className="relative z-10 flex w-full max-w-[440px] flex-col items-center">
          {/* Logotipo oficial de Luca con coreografía Motion (entrada + resplandor orgánico + micro-flotación) */}
          <motion.div
            className={`relative flex items-center justify-center ${
              isCompactSubpanel ? 'mb-7' : 'mb-10'
            }`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: shouldReduceMotion ? 0.2 : 0.78,
              delay: shouldReduceMotion ? 0 : 0.06,
              ease: EASE_OUT_EXPO,
            }}
          >
            {/* Halo luminoso suave detrás del logotipo (solo opacity + scale GPU) */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-10 -inset-y-6 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 54%, rgba(255, 255, 255, 0.20) 0%, rgba(196, 220, 255, 0.09) 42%, transparent 74%)',
              }}
              animate={
                shouldReduceMotion
                  ? { opacity: 0.7 }
                  : { opacity: [0.52, 0.86, 0.52], scale: [0.97, 1.04, 0.97] }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0.2 }
                  : { duration: 6.4, repeat: Infinity, ease: EASE_IN_OUT_STRONG }
              }
            />

            <motion.div
              className="relative"
              animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 6.8,
                      delay: 0.85,
                      repeat: Infinity,
                      ease: EASE_IN_OUT_STRONG,
                    }
              }
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : { scale: 1.02, transition: { type: 'spring', stiffness: 260, damping: 22 } }
              }
            >
              <LucaBrandLogo
                className={`h-auto text-white luca-login-logo-glow ${
                  isCompactSubpanel
                    ? 'w-[min(60vw,280px)]'
                    : 'w-[min(78vw,396px)]'
                }`}
              />
            </motion.div>
          </motion.div>

          {/* Escenario principal con transiciones limpias entre estados */}
          <div className="relative flex w-full flex-col items-center">
            <AnimatePresence mode="popLayout" initial={false}>
            {/* 1. Paso único obligatorio: Clave de recuperación tras crear bóveda */}
            {pendingRecoveryKey ? (
              <motion.section
                key={activeStageKey}
                {...stageMotionProps}
                aria-labelledby="vault-recovery-title"
                className="luca-login-subpanel flex w-full flex-col gap-4 p-6"
              >
                <div className="text-center">
                  <p className="text-[11px] font-medium tracking-[0.14em] text-white/60 uppercase">
                    Paso único obligatorio
                  </p>
                  <h1
                    id="vault-recovery-title"
                    className="mt-1 font-display text-lg font-semibold text-white"
                  >
                    Guarda tu clave de recuperación
                  </h1>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">
                    Se muestra una sola vez. Si olvidas tu contraseña y pierdes esta clave, tus
                    datos cifrados no se podrán recuperar.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/45 p-3.5">
                  <code
                    data-testid="recovery-key-value"
                    className="tabular-nums block break-all font-mono text-xs leading-relaxed text-white/95"
                  >
                    {pendingRecoveryKey}
                  </code>
                </div>

                <button
                  type="button"
                  onClick={handleCopyRecovery}
                  className="luca-login-pill-shell flex h-11 w-full items-center justify-center gap-2 text-xs font-medium text-white/90 hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4 text-white/75" aria-hidden="true" />
                  )}
                  {copied ? 'Clave copiada' : 'Copiar clave de recuperación'}
                </button>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-white/80">
                  <input
                    type="checkbox"
                    checked={recoveryConfirmed}
                    onChange={(event) => setRecoveryConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-white"
                  />
                  <span>Confirmé que guardé esta clave en un lugar seguro fuera de Luca.</span>
                </label>

                <motion.button
                  type="button"
                  disabled={!recoveryConfirmed}
                  onClick={confirmRecoveryKeySaved}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="luca-login-cta flex h-[54px] w-full items-center justify-center text-[15.5px] font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  Entrar a Luca
                </motion.button>
              </motion.section>
            ) : status === 'uninitialized' && !showImportInSetup ? (
              /* 2. Primer ingreso (bóveda nueva) — réplica exacta de la referencia visual */
              <motion.form
                key={activeStageKey}
                onSubmit={handleCreate}
                className="flex w-full flex-col items-center"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{
                  duration: shouldReduceMotion ? 0.18 : 0.54,
                  delay: shouldReduceMotion ? 0 : 0.2,
                  ease: EASE_OUT_EXPO,
                }}
              >
                <h1 className="sr-only">Crea tu bóveda cifrada</h1>
                <span id={passwordHintId} className="sr-only">
                  Mínimo {MIN_PASSWORD_LENGTH} caracteres. Puedes usar un gestor de contraseñas.
                </span>

                {/* Campo pill de vidrio ahumado con destellos especulares */}
                <div className="luca-login-pill-shell flex h-[58px] w-full items-center px-5">
                  <span className="luca-login-flare-top" aria-hidden="true" />
                  <span className="luca-login-flare-bottom" aria-hidden="true" />

                  <UserRound
                    className="mr-3.5 h-[19px] w-[19px] shrink-0 text-white/75"
                    strokeWidth={1.55}
                    aria-hidden="true"
                  />
                  <label htmlFor="vault-new-password" className="sr-only">
                    Contraseña de la bóveda
                  </label>
                  <input
                    id="vault-new-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    enterKeyHint="done"
                    aria-describedby={passwordHintId}
                    placeholder={`Crea tu contraseña (mín. ${MIN_PASSWORD_LENGTH} caracteres)`}
                    value={password}
                    onChange={(event) => {
                      clearError();
                      setPassword(event.target.value);
                    }}
                    className="luca-login-pill-input vault-input h-full min-w-0 flex-1 bg-transparent text-[15.5px] text-white placeholder:text-white/55 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.65} aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.65} aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Error inline solo cuando ocurre */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                      className="mt-3 text-center text-xs font-medium text-rose-300"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Botón pill blanco luminoso */}
                <motion.button
                  type="submit"
                  disabled={busy || password.length < MIN_PASSWORD_LENGTH}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.18 : 0.5,
                    delay: shouldReduceMotion ? 0 : 0.3,
                    ease: EASE_OUT_EXPO,
                  }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.982 }}
                  className={`luca-login-cta mt-5 flex h-[58px] w-full items-center justify-center text-[17px] font-medium tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                    busy ? 'luca-login-cta-igniting' : ''
                  }`}
                >
                  {busy ? 'Creando bóveda...' : 'Continuar'}
                </motion.button>

                {/* Enlaces inferiores separados por barra vertical */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.18 : 0.45,
                    delay: shouldReduceMotion ? 0 : 0.38,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="mt-7 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 text-[13.5px]"
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void continueWithoutVault()}
                    className="luca-login-link focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Continuar sin cifrado
                  </button>
                  <span aria-hidden="true" className="select-none text-white/28">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setShowImportInSetup(true);
                    }}
                    className="luca-login-link focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Restaurar un respaldo cifrado
                  </button>
                </motion.div>
              </motion.form>
            ) : status === 'uninitialized' && showImportInSetup ? (
              /* 3. Restaurar respaldo cifrado desde el primer arranque */
              <motion.form
                key={activeStageKey}
                {...stageMotionProps}
                onSubmit={handleImportSubmit}
                className="luca-login-subpanel flex w-full flex-col gap-3.5 p-6"
              >
                <h1 className="text-center font-display text-base font-semibold text-white">
                  Restaurar un respaldo cifrado
                </h1>

                <div className="flex flex-col gap-2">
                  <label htmlFor="setup-backup-file" className="text-xs font-medium text-white/75">
                    Archivo de respaldo cifrado (.json)
                  </label>
                  <input
                    id="setup-backup-file"
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => void handleFileLoad(event.target.files?.[0])}
                    className="text-xs text-white/70 file:mr-3 file:rounded-full file:border file:border-white/25 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-white/20"
                  />
                  <textarea
                    aria-label="Contenido JSON del respaldo cifrado"
                    rows={3}
                    placeholder="O pega aquí el contenido del archivo de respaldo..."
                    value={backupText}
                    onChange={(event) => setBackupText(event.target.value)}
                    className="rounded-2xl border border-white/20 bg-black/35 p-3 font-mono text-xs text-white placeholder:text-white/40 focus:border-white/55 focus:outline-none"
                  />
                </div>

                <div
                  className="grid grid-cols-2 gap-2"
                  role="group"
                  aria-label="Tipo de credencial del respaldo"
                >
                  <button
                    type="button"
                    onClick={() => setBackupMethod('password')}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      backupMethod === 'password'
                        ? 'border-white/75 bg-white text-[#0B0D12]'
                        : 'border-white/20 bg-white/5 text-white/75 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    Con contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupMethod('recovery')}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      backupMethod === 'recovery'
                        ? 'border-white/75 bg-white text-[#0B0D12]'
                        : 'border-white/20 bg-white/5 text-white/75 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    Con clave de recuperación
                  </button>
                </div>

                <div className="luca-login-pill-shell flex h-[50px] w-full items-center px-4">
                  <span className="luca-login-flare-top" aria-hidden="true" />
                  <span className="luca-login-flare-bottom" aria-hidden="true" />
                  <label htmlFor="setup-backup-cred" className="sr-only">
                    {backupMethod === 'password'
                      ? 'Contraseña del respaldo'
                      : 'Clave de recuperación'}
                  </label>
                  <input
                    id="setup-backup-cred"
                    type={backupMethod === 'password' ? 'password' : 'text'}
                    autoComplete={backupMethod === 'password' ? 'current-password' : 'off'}
                    required
                    placeholder={
                      backupMethod === 'password'
                        ? 'Contraseña del respaldo'
                        : 'Clave de recuperación'
                    }
                    value={backupCredential}
                    onChange={(event) => {
                      clearError();
                      setBackupCredential(event.target.value);
                    }}
                    className="luca-login-pill-input h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-center text-xs font-medium text-rose-300">
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="luca-login-cta mt-1 flex h-[52px] w-full items-center justify-center gap-2 text-[15.5px] font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Restaurando...' : 'Restaurar respaldo cifrado'}
                </motion.button>

                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setShowImportInSetup(false);
                  }}
                  className="luca-login-link mt-1 text-center text-[13px]"
                >
                  Volver a crear una bóveda nueva
                </button>
              </motion.form>
            ) : lockedView === 'password' ? (
              /* 4. Inicio de sesión (bóveda bloqueada) — réplica exacta pixel a pixel de la imagen */
              <motion.form
                key={activeStageKey}
                onSubmit={handleUnlock}
                className="flex w-full flex-col items-center"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{
                  duration: shouldReduceMotion ? 0.18 : 0.54,
                  delay: shouldReduceMotion ? 0 : 0.2,
                  ease: EASE_OUT_EXPO,
                }}
              >
                <h1 className="sr-only">Iniciar sesión en Luca</h1>

                {/* Campo pill de vidrio ahumado con destellos especulares */}
                <div className="luca-login-pill-shell flex h-[58px] w-full items-center px-5">
                  <span className="luca-login-flare-top" aria-hidden="true" />
                  <span className="luca-login-flare-bottom" aria-hidden="true" />

                  <UserRound
                    className="mr-3.5 h-[19px] w-[19px] shrink-0 text-white/75"
                    strokeWidth={1.55}
                    aria-hidden="true"
                  />
                  <label htmlFor="vault-unlock-password" className="sr-only">
                    Contraseña
                  </label>
                  <input
                    id="vault-unlock-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    enterKeyHint="done"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(event) => {
                      clearError();
                      setPassword(event.target.value);
                    }}
                    className="luca-login-pill-input h-full min-w-0 flex-1 bg-transparent text-[15.5px] text-white placeholder:text-white/55 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.65} aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.65} aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Error inline solo cuando ocurre */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                      className="mt-3 text-center text-xs font-medium text-rose-300"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Botón pill blanco luminoso */}
                <motion.button
                  type="submit"
                  disabled={busy || password.length === 0}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.18 : 0.5,
                    delay: shouldReduceMotion ? 0 : 0.3,
                    ease: EASE_OUT_EXPO,
                  }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.982 }}
                  className={`luca-login-cta mt-5 flex h-[58px] w-full items-center justify-center text-[17px] font-medium tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                    busy ? 'luca-login-cta-igniting' : ''
                  }`}
                >
                  {busy ? 'Desbloqueando...' : 'Continuar'}
                </motion.button>

                {/* Enlaces inferiores exactamente iguales a la imagen */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.18 : 0.45,
                    delay: shouldReduceMotion ? 0 : 0.38,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="mt-7 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 text-[13.5px]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setLockedView('recovery');
                    }}
                    className="luca-login-link focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <span aria-hidden="true" className="select-none text-white/28">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setLockedView('import');
                    }}
                    className="luca-login-link focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Restaurar un respaldo cifrado
                  </button>
                </motion.div>
              </motion.form>
            ) : lockedView === 'recovery' ? (
              /* 5. Recuperación con clave de 256 bits */
              <motion.form
                key={activeStageKey}
                {...stageMotionProps}
                onSubmit={handleRecover}
                className="luca-login-subpanel flex w-full flex-col gap-3.5 p-6"
              >
                <h1 className="text-center font-display text-base font-semibold text-white">
                  Recuperar acceso
                </h1>

                <div className="luca-login-pill-shell flex h-[52px] w-full items-center px-4">
                  <span className="luca-login-flare-top" aria-hidden="true" />
                  <span className="luca-login-flare-bottom" aria-hidden="true" />
                  <KeyRound
                    className="mr-3 h-4 w-4 shrink-0 text-white/70"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <label htmlFor="vault-recovery-key" className="sr-only">
                    Clave de recuperación
                  </label>
                  <input
                    id="vault-recovery-key"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    required
                    placeholder="Clave de recuperación (XXXXXXXX-...)"
                    value={recoveryInput}
                    onChange={(event) => {
                      clearError();
                      setRecoveryInput(event.target.value);
                    }}
                    className="luca-login-pill-input h-full min-w-0 flex-1 bg-transparent font-mono text-xs text-white placeholder:font-sans placeholder:text-white/50 focus:outline-none"
                  />
                </div>

                <div className="luca-login-pill-shell flex h-[52px] w-full items-center px-4">
                  <span className="luca-login-flare-top" aria-hidden="true" />
                  <span className="luca-login-flare-bottom" aria-hidden="true" />
                  <Lock
                    className="mr-3 h-4 w-4 shrink-0 text-white/70"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <label htmlFor="vault-recovery-new-pass" className="sr-only">
                    Nueva contraseña
                  </label>
                  <input
                    id="vault-recovery-new-pass"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD_LENGTH} caracteres)`}
                    value={newPassword}
                    onChange={(event) => {
                      clearError();
                      setNewPassword(event.target.value);
                    }}
                    className="luca-login-pill-input h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-center text-xs font-medium text-rose-300">
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="luca-login-cta mt-1 flex h-[52px] w-full items-center justify-center gap-2 text-[15.5px] font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Recuperando...' : 'Recuperar y desbloquear'}
                </motion.button>

                <div className="mt-1 flex items-center justify-center gap-3 text-[13px]">
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setLockedView('password');
                    }}
                    className="luca-login-link"
                  >
                    Volver a contraseña
                  </button>
                  <span aria-hidden="true" className="text-white/25">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setLockedView('import');
                    }}
                    className="luca-login-link"
                  >
                    Restaurar un respaldo cifrado
                  </button>
                </div>
              </motion.form>
            ) : (
              /* 6. Restaurar respaldo cifrado desde bóveda bloqueada */
              <motion.form
                key={activeStageKey}
                {...stageMotionProps}
                onSubmit={handleImportSubmit}
                className="luca-login-subpanel flex w-full flex-col gap-3.5 p-6"
              >
                <h1 className="text-center font-display text-base font-semibold text-white">
                  Restaurar un respaldo cifrado
                </h1>

                <div className="flex flex-col gap-2">
                  <label htmlFor="locked-backup-file" className="text-xs font-medium text-white/75">
                    Respaldo cifrado (.json)
                  </label>
                  <input
                    id="locked-backup-file"
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => void handleFileLoad(event.target.files?.[0])}
                    className="text-xs text-white/70 file:mr-3 file:rounded-full file:border file:border-white/25 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-white/20"
                  />
                  <textarea
                    aria-label="Contenido JSON del respaldo"
                    rows={3}
                    placeholder="O pega aquí el contenido del archivo de respaldo..."
                    value={backupText}
                    onChange={(event) => setBackupText(event.target.value)}
                    className="rounded-2xl border border-white/20 bg-black/35 p-3 font-mono text-xs text-white placeholder:text-white/40 focus:border-white/55 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBackupMethod('password')}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      backupMethod === 'password'
                        ? 'border-white/75 bg-white text-[#0B0D12]'
                        : 'border-white/20 bg-white/5 text-white/75 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    Contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupMethod('recovery')}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      backupMethod === 'recovery'
                        ? 'border-white/75 bg-white text-[#0B0D12]'
                        : 'border-white/20 bg-white/5 text-white/75 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    Clave de recuperación
                  </button>
                </div>

                <div className="luca-login-pill-shell flex h-[50px] w-full items-center px-4">
                  <span className="luca-login-flare-top" aria-hidden="true" />
                  <span className="luca-login-flare-bottom" aria-hidden="true" />
                  <input
                    type={backupMethod === 'password' ? 'password' : 'text'}
                    aria-label="Credencial del respaldo"
                    required
                    placeholder={
                      backupMethod === 'password'
                        ? 'Contraseña del respaldo'
                        : 'Clave de recuperación'
                    }
                    value={backupCredential}
                    onChange={(event) => {
                      clearError();
                      setBackupCredential(event.target.value);
                    }}
                    className="luca-login-pill-input h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-center text-xs font-medium text-rose-300">
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="luca-login-cta mt-1 flex h-[52px] w-full items-center justify-center gap-2 text-[15.5px] font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Restaurar respaldo
                </motion.button>

                <div className="mt-1 flex items-center justify-center gap-3 text-[13px]">
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setLockedView('password');
                    }}
                    className="luca-login-link"
                  >
                    Volver a contraseña
                  </button>
                  <span aria-hidden="true" className="text-white/25">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setLockedView('recovery');
                    }}
                    className="luca-login-link"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </motion.form>
            )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
