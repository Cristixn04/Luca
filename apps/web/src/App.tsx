import { useState } from 'react';
import { DOMAIN_VERSION, cmToInches } from '@luca/domain';
import { ShieldCheck } from 'lucide-react';
import { AppShell, type NavSection } from '@/components/layout/AppShell';
import { Badge } from '@/design-system/components/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system/components/Card';
import { HEATMAP_TOKENS } from '@/design-system/tokens';
import { FittingRoom } from '@/features/fitting/FittingRoom';

const PLACEHOLDER_SECTIONS: Record<
  Exclude<NavSection, 'fitting'>,
  { title: string; subtitle: string; milestone: string; summary: string }
> = {
  closet: {
    title: 'Clóset local',
    subtitle: 'Prendas, tablas de tallas en plano, fotos recortadas y costo por uso.',
    milestone: 'M4 · v0.3',
    summary:
      'Guarda tus prendas y su tabla de tallas de forma local y cifrada, con recomendación automática de talla.',
  },
  outfits: {
    title: 'Tablero de outfits',
    subtitle: 'Propuestas explicables según ocasión, clima, calce y gustos.',
    milestone: 'M9 · v0.8',
    summary:
      'Combinaciones diversas con desglose numérico de color, estilo, calce, ocasión, variedad y gusto.',
  },
  color: {
    title: 'Colorimetría estacional',
    subtitle: 'Clasificación en 12 estaciones y distancia perceptual CIEDE2000.',
    milestone: 'M8 · v0.7',
    summary:
      'Define tu perfil de color con muestras guiadas y evalúa la armonía de cada prenda con tu paleta.',
  },
  memory: {
    title: 'Memoria y bóveda',
    subtitle: 'Control total sobre lo aprendido, cifrado AES-GCM y respaldos.',
    milestone: 'M3 · M10',
    summary:
      'Revisa, fija, pausa u olvida cualquier afinidad aprendida. Tus datos nunca salen del dispositivo.',
  },
};

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('fitting');

  return (
    <AppShell activeSection={activeSection} onSelectSection={setActiveSection}>
      {activeSection === 'fitting' ? (
        <FittingRoom />
      ) : (
        <PlaceholderSection section={activeSection} />
      )}
    </AppShell>
  );
}

function PlaceholderSection({ section }: { section: Exclude<NavSection, 'fitting'> }) {
  const current = PLACEHOLDER_SECTIONS[section];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="section-heading" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{current.milestone}</Badge>
          <Badge>Dominio v{DOMAIN_VERSION}</Badge>
        </div>
        <h1 id="section-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          {current.title}
        </h1>
        <p className="max-w-2xl text-base text-muted">{current.subtitle}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado del módulo</CardTitle>
            <CardDescription>Planificado en la hoja de ruta</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted">
            <p>{current.summary}</p>
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-xs text-ink">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                Privacidad por diseño: cálculo local (ej. pecho{' '}
                <span className="tabular-nums font-medium">92 cm = {cmToInches(92)} in</span>).
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paleta del mapa de calor</CardTitle>
            <CardDescription>
              Escala accesible para daltonismo con color, etiqueta y patrón
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {HEATMAP_TOKENS.map((item) => (
                <li
                  key={item.state}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2.5 font-medium text-ink">
                    <span
                      className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-border"
                      style={{ backgroundColor: item.hex }}
                      aria-hidden="true"
                    />
                    {item.label}
                  </span>
                  <span className="text-xs text-muted">
                    {item.patternLabel} · <span className="tabular-nums">{item.hex}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
