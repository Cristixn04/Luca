export interface MannequinDefsProps {
  prefix: string;
}

/**
 * Definiciones SVG compartidas para el avatar humano 2D realista (piel con volumen,
 * cabello estilizado, rubor sutil) y texturas/patrones de gemelo digital de prendas.
 * Cada ID se aísla con `prefix` para evitar colisiones entre vistas o tarjetas.
 */
export function MannequinDefs({ prefix }: MannequinDefsProps) {
  return (
    <defs>
      {/* Volumen corporal de piel humana natural con luz suave superior-izquierda */}
      <linearGradient id={`${prefix}-body-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--mannequin-shadow)" />
        <stop offset="26%" stopColor="var(--mannequin-highlight)" />
        <stop offset="56%" stopColor="var(--mannequin-mid)" />
        <stop offset="86%" stopColor="var(--mannequin-shadow)" />
        <stop offset="100%" stopColor="var(--mannequin-rim)" />
      </linearGradient>

      {/* Volumen de extremidades (brazos y piernas con iluminación cilíndrica de piel) */}
      <linearGradient id={`${prefix}-limb-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--mannequin-shadow)" />
        <stop offset="35%" stopColor="var(--mannequin-highlight)" />
        <stop offset="75%" stopColor="var(--mannequin-mid)" />
        <stop offset="100%" stopColor="var(--mannequin-shadow)" />
      </linearGradient>

      {/* Rostro con luz cálida suave y modelado sutil */}
      <radialGradient id={`${prefix}-head-grad`} cx="40%" cy="34%" r="66%">
        <stop offset="0%" stopColor="var(--mannequin-highlight)" />
        <stop offset="60%" stopColor="var(--mannequin-mid)" />
        <stop offset="100%" stopColor="var(--mannequin-shadow)" />
      </radialGradient>

      {/* Cabello realista con reflejo superior */}
      <linearGradient id={`${prefix}-hair-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--avatar-hair-mid)" />
        <stop offset="35%" stopColor="var(--avatar-hair-hi)" />
        <stop offset="68%" stopColor="var(--avatar-hair-mid)" />
        <stop offset="100%" stopColor="var(--avatar-hair-dark)" />
      </linearGradient>

      {/* Rubor sutil de mejillas */}
      <radialGradient id={`${prefix}-cheek-blush`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgb(214 128 118 / 28%)" />
        <stop offset="100%" stopColor="rgb(214 128 118 / 0%)" />
      </radialGradient>

      {/* Sombra natural bajo mentón y cuello */}
      <linearGradient id={`${prefix}-neck-shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(92 52 36 / 32%)" />
        <stop offset="55%" stopColor="rgb(92 52 36 / 8%)" />
        <stop offset="100%" stopColor="rgb(92 52 36 / 0%)" />
      </linearGradient>

      {/* Sombreado cilíndrico 3D para telas */}
      <linearGradient id={`${prefix}-fabric-shade`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgb(0 0 0 / 24%)" />
        <stop offset="22%" stopColor="rgb(255 255 255 / 12%)" />
        <stop offset="46%" stopColor="rgb(255 255 255 / 18%)" />
        <stop offset="76%" stopColor="rgb(0 0 0 / 10%)" />
        <stop offset="100%" stopColor="rgb(0 0 0 / 28%)" />
      </linearGradient>

      {/* Sombreado vertical suave para caída de tela */}
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

      {/* Patrón procedural: rayas horizontales */}
      <pattern id={`${prefix}-pat-striped`} width="12" height="9" patternUnits="userSpaceOnUse">
        <rect width="12" height="3.4" fill="rgb(255 255 255 / 26%)" />
        <rect y="5.2" width="12" height="1" fill="rgb(0 0 0 / 12%)" />
      </pattern>

      {/* Patrón procedural: rayas verticales */}
      <pattern id={`${prefix}-pat-vstriped`} width="9" height="12" patternUnits="userSpaceOnUse">
        <rect width="3" height="12" fill="rgb(255 255 255 / 24%)" />
        <rect x="5" width="1" height="12" fill="rgb(0 0 0 / 11%)" />
      </pattern>

      {/* Patrón procedural: cuadros/plaid */}
      <pattern id={`${prefix}-pat-plaid`} width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="3" fill="rgb(0 0 0 / 16%)" />
        <rect width="3" height="14" fill="rgb(0 0 0 / 16%)" />
        <rect x="7" width="1.3" height="14" fill="rgb(255 255 255 / 22%)" />
        <rect y="7" width="14" height="1.3" fill="rgb(255 255 255 / 22%)" />
      </pattern>

      {/* Patrón procedural: lunares sencillos */}
      <pattern id={`${prefix}-pat-dots`} width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="3.5" cy="3.5" r="1.5" fill="rgb(255 255 255 / 32%)" />
        <circle cx="9.5" cy="9.5" r="1.5" fill="rgb(255 255 255 / 32%)" />
      </pattern>

      {/* Patrón procedural: canalé / ribbed */}
      <pattern id={`${prefix}-pat-ribbed`} width="4" height="10" patternUnits="userSpaceOnUse">
        <line x1="1" y1="0" x2="1" y2="10" stroke="rgb(255 255 255 / 14%)" strokeWidth="0.8" />
        <line x1="2.8" y1="0" x2="2.8" y2="10" stroke="rgb(0 0 0 / 12%)" strokeWidth="0.8" />
      </pattern>

      {/* Patrón procedural: textura tejida/lino */}
      <pattern id={`${prefix}-pat-textured`} width="6" height="6" patternUnits="userSpaceOnUse">
        <path
          d="M 0 3 L 6 3 M 3 0 L 3 6"
          stroke="rgb(255 255 255 / 11%)"
          strokeWidth="0.7"
          fill="none"
        />
      </pattern>
    </defs>
  );
}
