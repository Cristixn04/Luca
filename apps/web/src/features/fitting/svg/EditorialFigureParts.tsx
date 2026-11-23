import type { MannequinRig } from './mannequinRig';

interface EditorialPartProps {
  rig: MannequinRig;
  patternPrefix: string;
}

/**
 * Capa trasera de cabello para la vista frontal femenina (se dibuja detrás del cuello y hombros).
 */
export function EditorialFemaleBackHair({ rig }: { rig: MannequinRig }) {
  const { cx, headRx, headRy, headCenterY, chinY, shoulderY } = rig;
  return (
    <g pointerEvents="none">
      <path
        d={[
          `M ${cx - headRx * 1.18} ${headCenterY - headRy * 0.22}`,
          `C ${cx - headRx * 1.54} ${chinY + 2}, ${cx - headRx * 1.62} ${shoulderY + 5}, ${cx - headRx * 1.24} ${shoulderY + 23}`,
          `Q ${cx - headRx * 0.55} ${shoulderY + 29} ${cx} ${shoulderY + 26}`,
          `Q ${cx + headRx * 0.55} ${shoulderY + 29} ${cx + headRx * 1.24} ${shoulderY + 23}`,
          `C ${cx + headRx * 1.62} ${shoulderY + 5}, ${cx + headRx * 1.54} ${chinY + 2}, ${cx + headRx * 1.18} ${headCenterY - headRy * 0.22}`,
          'Z',
        ].join(' ')}
        fill="var(--avatar-hair-dark)"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path
        d={`M ${cx - headRx * 1.24} ${chinY + 4} Q ${cx - headRx * 1.38} ${shoulderY + 8} ${cx - headRx * 1.05} ${shoulderY + 20} M ${cx + headRx * 1.24} ${chinY + 4} Q ${cx + headRx * 1.38} ${shoulderY + 8} ${cx + headRx * 1.05} ${shoulderY + 20}`}
        fill="none"
        stroke="var(--avatar-hair-mid)"
        strokeWidth="0.95"
        strokeLinecap="round"
        opacity="0.58"
      />
    </g>
  );
}

/**
 * Retrato frontal de ilustración editorial (rostro esculpido de expresión serena,
 * orejas con hélix, mirada natural, nariz con sombreado tonal y cabello castaño en capas).
 */
export function EditorialFrontHead({ rig, patternPrefix }: EditorialPartProps) {
  const { cx, headRx, headRy, headTopY, headCenterY, chinY, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const headClipId = `${patternPrefix}-front-head-clip`;

  const jawX = headRx * (isFemale ? 0.78 : 0.87);
  const jawY = headCenterY + headRy * (isFemale ? 0.5 : 0.54);
  const chinHalf = headRx * (isFemale ? 0.21 : 0.32);

  const headPath = [
    `M ${cx} ${headTopY}`,
    `C ${cx + headRx * 1.02} ${headTopY}, ${cx + headRx * 1.04} ${headCenterY - headRy * 0.14}, ${cx + headRx * 0.96} ${headCenterY + headRy * 0.14}`,
    `C ${cx + headRx * 0.93} ${headCenterY + headRy * 0.35}, ${cx + jawX + 0.5} ${jawY - 1.5}, ${cx + jawX * 0.88} ${jawY + 1.8}`,
    `C ${cx + headRx * 0.56} ${chinY - 2.2}, ${cx + chinHalf} ${chinY}, ${cx} ${chinY}`,
    `C ${cx - chinHalf} ${chinY}, ${cx - headRx * 0.56} ${chinY - 2.2}, ${cx - jawX * 0.88} ${jawY + 1.8}`,
    `C ${cx - jawX - 0.5} ${jawY - 1.5}, ${cx - headRx * 0.93} ${headCenterY + headRy * 0.35}, ${cx - headRx * 0.96} ${headCenterY + headRy * 0.14}`,
    `C ${cx - headRx * 1.04} ${headCenterY - headRy * 0.14}, ${cx - headRx * 1.02} ${headTopY}, ${cx} ${headTopY}`,
    'Z',
  ].join(' ');

  return (
    <g>
      <defs>
        <clipPath id={headClipId}>
          <path d={headPath} />
        </clipPath>
      </defs>

      {/* Orejas anatómicas con hélix interior */}
      {([-1, 1] as const).map((side) => {
        const ex = cx + side * headRx * 0.94;
        const ey = headCenterY + 1.8;
        return (
          <g key={`ear-${side}`}>
            <path
              d={[
                `M ${ex} ${ey - 4.8}`,
                `C ${ex + side * 3.2} ${ey - 5}, ${ex + side * 3.4} ${ey + 0.8}, ${ex + side * 2.1} ${ey + 4.1}`,
                `C ${ex + side * 1.4} ${ey + 5.6}, ${ex + side * 0.2} ${ey + 5.7}, ${ex - side * 0.4} ${ey + 4.2}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-limb-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d={`M ${ex + side * 0.6} ${ey - 2.4} Q ${ex + side * 2} ${ey + 0.2} ${ex + side * 0.9} ${ey + 2.6}`}
              fill="none"
              stroke="var(--mannequin-detail)"
              strokeWidth="0.6"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Base facial con volumen cálido */}
      <path d={headPath} fill={`url(#${patternPrefix}-head-grad)`} />

      {/* Planos de sombreado editorial recortados al rostro */}
      <g clipPath={`url(#${headClipId})`} pointerEvents="none">
        <path
          d={[
            `M ${cx - headRx * 1.08} ${headTopY}`,
            `L ${cx - headRx * 0.7} ${headTopY}`,
            `C ${cx - headRx * 0.8} ${headCenterY}, ${cx - headRx * 0.64} ${jawY}, ${cx - chinHalf * 0.9} ${chinY + 1}`,
            `L ${cx - headRx * 1.08} ${chinY + 1}`,
            'Z',
          ].join(' ')}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.62"
        />
        <path
          d={[
            `M ${cx + headRx * 1.08} ${headTopY}`,
            `L ${cx + headRx * 0.7} ${headTopY}`,
            `C ${cx + headRx * 0.8} ${headCenterY}, ${cx + headRx * 0.64} ${jawY}, ${cx + chinHalf * 0.9} ${chinY + 1}`,
            `L ${cx + headRx * 1.08} ${chinY + 1}`,
            'Z',
          ].join(' ')}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.72"
        />
        {/* Sombra suave del cabello en la frente */}
        <path
          d={`M ${cx - headRx} ${headTopY + 5} Q ${cx} ${headTopY + 10.5} ${cx + headRx} ${headTopY + 5} L ${cx + headRx} ${headTopY} L ${cx - headRx} ${headTopY} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
          opacity="0.34"
        />
        {/* Brillo suave en frente y puente nasal */}
        <ellipse
          cx={cx}
          cy={headCenterY - headRy * 0.34}
          rx={headRx * 0.44}
          ry={headRy * 0.16}
          fill={`url(#${patternPrefix}-skin-sheen)`}
        />
        <ellipse
          cx={cx - headRx * 0.45}
          cy={headCenterY + 3.8}
          rx={4}
          ry={2.2}
          fill={`url(#${patternPrefix}-cheek-blush)`}
        />
        <ellipse
          cx={cx + headRx * 0.45}
          cy={headCenterY + 3.8}
          rx={4}
          ry={2.2}
          fill={`url(#${patternPrefix}-cheek-blush)`}
        />
        {/* Modelado tonal suave del puente y punta nasal */}
        <path
          d={`M ${cx + 0.6} ${headCenterY - 2.4} L ${cx + 1.8} ${headCenterY + 4.4} Q ${cx} ${headCenterY + 5.5} ${cx - 1.6} ${headCenterY + 4.5} L ${cx - 0.3} ${headCenterY + 3.3} Z`}
          fill="var(--mannequin-shade-deep)"
          opacity="0.46"
        />
        {/* Sombra suave bajo el labio inferior */}
        <path
          d={`M ${cx - 2.5} ${headCenterY + 11.4} Q ${cx} ${headCenterY + 12.7} ${cx + 2.5} ${headCenterY + 11.4} Q ${cx} ${headCenterY + 13.8} ${cx - 2.5} ${headCenterY + 11.4} Z`}
          fill="var(--mannequin-shade-deep)"
          opacity="0.48"
        />
      </g>

      {/* Contorno de tinta espresso del rostro */}
      <path
        d={headPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.12"
        strokeLinejoin="round"
      />

      {/* Rasgos faciales serenos estilo ilustración editorial */}
      <g pointerEvents="none">
        {/* Cejas naturales relajadas */}
        {([-1, 1] as const).map((side) => (
          <path
            key={`brow-${side}`}
            d={
              isFemale
                ? `M ${cx + side * headRx * 0.16} ${headCenterY - 4.9} Q ${cx + side * headRx * 0.42} ${headCenterY - 6.7} ${cx + side * headRx * 0.69} ${headCenterY - 5.1}`
                : `M ${cx + side * headRx * 0.15} ${headCenterY - 4.8} Q ${cx + side * headRx * 0.44} ${headCenterY - 6.2} ${cx + side * headRx * 0.71} ${headCenterY - 4.9}`
            }
            fill="none"
            stroke="var(--avatar-hair-dark)"
            strokeWidth={isFemale ? '0.95' : '1.3'}
            strokeLinecap="round"
            opacity="0.88"
          />
        ))}

        {/* Ojos almendrados con párpado, iris castaño y brillo */}
        {([-1, 1] as const).map((side) => {
          const ex = cx + side * headRx * 0.39;
          const ey = headCenterY - 1.3;
          return (
            <g key={`eye-${side}`}>
              <path
                d={`M ${ex - 2.7} ${ey - 1.9} Q ${ex} ${ey - 2.9} ${ex + 2.7} ${ey - 1.9}`}
                fill="none"
                stroke="var(--mannequin-detail)"
                strokeWidth="0.45"
                strokeLinecap="round"
                opacity="0.72"
              />
              <path
                d={`M ${ex - 2.9} ${ey + 0.1} Q ${ex} ${ey - 1.8} ${ex + 2.9} ${ey + 0.1} Q ${ex} ${ey + 1.55} ${ex - 2.9} ${ey + 0.1} Z`}
                fill="#faf7f4"
              />
              <circle cx={ex} cy={ey} r={1.3} fill="var(--avatar-iris)" />
              <circle cx={ex} cy={ey} r={0.62} fill="#16110e" />
              <circle cx={ex - 0.42} cy={ey - 0.42} r={0.36} fill="#ffffff" />
              <path
                d={`M ${ex - 3} ${ey + 0.1} Q ${ex} ${ey - 2} ${ex + 3} ${ey + 0.1}`}
                fill="none"
                stroke="var(--mannequin-stroke)"
                strokeWidth={isFemale ? '0.95' : '0.82'}
                strokeLinecap="round"
              />
              <path
                d={`M ${ex - 2.1} ${ey + 0.85} Q ${ex} ${ey + 1.45} ${ex + 2.1} ${ey + 0.85}`}
                fill="none"
                stroke="var(--mannequin-detail)"
                strokeWidth="0.38"
                strokeLinecap="round"
                opacity="0.7"
              />
            </g>
          );
        })}

        {/* Nariz sutil (sin trazos bruscos) */}
        <path
          d={`M ${cx - 1.8} ${headCenterY + 4.3} Q ${cx - 1.1} ${headCenterY + 4.8} ${cx - 0.4} ${headCenterY + 4.65} Q ${cx} ${headCenterY + 5.05} ${cx + 0.4} ${headCenterY + 4.65} Q ${cx + 1.1} ${headCenterY + 4.8} ${cx + 1.8} ${headCenterY + 4.3}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.62"
          strokeLinecap="round"
          opacity="0.82"
        />

        {/* Labios editoriales serenos */}
        <path
          d={`M ${cx - 4.1} ${headCenterY + 8.6} Q ${cx - 1.6} ${headCenterY + 7.5} ${cx} ${headCenterY + 8.05} Q ${cx + 1.6} ${headCenterY + 7.5} ${cx + 4.1} ${headCenterY + 8.6} Q ${cx} ${headCenterY + 10.9} ${cx - 4.1} ${headCenterY + 8.6} Z`}
          fill="var(--avatar-lip)"
          opacity={isFemale ? '0.8' : '0.58'}
        />
        <path
          d={`M ${cx - 3.9} ${headCenterY + 8.65} Q ${cx} ${headCenterY + 9.2} ${cx + 3.9} ${headCenterY + 8.65}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.52"
          strokeLinecap="round"
          opacity="0.76"
        />
        <path
          d={`M ${cx - 1.8} ${headCenterY + 10.7} Q ${cx} ${headCenterY + 11.15} ${cx + 1.8} ${headCenterY + 10.7}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.42"
          strokeLinecap="round"
        />
      </g>

      {/* Cabello castaño en capas con volumen orgánico fiel a la referencia */}
      {isFemale ? (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - headRx * 1.18} ${headCenterY + 3}`,
              `C ${cx - headRx * 1.3} ${headTopY + 1}, ${cx - headRx * 0.6} ${headTopY - 5.6}, ${cx} ${headTopY - 5}`,
              `C ${cx + headRx * 0.6} ${headTopY - 5.6}, ${cx + headRx * 1.3} ${headTopY + 1}, ${cx + headRx * 1.18} ${headCenterY + 3}`,
              `C ${cx + headRx * 1.02} ${headCenterY - 4.5}, ${cx + headRx * 0.62} ${headTopY + 6.5}, ${cx + 2} ${headTopY + 7.2}`,
              `C ${cx - headRx * 0.55} ${headTopY + 6.2}, ${cx - headRx * 1.0} ${headCenterY - 4.5}, ${cx - headRx * 1.18} ${headCenterY + 3}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
          <path
            d={`M ${cx - headRx * 0.72} ${headTopY + 1.5} Q ${cx - headRx * 0.12} ${headTopY - 2.4} ${cx + headRx * 0.18} ${headTopY + 5.8} M ${cx + headRx * 0.22} ${headTopY - 2} Q ${cx + headRx * 0.74} ${headTopY + 0.5} ${cx + headRx * 0.98} ${headCenterY - 4}`}
            fill="none"
            stroke="var(--avatar-hair-hi)"
            strokeWidth="0.95"
            strokeLinecap="round"
            opacity="0.72"
          />
        </g>
      ) : (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - headRx * 0.98} ${headCenterY - 0.5}`,
              `C ${cx - headRx * 1.2} ${headCenterY - 7}, ${cx - headRx * 1.22} ${headTopY + 1.5}, ${cx - headRx * 0.88} ${headTopY - 3.6}`,
              `C ${cx - headRx * 0.56} ${headTopY - 8.2}, ${cx + headRx * 0.06} ${headTopY - 9.2}, ${cx + headRx * 0.54} ${headTopY - 6.8}`,
              `C ${cx + headRx * 0.92} ${headTopY - 5.8}, ${cx + headRx * 1.22} ${headTopY + 0.8}, ${cx + headRx * 1.16} ${headCenterY - 6.2}`,
              `C ${cx + headRx * 1.14} ${headCenterY - 2}, ${cx + headRx * 1.04} ${headCenterY - 0.5}, ${cx + headRx * 0.96} ${headCenterY + 0.4}`,
              `C ${cx + headRx * 0.9} ${headCenterY - 7}, ${cx + headRx * 0.7} ${headTopY + 7.6}, ${cx + headRx * 0.28} ${headTopY + 6.6}`,
              `Q ${cx - headRx * 0.12} ${headTopY + 8.4} ${cx - headRx * 0.46} ${headTopY + 5.8}`,
              `C ${cx - headRx * 0.76} ${headTopY + 7}, ${cx - headRx * 0.92} ${headCenterY - 6.2}, ${cx - headRx * 0.98} ${headCenterY - 0.5}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.08"
            strokeLinejoin="round"
          />
          <path
            d={[
              `M ${cx - headRx * 0.7} ${headTopY + 2.4}`,
              `Q ${cx - headRx * 0.14} ${headTopY - 5.2} ${cx + headRx * 0.6} ${headTopY - 2.6}`,
              `Q ${cx + headRx * 0.12} ${headTopY + 1.6} ${cx - headRx * 0.48} ${headTopY + 4.4}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-highlight-grad)`}
          />
          <path
            d={`M ${cx - headRx * 0.74} ${headTopY + 0.8} Q ${cx - headRx * 0.18} ${headTopY - 4.4} ${cx + headRx * 0.46} ${headTopY - 3.4} M ${cx - headRx * 0.34} ${headTopY + 4.6} Q ${cx + headRx * 0.24} ${headTopY + 1.2} ${cx + headRx * 0.82} ${headTopY + 2.2}`}
            fill="none"
            stroke="var(--avatar-hair-dark)"
            strokeWidth="0.72"
            strokeLinecap="round"
            opacity="0.68"
          />
        </g>
      )}
    </g>
  );
}

/**
 * Cabeza y rostro de perfil anatómico derecho con proporciones craneales equilibradas,
 * nariz recta natural, labios definidos, oreja esculpida y cabello barrido hacia atrás.
 */
export function EditorialSideHead({ rig, patternPrefix }: EditorialPartProps) {
  const { cx, headTopY, headCenterY, chinY, headRy: hr, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const sideHeadClipId = `${patternPrefix}-side-head-clip`;

  const profileHeadPath = [
    `M ${cx - hr * 0.14} ${headTopY}`,
    // Frente y arco superciliar natural
    `C ${cx + hr * 0.42} ${headTopY}, ${cx + hr * 0.6} ${headCenterY - hr * 0.48}, ${cx + hr * 0.62} ${headCenterY - hr * 0.22}`,
    // Puente nasal y nariz recta proporcionada
    `Q ${cx + hr * 0.6} ${headCenterY - hr * 0.1} ${cx + hr * 0.65} ${headCenterY - hr * 0.02}`,
    `L ${cx + hr * 0.81} ${headCenterY + hr * 0.17}`,
    `Q ${cx + hr * 0.82} ${headCenterY + hr * 0.25} ${cx + hr * 0.67} ${headCenterY + hr * 0.27}`,
    // Filtrum, labio superior, labio inferior y mentón firme
    `Q ${cx + hr * 0.7} ${headCenterY + hr * 0.36} ${cx + hr * 0.72} ${headCenterY + hr * 0.42}`,
    `Q ${cx + hr * 0.66} ${headCenterY + hr * 0.47} ${cx + hr * 0.64} ${headCenterY + hr * 0.48}`,
    `Q ${cx + hr * 0.7} ${headCenterY + hr * 0.56} ${cx + hr * 0.63} ${headCenterY + hr * 0.64}`,
    `Q ${cx + hr * 0.68} ${chinY - 2.6} ${cx + hr * 0.48} ${chinY}`,
    `C ${cx + hr * 0.2} ${chinY + 0.3}, ${cx - hr * 0.08} ${chinY - 2.8}, ${cx - hr * 0.28} ${headCenterY + hr * 0.58}`,
    // Cráneo posterior lleno y redondeado
    `C ${cx - hr * 0.64} ${headCenterY + hr * 0.5}, ${cx - hr * 0.9} ${headCenterY + hr * 0.14}, ${cx - hr * 0.86} ${headTopY + hr * 0.24}`,
    `C ${cx - hr * 0.78} ${headTopY + 1}, ${cx - hr * 0.46} ${headTopY}, ${cx - hr * 0.14} ${headTopY}`,
    'Z',
  ].join(' ');

  const earX = cx - hr * 0.18;
  const earY = headCenterY + 2.2;

  return (
    <g>
      <defs>
        <clipPath id={sideHeadClipId}>
          <path d={profileHeadPath} />
        </clipPath>
      </defs>

      <path d={profileHeadPath} fill={`url(#${patternPrefix}-side-body-grad)`} />

      <g clipPath={`url(#${sideHeadClipId})`} pointerEvents="none">
        <path
          d={[
            `M ${cx + hr * 0.48} ${chinY + 1}`,
            `C ${cx + hr * 0.2} ${chinY - 2.2}, ${cx + hr * 0.02} ${headCenterY + hr * 0.48}, ${cx - hr * 0.12} ${headCenterY + hr * 0.24}`,
            `L ${cx - hr * 0.72} ${headCenterY + hr * 0.72}`,
            `L ${cx + hr * 0.48} ${chinY + 2}`,
            'Z',
          ].join(' ')}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.65"
        />
        <ellipse
          cx={cx + hr * 0.34}
          cy={headCenterY + 3.4}
          rx={3.6}
          ry={2.2}
          fill={`url(#${patternPrefix}-cheek-blush)`}
        />
      </g>

      <path
        d={profileHeadPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.12"
        strokeLinejoin="round"
      />

      {/* Rasgos de perfil equilibrados */}
      <g pointerEvents="none">
        <path
          d={`M ${cx + hr * 0.28} ${headCenterY - 4.7} Q ${cx + hr * 0.46} ${headCenterY - 5.6} ${cx + hr * 0.61} ${headCenterY - 4.3}`}
          fill="none"
          stroke="var(--avatar-hair-dark)"
          strokeWidth={isFemale ? '0.9' : '1.25'}
          strokeLinecap="round"
          opacity="0.88"
        />
        <path
          d={`M ${cx + hr * 0.36} ${headCenterY - 1.2} Q ${cx + hr * 0.48} ${headCenterY - 2.3} ${cx + hr * 0.58} ${headCenterY - 1.2} Q ${cx + hr * 0.48} ${headCenterY - 0.1} ${cx + hr * 0.36} ${headCenterY - 1.2} Z`}
          fill="#faf7f4"
        />
        <ellipse
          cx={cx + hr * 0.52}
          cy={headCenterY - 1.2}
          rx={0.85}
          ry={1.1}
          fill="var(--avatar-iris)"
        />
        <circle cx={cx + hr * 0.53} cy={headCenterY - 1.2} r={0.45} fill="#14100d" />
        <circle cx={cx + hr * 0.5} cy={headCenterY - 1.55} r={0.28} fill="#ffffff" />
        <path
          d={`M ${cx + hr * 0.35} ${headCenterY - 1.2} Q ${cx + hr * 0.48} ${headCenterY - 2.5} ${cx + hr * 0.6} ${headCenterY - 1.3}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth={isFemale ? '0.9' : '0.8'}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx + hr * 0.6} ${headCenterY + hr * 0.21} Q ${cx + hr * 0.65} ${headCenterY + hr * 0.24} ${cx + hr * 0.68} ${headCenterY + hr * 0.22}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.58"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx + hr * 0.52} ${headCenterY + hr * 0.49} Q ${cx + hr * 0.61} ${headCenterY + hr * 0.5} ${cx + hr * 0.67} ${headCenterY + hr * 0.48}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx + hr * 0.08} ${chinY - 2.4} Q ${cx - hr * 0.1} ${headCenterY + hr * 0.52} ${earX + 1.2} ${earY + 3.6}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.68"
        />
      </g>

      {/* Cabello lateral en capas con volumen barrido hacia atrás */}
      <g pointerEvents="none">
        {isFemale ? (
          <>
            <path
              d={[
                `M ${cx + hr * 0.56} ${headTopY + 1.8}`,
                `C ${cx + hr * 0.28} ${headTopY - 5.8}, ${cx - hr * 0.78} ${headTopY - 4}, ${cx - hr * 1.02} ${headCenterY + 3}`,
                `C ${cx - hr * 1.15} ${chinY + 12}, ${cx - hr * 1.02} ${rig.shoulderY + 16}, ${cx - hr * 0.5} ${rig.shoulderY + 22}`,
                `C ${cx - hr * 0.16} ${rig.shoulderY + 14}, ${cx - hr * 0.16} ${chinY + 5}, ${earX - 0.5} ${earY + 5.2}`,
                `C ${earX + 1.2} ${earY - 3.2}, ${cx + hr * 0.14} ${headTopY + 6.4}, ${cx + hr * 0.56} ${headTopY + 1.8}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-hair-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="1.05"
              strokeLinejoin="round"
            />
            <path
              d={`M ${cx + hr * 0.18} ${headTopY + 0.8} C ${cx - hr * 0.46} ${headTopY - 0.8}, ${cx - hr * 0.84} ${headCenterY + 6}, ${cx - hr * 0.72} ${rig.shoulderY + 10}`}
              fill="none"
              stroke="var(--avatar-hair-hi)"
              strokeWidth="0.95"
              strokeLinecap="round"
              opacity="0.68"
            />
          </>
        ) : (
          <>
            <path
              d={[
                `M ${cx + hr * 0.58} ${headTopY + 2.4}`,
                `C ${cx + hr * 0.74} ${headTopY - 3}, ${cx + hr * 0.36} ${headTopY - 8.4}, ${cx - hr * 0.14} ${headTopY - 6.8}`,
                `C ${cx - hr * 0.68} ${headTopY - 6.2}, ${cx - hr * 1.04} ${headTopY + 0.8}, ${cx - hr * 1.02} ${headCenterY + 3.6}`,
                `C ${cx - hr * 0.98} ${headCenterY + hr * 0.52}, ${cx - hr * 0.78} ${chinY - 4.5}, ${cx - hr * 0.56} ${chinY - 1.4}`,
                `L ${cx - hr * 0.36} ${chinY - 3.6}`,
                `C ${cx - hr * 0.42} ${earY + 4.4}, ${earX - 2.6} ${earY + 4.8}, ${earX - 1.6} ${earY - 2.8}`,
                `C ${earX + 1.6} ${earY - 4.8}, ${earX + 2.6} ${earY + 1.2}, ${earX + 3.4} ${earY + 1.8}`,
                `L ${earX + 4.2} ${earY - 3.8}`,
                `C ${cx + hr * 0.12} ${headCenterY - 6.6}, ${cx + hr * 0.32} ${headTopY + 6.4}, ${cx + hr * 0.58} ${headTopY + 2.4}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-hair-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="1.08"
              strokeLinejoin="round"
            />
            <path
              d={`M ${cx + hr * 0.46} ${headTopY + 0.4} Q ${cx - hr * 0.05} ${headTopY - 5.2} ${cx - hr * 0.72} ${headTopY + 2.2} M ${cx + hr * 0.28} ${headTopY + 3.4} Q ${cx - hr * 0.28} ${headTopY + 0.4} ${cx - hr * 0.84} ${headCenterY + 2.6}`}
              fill="none"
              stroke="var(--avatar-hair-hi)"
              strokeWidth="0.95"
              strokeLinecap="round"
              opacity="0.72"
            />
          </>
        )}
      </g>

      {/* Oreja esculpida de perfil */}
      <g>
        <path
          d={[
            `M ${earX + 0.6} ${earY - 4.4}`,
            `C ${earX - 3.8} ${earY - 5}, ${earX - 4.4} ${earY + 2.4}, ${earX - 1.4} ${earY + 5}`,
            `C ${earX + 0.4} ${earY + 5.8}, ${earX + 1.8} ${earY + 3.8}, ${earX + 1.2} ${earY + 1.2}`,
          ].join(' ')}
          fill={`url(#${patternPrefix}-limb-grad)`}
          stroke="var(--mannequin-stroke)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${earX - 0.6} ${earY - 2.2} C ${earX - 2.5} ${earY - 1.6}, ${earX - 2.5} ${earY + 2.2}, ${earX - 0.6} ${earY + 2.5}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

/**
 * Cabeza trasera editorial con volumen craneal natural, orejas simétricas y degradado en nuca.
 */
export function EditorialBackHead({ rig, patternPrefix }: EditorialPartProps) {
  const { cx, headRx, headRy, headTopY, headCenterY, neckHalf, chinY, shoulderY, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const napeY = headCenterY + headRy * 0.84;

  return (
    <g>
      {([-1, 1] as const).map((side) => {
        const ex = cx + side * headRx * 0.96;
        const ey = headCenterY + 1.8;
        return (
          <g key={`back-ear-${side}`}>
            <path
              d={[
                `M ${ex} ${ey - 4.4}`,
                `C ${ex + side * 3.2} ${ey - 4.6}, ${ex + side * 3.3} ${ey + 1.2}, ${ex + side * 1.9} ${ey + 4.1}`,
                `C ${ex + side * 1.1} ${ey + 5.3}, ${ex} ${ey + 5.1}, ${ex - side * 0.4} ${ey + 3.8}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-limb-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d={`M ${ex + side * 1.2} ${ey - 1.8} Q ${ex + side * 1.8} ${ey + 0.8} ${ex + side * 0.9} ${ey + 2.9}`}
              fill="none"
              stroke="var(--mannequin-detail)"
              strokeWidth="0.6"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {isFemale ? (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - headRx * 1.18} ${headCenterY - 2}`,
              `C ${cx - headRx * 1.3} ${headTopY + 1}, ${cx - headRx * 0.58} ${headTopY - 5.6}, ${cx} ${headTopY - 5}`,
              `C ${cx + headRx * 0.58} ${headTopY - 5.6}, ${cx + headRx * 1.3} ${headTopY + 1}, ${cx + headRx * 1.18} ${headCenterY - 2}`,
              `C ${cx + headRx * 1.56} ${chinY + 8}, ${cx + headRx * 1.58} ${shoulderY + 8}, ${cx + headRx * 1.22} ${shoulderY + 24}`,
              `Q ${cx + headRx * 0.45} ${shoulderY + 30} ${cx} ${shoulderY + 26}`,
              `Q ${cx - headRx * 0.45} ${shoulderY + 30} ${cx - headRx * 1.22} ${shoulderY + 24}`,
              `C ${cx - headRx * 1.58} ${shoulderY + 8}, ${cx - headRx * 1.56} ${chinY + 8}, ${cx - headRx * 1.18} ${headCenterY - 2}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.08"
            strokeLinejoin="round"
          />
          <path
            d={`M ${cx - headRx * 0.56} ${headTopY + 4} C ${cx - headRx * 0.88} ${chinY + 4}, ${cx - headRx * 0.82} ${shoulderY + 10}, ${cx - headRx * 0.52} ${shoulderY + 22} M ${cx + headRx * 0.56} ${headTopY + 4} C ${cx + headRx * 0.88} ${chinY + 4}, ${cx + headRx * 0.82} ${shoulderY + 10}, ${cx + headRx * 0.52} ${shoulderY + 22}`}
            fill="none"
            stroke="var(--avatar-hair-hi)"
            strokeWidth="0.95"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      ) : (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - headRx * 1.04} ${headCenterY + 1.2}`,
              `C ${cx - headRx * 1.22} ${headCenterY - 6.5}, ${cx - headRx * 1.22} ${headTopY + 1}, ${cx - headRx * 0.84} ${headTopY - 3.8}`,
              `C ${cx - headRx * 0.46} ${headTopY - 8.2}, ${cx + headRx * 0.14} ${headTopY - 8.8}, ${cx + headRx * 0.58} ${headTopY - 6.4}`,
              `C ${cx + headRx * 0.96} ${headTopY - 5.4}, ${cx + headRx * 1.24} ${headTopY + 1}, ${cx + headRx * 1.04} ${headCenterY + 1.2}`,
              `C ${cx + headRx * 0.96} ${napeY - 4}, ${cx + neckHalf + 0.8} ${napeY + 0.6}, ${cx + neckHalf * 0.72} ${napeY + 2.4}`,
              `Q ${cx} ${napeY + 3.8} ${cx - neckHalf * 0.72} ${napeY + 2.4}`,
              `C ${cx - neckHalf - 0.8} ${napeY + 0.6}, ${cx - headRx * 0.96} ${napeY - 4}, ${cx - headRx * 1.04} ${headCenterY + 1.2}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d={`M ${cx - headRx * 0.92} ${headCenterY + 3.8} Q ${cx} ${headCenterY + 8.5} ${cx + headRx * 0.92} ${headCenterY + 3.8} C ${cx + neckHalf + 0.6} ${napeY + 0.8}, ${cx + neckHalf * 0.7} ${napeY + 2.4}, ${cx} ${napeY + 3.1} C ${cx - neckHalf * 0.7} ${napeY + 2.4}, ${cx - neckHalf - 0.6} ${napeY + 0.8}, ${cx - headRx * 0.92} ${headCenterY + 3.8} Z`}
            fill="var(--avatar-hair-dark)"
            opacity="0.45"
          />
          <path
            d={`M ${cx - headRx * 0.68} ${headTopY + 1.2} Q ${cx - headRx * 0.1} ${headTopY - 4.4} ${cx + headRx * 0.52} ${headTopY - 0.8} M ${cx - headRx * 0.52} ${headCenterY - 3.5} Q ${cx} ${headCenterY - 6.8} ${cx + headRx * 0.58} ${headCenterY - 2.6} M ${cx - headRx * 0.24} ${headCenterY + 3} Q ${cx + headRx * 0.04} ${headCenterY + 8} ${cx - headRx * 0.04} ${napeY + 1.4}`}
            fill="none"
            stroke="var(--avatar-hair-hi)"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.62"
          />
        </g>
      )}
    </g>
  );
}

/**
 * Ropa base editorial verde oliva-carbón mate (#4D584F) recortada limpiamente al contorno real
 * del cuerpo (cero huecos en cadera para Mujer y Hombre) con pretina elástica y costuras.
 */
export function EditorialBasewear({
  view,
  rig,
  patternPrefix,
  bodyClipId,
}: EditorialPartProps & { view: 'front' | 'side' | 'back'; bodyClipId: string }) {
  const { cx, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const waistTopY = Math.max(rig.waistY + 1, rig.hipY - 14.5);
  const bandBottomY = waistTopY + 6.4;
  const hemY = rig.crotchY + 18.5;

  if (view === 'side') {
    const s = rig.side;
    const backWaistY = waistTopY - 2;
    const frontWaistY = waistTopY + 2;
    const backBandY = backWaistY + 6.4;
    const frontBandY = frontWaistY + 6.4;
    const sideHemY = rig.crotchY + 17.5;

    const boxerFillPath = [
      `M ${s.hipBackX - 10} ${backWaistY}`,
      `Q ${cx} ${waistTopY + 1} ${s.hipFrontX + 10} ${frontWaistY}`,
      `L ${s.hipFrontX + 10} ${sideHemY}`,
      `Q ${cx} ${sideHemY + 2.2} ${s.hipBackX - 10} ${sideHemY}`,
      'Z',
    ].join(' ');

    const bandFillPath = [
      `M ${s.hipBackX - 10} ${backWaistY}`,
      `Q ${cx} ${waistTopY + 1} ${s.hipFrontX + 10} ${frontWaistY}`,
      `L ${s.hipFrontX + 10} ${frontBandY}`,
      `Q ${cx} ${bandBottomY + 1} ${s.hipBackX - 10} ${backBandY}`,
      'Z',
    ].join(' ');

    return (
      <g clipPath={`url(#${bodyClipId})`} pointerEvents="none">
        {isFemale && (
          <path
            d={[
              `M ${s.shoulderBackX - 2} ${rig.shoulderY + 2}`,
              `L ${s.shoulderFrontX + 2} ${rig.shoulderY + 4}`,
              `L ${s.bustFrontX + 8} ${s.underBustY + 6}`,
              `Q ${cx} ${s.underBustY + 7} ${s.chestBackX - 8} ${s.underBustY + 4.5}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-basewear-grad)`}
            stroke="var(--avatar-basewear-stroke)"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
        )}
        <path d={boxerFillPath} fill={`url(#${patternPrefix}-basewear-grad)`} />
        <path d={bandFillPath} fill={`url(#${patternPrefix}-basewear-band-grad)`} />
        {/* Bordes superior, inferior de pretina y dobladillo */}
        <path
          d={`M ${s.hipBackX - 6} ${backWaistY} Q ${cx} ${waistTopY + 1} ${s.hipFrontX + 6} ${frontWaistY} M ${s.hipBackX - 6} ${backBandY} Q ${cx} ${bandBottomY + 1} ${s.hipFrontX + 6} ${frontBandY} M ${s.hipBackX - 6} ${sideHemY} Q ${cx} ${sideHemY + 2} ${s.hipFrontX + 6} ${sideHemY}`}
          fill="none"
          stroke="var(--avatar-basewear-stroke)"
          strokeWidth="1.1"
        />
        <path
          d={`M ${cx + 2} ${bandBottomY + 1} L ${cx + 1.2} ${sideHemY - 0.5} M ${s.hipBackX + 4} ${s.gluteApexY + 7} Q ${cx - 4} ${rig.crotchY + 6} ${cx + 3} ${rig.crotchY + 4}`}
          fill="none"
          stroke="var(--avatar-basewear-stroke)"
          strokeWidth="0.72"
          strokeLinecap="round"
          opacity="0.65"
        />
      </g>
    );
  }

  // Frente y Espalda: recortado con bodyClipId para abrazar 100% la curva de cadera sin rendijas
  const bleedX = Math.max(rig.hipX, rig.waistX) + 8;

  const boxerFillPath = [
    `M ${cx - bleedX} ${waistTopY}`,
    `Q ${cx} ${waistTopY + 3.4} ${cx + bleedX} ${waistTopY}`,
    `L ${cx + bleedX} ${hemY}`,
    `Q ${cx + rig.hipX * 0.48} ${hemY + 2.8} ${cx + 4.4} ${hemY - 0.5}`,
    `L ${cx} ${rig.crotchY + 5.5}`,
    `L ${cx - 4.4} ${hemY - 0.5}`,
    `Q ${cx - rig.hipX * 0.48} ${hemY + 2.8} ${cx - bleedX} ${hemY}`,
    'Z',
  ].join(' ');

  const bandFillPath = [
    `M ${cx - bleedX} ${waistTopY}`,
    `Q ${cx} ${waistTopY + 3.4} ${cx + bleedX} ${waistTopY}`,
    `L ${cx + bleedX} ${bandBottomY}`,
    `Q ${cx} ${bandBottomY + 3.4} ${cx - bleedX} ${bandBottomY}`,
    'Z',
  ].join(' ');

  return (
    <g clipPath={`url(#${bodyClipId})`} pointerEvents="none">
      {/* Top deportivo femenino a juego */}
      {isFemale && view === 'front' && (
        <g>
          <path
            d={[
              `M ${cx - rig.shoulderX * 0.54} ${rig.shoulderY - 1}`,
              `L ${cx - rig.shoulderX * 0.34} ${rig.shoulderY - 1}`,
              `Q ${cx} ${rig.chestY - 5} ${cx + rig.shoulderX * 0.34} ${rig.shoulderY - 1}`,
              `L ${cx + rig.shoulderX * 0.54} ${rig.shoulderY - 1}`,
              `C ${cx + rig.chestX + 2} ${rig.chestY - 4}, ${cx + rig.chestX + 4} ${rig.bustUnderY}, ${cx + rig.chestX + 4} ${Math.min(rig.waistY - 3, rig.bustUnderY + 7.5)}`,
              `Q ${cx} ${Math.min(rig.waistY - 1, rig.bustUnderY + 9.5)} ${cx - rig.chestX - 4} ${Math.min(rig.waistY - 3, rig.bustUnderY + 7.5)}`,
              `C ${cx - rig.chestX - 4} ${rig.bustUnderY}, ${cx - rig.chestX - 2} ${rig.chestY - 4}, ${cx - rig.shoulderX * 0.54} ${rig.shoulderY - 1}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-basewear-grad)`}
            stroke="var(--avatar-basewear-stroke)"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <path
            d={`M ${cx - rig.chestX} ${Math.min(rig.waistY - 6, rig.bustUnderY + 3.6)} Q ${cx} ${Math.min(rig.waistY - 4, rig.bustUnderY + 5.4)} ${cx + rig.chestX} ${Math.min(rig.waistY - 6, rig.bustUnderY + 3.6)}`}
            fill="none"
            stroke="var(--avatar-basewear-stroke)"
            strokeWidth="0.72"
            opacity="0.72"
          />
        </g>
      )}
      {isFemale && view === 'back' && (
        <path
          d={[
            `M ${cx - rig.shoulderX * 0.5} ${rig.shoulderY - 1}`,
            `L ${cx - rig.shoulderX * 0.3} ${rig.shoulderY - 1}`,
            `Q ${cx} ${rig.chestY - 11} ${cx + rig.shoulderX * 0.3} ${rig.shoulderY - 1}`,
            `L ${cx + rig.shoulderX * 0.5} ${rig.shoulderY - 1}`,
            `C ${cx + rig.backChestX * 0.78} ${rig.chestY - 4}, ${cx + rig.backChestX + 4} ${rig.bustUnderY}, ${cx + rig.backChestX + 4} ${Math.min(rig.waistY - 4, rig.bustUnderY + 7)}`,
            `Q ${cx} ${Math.min(rig.waistY - 2, rig.bustUnderY + 8.5)} ${cx - rig.backChestX - 4} ${Math.min(rig.waistY - 4, rig.bustUnderY + 7)}`,
            `C ${cx - rig.backChestX - 4} ${rig.bustUnderY}, ${cx - rig.backChestX * 0.78} ${rig.chestY - 4}, ${cx - rig.shoulderX * 0.5} ${rig.shoulderY - 1}`,
            'Z',
          ].join(' ')}
          fill={`url(#${patternPrefix}-basewear-grad)`}
          stroke="var(--avatar-basewear-stroke)"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
      )}

      {/* Bóxer / short base principal */}
      <path d={boxerFillPath} fill={`url(#${patternPrefix}-basewear-grad)`} />
      {/* Pretina elástica superior */}
      <path d={bandFillPath} fill={`url(#${patternPrefix}-basewear-band-grad)`} />

      {/* Líneas nítidas de pretina y dobladillos */}
      <path
        d={[
          `M ${cx - bleedX} ${waistTopY} Q ${cx} ${waistTopY + 3.4} ${cx + bleedX} ${waistTopY}`,
          `M ${cx - bleedX} ${bandBottomY} Q ${cx} ${bandBottomY + 3.4} ${cx + bleedX} ${bandBottomY}`,
          `M ${cx - bleedX} ${hemY} Q ${cx - rig.hipX * 0.48} ${hemY + 2.8} ${cx - 4.4} ${hemY - 0.5} L ${cx} ${rig.crotchY + 5.5} L ${cx + 4.4} ${hemY - 0.5} Q ${cx + rig.hipX * 0.48} ${hemY + 2.8} ${cx + bleedX} ${hemY}`,
        ].join(' ')}
        fill="none"
        stroke="var(--avatar-basewear-stroke)"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d={`M ${cx - rig.hipX * 0.92} ${hemY - 3.2} Q ${cx - rig.hipX * 0.48} ${hemY + 0.6} ${cx - 4.4} ${hemY - 2.8} M ${cx + 4.4} ${hemY - 2.8} Q ${cx + rig.hipX * 0.48} ${hemY + 0.6} ${cx + rig.hipX * 0.92} ${hemY - 3.2}`}
        fill="none"
        stroke="var(--avatar-basewear-stroke)"
        strokeWidth="0.65"
        opacity="0.56"
      />

      {view === 'front' ? (
        <g
          fill="none"
          stroke="var(--avatar-basewear-stroke)"
          strokeWidth="0.72"
          strokeLinecap="round"
          opacity="0.76"
        >
          <path
            d={`M ${cx - 7} ${bandBottomY + 2.6} C ${cx - 8.6} ${rig.hipY + 6}, ${cx - 6.4} ${rig.crotchY + 2}, ${cx} ${rig.crotchY + 4.8} C ${cx + 6.4} ${rig.crotchY + 2}, ${cx + 8.6} ${rig.hipY + 6}, ${cx + 7} ${bandBottomY + 2.6}`}
          />
          {!isFemale && (
            <path
              d={`M ${cx + 0.4} ${bandBottomY + 3.2} Q ${cx + 1.8} ${rig.hipY + 5} ${cx} ${rig.crotchY + 3.5}`}
              opacity="0.62"
            />
          )}
          <path
            d={`M ${cx - rig.hipX * 0.74} ${rig.hipY + 2} Q ${cx - rig.hipX * 0.42} ${rig.hipY + 8} ${cx - 8.5} ${rig.crotchY + 1} M ${cx + rig.hipX * 0.74} ${rig.hipY + 2} Q ${cx + rig.hipX * 0.42} ${rig.hipY + 8} ${cx + 8.5} ${rig.crotchY + 1}`}
            strokeWidth="0.55"
            opacity="0.48"
          />
        </g>
      ) : (
        <g
          fill="none"
          stroke="var(--avatar-basewear-stroke)"
          strokeWidth="0.75"
          strokeLinecap="round"
          opacity="0.78"
        >
          <path d={`M ${cx} ${bandBottomY + 2} L ${cx} ${rig.crotchY + 4.5}`} />
          <path
            d={`M ${cx - rig.hipX * 0.84} ${rig.crotchY + 3} Q ${cx - rig.hipX * 0.44} ${rig.crotchY + 9.5} ${cx - 2.2} ${rig.crotchY + 5.2} M ${cx + 2.2} ${rig.crotchY + 5.2} Q ${cx + rig.hipX * 0.44} ${rig.crotchY + 9.5} ${cx + rig.hipX * 0.84} ${rig.crotchY + 3}`}
            strokeWidth="0.82"
            opacity="0.66"
          />
        </g>
      )}
    </g>
  );
}
