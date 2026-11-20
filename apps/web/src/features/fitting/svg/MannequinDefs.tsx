export interface MannequinDefsProps {
  prefix: string;
}

/**
 * Definiciones SVG compartidas para iluminación volumétrica de estudio del maniquí,
 * sombreado cilíndrico de telas (efecto 3D real) y texturas procedurales cuando no hay foto.
 * Cada ID se aísla con `prefix` para evitar colisiones entre vistas o tarjetas del carrusel.
 */
export function MannequinDefs({ prefix }: MannequinDefsProps) {
  return (
    <defs>
      {/* Volumen corporal principal (tono neutro escultórico con luz de estudio superior-izquierda) */}
      <linearGradient id={`${prefix}-body-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--mannequin-shadow)" />
        <stop offset="28%" stopColor="var(--mannequin-highlight)" />
        <stop offset="56%" stopColor="var(--mannequin-mid)" />
        <stop offset="86%" stopColor="var(--mannequin-shadow)" />
        <stop offset="100%" stopColor="var(--mannequin-rim)" />
      </linearGradient>

      {/* Volumen de extremidades (brazos y piernas con iluminación cilíndrica suave) */}
      <linearGradient id={`${prefix}-limb-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--mannequin-shadow)" />
        <stop offset="35%" stopColor="var(--mannequin-highlight)" />
        <stop offset="75%" stopColor="var(--mannequin-mid)" />
        <stop offset="100%" stopColor="var(--mannequin-shadow)" />
      </linearGradient>

      {/* Cabeza escultórica con luz suave superior-izquierda */}
      <radialGradient id={`${prefix}-head-grad`} cx="38%" cy="32%" r="68%">
        <stop offset="0%" stopColor="var(--mannequin-highlight)" />
        <stop offset="62%" stopColor="var(--mannequin-mid)" />
        <stop offset="100%" stopColor="var(--mannequin-shadow)" />
      </radialGradient>

      {/* Sombra sutil bajo mentón y cuello */}
      <linearGradient id={`${prefix}-neck-shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(0 0 0 / 22%)" />
        <stop offset="55%" stopColor="rgb(0 0 0 / 5%)" />
        <stop offset="100%" stopColor="rgb(0 0 0 / 0%)" />
      </linearGradient>

      {/* Sombreado cilíndrico 3D para prendas (se superpone a color o foto proyectada) */}
      <linearGradient id={`${prefix}-fabric-shade`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgb(0 0 0 / 24%)" />
        <stop offset="22%" stopColor="rgb(255 255 255 / 12%)" />
        <stop offset="46%" stopColor="rgb(255 255 255 / 18%)" />
        <stop offset="76%" stopColor="rgb(0 0 0 / 10%)" />
        <stop offset="100%" stopColor="rgb(0 0 0 / 28%)" />
      </linearGradient>

      {/* Sombreado vertical suave para caída de tela (pecho iluminado, pliegue inferior más profundo) */}
      <linearGradient id={`${prefix}-fabric-drape`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(255 255 255 / 12%)" />
        <stop offset="45%" stopColor="rgb(0 0 0 / 0%)" />
        <stop offset="100%" stopColor="rgb(0 0 0 / 16%)" />
      </linearGradient>

      {/* Sombra interior de cuello/escote */}
      <linearGradient id={`${prefix}-collar-depth`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(0 0 0 / 34%)" />
        <stop offset="100%" stopColor="rgb(0 0 0 / 8%)" />
      </linearGradient>

      {/* Patrón procedural: rayas sutiles */}
      <pattern
        id={`${prefix}-pat-striped`}
        width="10"
        height="9"
        patternUnits="userSpaceOnUse"
      >
        <rect width="10" height="3.5" fill="rgb(255 255 255 / 22%)" />
        <rect y="5" width="10" height="1" fill="rgb(0 0 0 / 12%)" />
      </pattern>

      {/* Patrón procedural: cuadros/plaid sutil */}
      <pattern
        id={`${prefix}-pat-plaid`}
        width="14"
        height="14"
        patternUnits="userSpaceOnUse"
      >
        <rect width="14" height="3" fill="rgb(0 0 0 / 14%)" />
        <rect width="3" height="14" fill="rgb(0 0 0 / 14%)" />
        <rect x="7" width="1.2" height="14" fill="rgb(255 255 255 / 18%)" />
        <rect y="7" width="14" height="1.2" fill="rgb(255 255 255 / 18%)" />
      </pattern>

      {/* Patrón procedural: textura tejida/lino */}
      <pattern
        id={`${prefix}-pat-textured`}
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 0 3 L 6 3 M 3 0 L 3 6"
          stroke="rgb(255 255 255 / 10%)"
          strokeWidth="0.7"
        />
        <circle cx="1.5" cy="1.5" r="0.5" fill="rgb(0 0 0 / 10%)" />
      </pattern>
    </defs>
  );
}
