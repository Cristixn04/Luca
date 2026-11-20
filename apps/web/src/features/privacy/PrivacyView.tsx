import { ArrowLeft, CloudOff, Database, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { useI18nStore } from '@/i18n/i18nStore';

export interface PrivacyViewProps {
  onBack: () => void;
  onOpenMemory: () => void;
}

export function PrivacyView({ onBack, onOpenMemory }: PrivacyViewProps) {
  const locale = useI18nStore((s) => s.locale);
  const isEn = locale === 'en';

  return (
    <div className="flex flex-col gap-6" data-testid="privacy-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {isEn ? 'Back' : 'Volver'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onOpenMemory}>
          {isEn ? 'Manage memory & vault' : 'Gestionar memoria y bóveda'}
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {isEn ? 'How your data is protected' : 'Cómo se protegen tus datos'}
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-accent" aria-hidden="true" />
              {isEn ? 'What never leaves your device' : 'Qué nunca sale de tu dispositivo'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <ul className="flex list-disc flex-col gap-1.5 pl-4">
              <li>
                {isEn
                  ? 'Your body measurements and fit calculations.'
                  : 'Tus medidas corporales y cálculos de calce.'}
              </li>
              <li>
                {isEn
                  ? 'Your closet, sizes, prices, wear history and outfits.'
                  : 'Tu clóset, tallas, precios, historial de usos y outfits.'}
              </li>
              <li>
                {isEn
                  ? 'Your seasonal color profile and learned taste affinities.'
                  : 'Tu perfil de colorimetría y tus gustos aprendidos.'}
              </li>
              <li>
                {isEn
                  ? 'Zero user accounts, zero tracking scripts, zero third-party analytics.'
                  : 'Cero cuentas en la nube, cero rastreadores y cero analítica de terceros.'}
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudOff className="h-4 w-4 text-accent" aria-hidden="true" />
              {isEn ? 'What only leaves with your permission' : 'Qué sale solo con tu permiso'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <ul className="flex list-disc flex-col gap-1.5 pl-4">
              <li>
                {isEn
                  ? 'Garment photos (optional): resized and stripped of EXIF/GPS before upload, processed in memory only and discarded immediately.'
                  : 'Fotos de prendas (opcional): se reducen de tamaño y se borran sus metadatos EXIF/GPS antes de enviarse; la API las procesa solo en memoria y las descarta al instante.'}
              </li>
              <li>
                {isEn
                  ? 'Weather lookup (optional): only rounded coordinates (~10 km). You can always enter temperature manually.'
                  : 'Consulta de clima (opcional): solo coordenadas redondeadas (~10 km). Siempre puedes elegir la temperatura manualmente.'}
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-accent" aria-hidden="true" />
              {isEn ? 'Local encryption & recovery' : 'Cifrado local y recuperación'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            {isEn
              ? 'With the vault enabled, every record is encrypted inside your browser with your password and a 256-bit recovery key. Changing your password never uploads anything.'
              : 'Con la bóveda activa, cada registro se cifra dentro de tu navegador con tu contraseña y una clave de recuperación de 256 bits. Solo tú puedes descifrarlo.'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-accent" aria-hidden="true" />
              {isEn ? 'Full control over your memory' : 'Control total sobre tu memoria'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            {isEn
              ? 'From the Memory section you can inspect every learned affinity, pause learning, export an encrypted backup or wipe all data permanently.'
              : 'Desde la sección Memoria puedes ver cada afinidad aprendida, pausar el aprendizaje, exportar un respaldo cifrado o borrar todos tus datos de forma permanente.'}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <span>
          {isEn
            ? 'Every privacy guarantee is continuously checked by automated network-interception tests.'
            : 'Cada garantía de privacidad se verifica con pruebas automáticas de red.'}
        </span>
      </div>
    </div>
  );
}
