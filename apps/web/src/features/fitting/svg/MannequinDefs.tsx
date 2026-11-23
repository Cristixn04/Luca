export interface MannequinDefsProps {
  prefix: string;
}

/**
 * Definiciones SVG de ilustración editorial anatómica para el avatar 2D (piel cálida
 * con volumen esculpido, sombreados musculares suaves, cabello en capas, ropa base
 * verde oliva mate y texturas/patrones de gemelo digital de prendas).
 */
export function MannequinDefs({ prefix }: MannequinDefsProps) {
  return (
    <defs>
      {/* Volumen corporal principal con iluminación de estudio suave */}
      <linearGradient id={`${prefix}-body-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--mannequin-shadow)" />
        <stop offset="16%" stopColor="var(--mannequin-mid)" />
        <stop offset="44%" stopColor="var(--mannequin-highlight)" />
        <stop offset="72%" stopColor="var(--mannequin-mid)" />
        <stop offset="92%" stopColor="var(--mannequin-shadow)" />
        <stop offset="100%" stopColor="var(--mannequin-rim)" />
      </linearGradient>

      {/* Volumen de perfil (espalda izquierda sombreada, frente derecha iluminada) */}
      <linearGradient id={`${prefix}-side-body-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--mannequin-shadow)" />
        <stop offset="28%" stopColor="var(--mannequin-mid)" />
        <stop offset="68%" stopColor="var(--mannequin-highlight)" />
        <stop offset="92%" stopColor="var(--mannequin-mid)" />
        <stop offset="100%" stopColor="var(--mannequin-rim)" />
      </linearGradient>

      {/* Volumen cilíndrico cálido para brazos y piernas */}
      <linearGradient id={`${prefix}-limb-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--mannequin-shadow)" />
        <stop offset="30%" stopColor="var(--mannequin-highlight)" />
        <stop offset="68%" stopColor="var(--mannequin-mid)" />
        <stop offset="100%" stopColor="var(--mannequin-shadow)" />
      </linearGradient>

      {/* Rostro modelado con luz frontal superior */}
      <radialGradient id={`${prefix}-head-grad`} cx="46%" cy="32%" r="66%">
        <stop offset="0%" stopColor="var(--mannequin-highlight)" />
        <stop offset="56%" stopColor="var(--mannequin-mid)" />
        <stop offset="100%" stopColor="var(--mannequin-shadow)" />
      </radialGradient>

      {/* Cabello castaño en capas con brillo cálido */}
      <linearGradient id={`${prefix}-hair-grad`} x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor="var(--avatar-hair-mid)" />
        <stop offset="30%" stopColor="var(--avatar-hair-hi)" />
        <stop offset="64%" stopColor="var(--avatar-hair-mid)" />
        <stop offset="100%" stopColor="var(--avatar-hair-dark)" />
      </linearGradient>

      {/* Brillo de mechones superiores del cabello */}
      <linearGradient id={`${prefix}-hair-highlight-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--avatar-hair-hi)" stopOpacity="0.92" />
        <stop offset="55%" stopColor="var(--avatar-hair-mid)" stopOpacity="0.45" />
        <stop offset="100%" stopColor="var(--avatar-hair-dark)" stopOpacity="0" />
      </linearGradient>

      {/* Ropa base verde oliva-carbón mate con relieve textil */}
      <linearGradient id={`${prefix}-basewear-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--avatar-basewear-shade)" />
        <stop offset="32%" stopColor="var(--avatar-basewear-hi)" />
        <stop offset="64%" stopColor="var(--avatar-basewear)" />
        <stop offset="100%" stopColor="var(--avatar-basewear-shade)" />
      </linearGradient>

      {/* Pretina elástica ligeramente más profunda para el bóxer/short base */}
      <linearGradient id={`${prefix}-basewear-band-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--avatar-basewear-stroke)" />
        <stop offset="34%" stopColor="var(--avatar-basewear)" />
        <stop offset="70%" stopColor="var(--avatar-basewear-shade)" />
        <stop offset="100%" stopColor="var(--avatar-basewear-stroke)" />
      </linearGradient>

      {/* Sombra anatómica cálida para planos musculares y contornos */}
      <linearGradient id={`${prefix}-muscle-shade`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(154 90 62 / 34%)" />
        <stop offset="100%" stopColor="rgb(154 90 62 / 10%)" />
      </linearGradient>

      {/* Sombra de núcleo más marcada para pectorales, omóplatos, glúteos y gemelos */}
      <linearGradient id={`${prefix}-skin-core-shade`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(142 78 52 / 44%)" />
        <stop offset="65%" stopColor="rgb(154 90 62 / 24%)" />
        <stop offset="100%" stopColor="rgb(154 90 62 / 8%)" />
      </linearGradient>

      {/* Brillo de piel sutil para relieves de pecho, deltoides y muslos */}
      <radialGradient id={`${prefix}-skin-sheen`} cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor="rgb(255 242 230 / 46%)" />
        <stop offset="100%" stopColor="rgb(255 242 230 / 0%)" />
      </radialGradient>

      {/* Rubor sutil en mejillas */}
      <radialGradient id={`${prefix}-cheek-blush`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgb(208 118 102 / 24%)" />
        <stop offset="100%" stopColor="rgb(208 118 102 / 0%)" />
      </radialGradient>

      {/* Sombra natural bajo mentón y cuello */}
      <linearGradient id={`${prefix}-neck-shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(98 54 36 / 44%)" />
        <stop offset="58%" stopColor="rgb(98 54 36 / 14%)" />
        <stop offset="100%" stopColor="rgb(98 54 36 / 0%)" />
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
