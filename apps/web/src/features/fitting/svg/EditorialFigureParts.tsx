import type { MannequinRig } from './mannequinRig';

interface EditorialPartProps {
  rig: MannequinRig;
  patternPrefix: string;
}

/**
 * Capa trasera de melena femenina en capas onduladas (se dibuja detrás del cuello y hombros).
 */
export function EditorialFemaleBackHair({ rig }: { rig: MannequinRig }) {
  const { cx, headRx, headRy, headTopY, headCenterY, chinY, shoulderY } = rig;
  const fw = headRx * 1.08;
  return (
    <g pointerEvents="none">
      {/* Masa trasera principal ondulada con volumen natural en sienes y puntas */}
      <path
        d={[
          `M ${cx - fw * 1.24} ${headTopY + headRy * 0.44}`,
          `C ${cx - fw * 1.54} ${headCenterY + 3}, ${cx - fw * 1.68} ${chinY + 5}, ${cx - fw * 1.56} ${shoulderY + 5}`,
          `C ${cx - fw * 1.48} ${shoulderY + 15}, ${cx - fw * 1.32} ${shoulderY + 23}, ${cx - fw * 1.02} ${shoulderY + 26}`,
          `Q ${cx - fw * 0.52} ${shoulderY + 31} ${cx} ${shoulderY + 27}`,
          `Q ${cx + fw * 0.52} ${shoulderY + 31} ${cx + fw * 1.02} ${shoulderY + 26}`,
          `C ${cx + fw * 1.32} ${shoulderY + 23}, ${cx + fw * 1.48} ${shoulderY + 15}, ${cx + fw * 1.56} ${shoulderY + 5}`,
          `C ${cx + fw * 1.68} ${chinY + 5}, ${cx + fw * 1.54} ${headCenterY + 3}, ${cx + fw * 1.24} ${headTopY + headRy * 0.44}`,
          'Z',
        ].join(' ')}
        fill="var(--avatar-hair-dark)"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.02"
        strokeLinejoin="round"
      />
      {/* Ondas interiores suaves */}
      <path
        d={[
          `M ${cx - fw * 1.32} ${chinY + 3} C ${cx - fw * 1.44} ${shoulderY + 5}, ${cx - fw * 1.3} ${shoulderY + 15}, ${cx - fw * 1.0} ${shoulderY + 22}`,
          `M ${cx + fw * 1.32} ${chinY + 3} C ${cx + fw * 1.44} ${shoulderY + 5}, ${cx + fw * 1.3} ${shoulderY + 15}, ${cx + fw * 1.0} ${shoulderY + 22}`,
          `M ${cx - fw * 1.12} ${chinY + 9} Q ${cx - fw * 1.18} ${shoulderY + 15} ${cx - fw * 0.84} ${shoulderY + 24}`,
          `M ${cx + fw * 1.12} ${chinY + 9} Q ${cx + fw * 1.18} ${shoulderY + 15} ${cx + fw * 0.84} ${shoulderY + 24}`,
        ].join(' ')}
        fill="none"
        stroke="var(--avatar-hair-mid)"
        strokeWidth="1.0"
        strokeLinecap="round"
        opacity="0.62"
      />
    </g>
  );
}

/**
 * Retrato frontal esculpido con canon facial real (tercios anatómicos: ojos en el centro vertical
 * del cráneo, nariz a medio camino y labios a 1/3 del mentón; estructura ósea real en sienes,
 * pómulos, ángulo mandibular y mentón, sin forma de huevo).
 */
export function EditorialFrontHead({ rig, patternPrefix }: EditorialPartProps) {
  const { cx, headRx, headRy, headTopY, headCenterY, chinY, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const headClipId = `${patternPrefix}-front-head-clip`;

  // Ancho facial anatómico equilibrado (relación ancho/alto real ~0.76-0.80)
  const fw = headRx * (isFemale ? 1.08 : 1.07);

  // Tercios verticales anatómicos reales (eliminan el efecto "mentón gigante / huevo")
  const eyeY = headCenterY + headRy * 0.05;
  const noseTipY = headCenterY + headRy * 0.4;
  const mouthY = headCenterY + headRy * 0.65;

  // Estructura ósea facial en 5 hitos: sien -> pómulo -> plano mejilla -> gonion/mandíbula -> mentón
  const templeX = fw * (isFemale ? 0.92 : 0.96);
  const templeY = headCenterY - headRy * 0.24;
  const cheekX = fw * (isFemale ? 0.99 : 1.02);
  const cheekY = eyeY + headRy * 0.14;
  const hollowX = fw * (isFemale ? 0.9 : 0.96);
  const hollowY = noseTipY + headRy * 0.04;
  const gonionX = fw * (isFemale ? 0.74 : 0.86);
  const gonionY = mouthY - headRy * 0.02;
  const chinHalf = fw * (isFemale ? 0.22 : 0.35);

  const headPath = [
    `M ${cx} ${headTopY}`,
    // Coronilla -> sien derecha
    `C ${cx + fw * 0.64} ${headTopY}, ${cx + templeX + 0.5} ${headTopY + headRy * 0.34}, ${cx + templeX} ${templeY}`,
    // Sien -> arco cigomático (pómulo esculpido)
    `C ${cx + templeX + 0.4} ${templeY + headRy * 0.18}, ${cx + cheekX + 0.3} ${cheekY - headRy * 0.14}, ${cx + cheekX} ${cheekY}`,
    // Pómulo -> plano lateral de mejilla -> ángulo mandibular (gonion a altura labial)
    `C ${cx + cheekX - 0.2} ${cheekY + headRy * 0.18}, ${cx + hollowX + 0.3} ${hollowY}, ${cx + gonionX} ${gonionY}`,
    // Gonion -> línea mandibular limpia -> mentón esculpido (cuadrado sutil en hombre, V suave en mujer)
    `C ${cx + gonionX - 1.4} ${gonionY + headRy * 0.19}, ${cx + chinHalf + 2.8} ${chinY - 0.8}, ${cx + chinHalf} ${chinY - 0.2}`,
    `Q ${cx} ${chinY + (isFemale ? 0.85 : 0.45)} ${cx - chinHalf} ${chinY - 0.2}`,
    // Espejo izquierdo
    `C ${cx - chinHalf - 2.8} ${chinY - 0.8}, ${cx - gonionX + 1.4} ${gonionY + headRy * 0.19}, ${cx - gonionX} ${gonionY}`,
    `C ${cx - hollowX - 0.3} ${hollowY}, ${cx - cheekX + 0.2} ${cheekY + headRy * 0.18}, ${cx - cheekX} ${cheekY}`,
    `C ${cx - cheekX - 0.3} ${cheekY - headRy * 0.14}, ${cx - templeX - 0.4} ${templeY + headRy * 0.18}, ${cx - templeX} ${templeY}`,
    `C ${cx - templeX - 0.5} ${headTopY + headRy * 0.34}, ${cx - fw * 0.64} ${headTopY}, ${cx} ${headTopY}`,
    'Z',
  ].join(' ');

  const mouthW = fw * (isFemale ? 0.33 : 0.35);
  const noseW = fw * (isFemale ? 0.15 : 0.17);
  const eyeCenterOffset = fw * 0.39;
  const eyeRx = fw * (isFemale ? 0.205 : 0.195);
  const eyeRy = headRy * (isFemale ? 0.092 : 0.08);
  const irisR = eyeRy * 0.9;

  return (
    <g data-editorial-head="front">
      <defs>
        <clipPath id={headClipId}>
          <path d={headPath} />
        </clipPath>
      </defs>

      {/* Orejas anatómicas alineadas entre ceja/ojo y base de la nariz */}
      {([-1, 1] as const).map((side) => {
        const ex = cx + side * cheekX * 0.96;
        const ey = (eyeY + noseTipY) * 0.5 + 0.6;
        return (
          <g key={`ear-${side}`}>
            <path
              d={[
                `M ${ex} ${ey - 4.4}`,
                `C ${ex + side * 2.7} ${ey - 4.9}, ${ex + side * 3.5} ${ey - 1.8}, ${ex + side * 2.9} ${ey + 1.1}`,
                `C ${ex + side * 2.4} ${ey + 3.4}, ${ex + side * 1.7} ${ey + 5.2}, ${ex + side * 0.6} ${ey + 5.2}`,
                `C ${ex - side * 0.2} ${ey + 5.2}, ${ex - side * 0.6} ${ey + 3.9}, ${ex - side * 0.5} ${ey + 2.8}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-limb-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.95"
              strokeLinejoin="round"
            />
            <path
              d={`M ${ex + side * 0.6} ${ey - 2.3} C ${ex + side * 2.0} ${ey - 1.8}, ${ex + side * 2.0} ${ey + 1.4}, ${ex + side * 0.85} ${ey + 2.6} M ${ex + side * 0.75} ${ey + 0.2} Q ${ex + side * 1.35} ${ey + 0.8} ${ex + side * 0.55} ${ey + 1.5}`}
              fill="none"
              stroke="var(--mannequin-detail)"
              strokeWidth="0.56"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Base facial con volumen cálido conectado a Color */}
      <path d={headPath} fill={`url(#${patternPrefix}-head-grad)`} />

      {/* Planos escultóricos de luz y sombra difuminados recortados al rostro */}
      <g
        clipPath={`url(#${headClipId})`}
        filter={`url(#${patternPrefix}-micro-shade)`}
        pointerEvents="none"
      >
        {/* Planos laterales en sienes, bajo pómulos y línea mandibular */}
        {([-1, 1] as const).map((side) => (
          <g key={`face-plane-${side}`}>
            <path
              d={[
                `M ${cx + side * fw * 1.15} ${headTopY}`,
                `L ${cx + side * templeX * 0.78} ${headTopY}`,
                `C ${cx + side * templeX * 0.8} ${templeY}, ${cx + side * cheekX * 0.84} ${cheekY + 1.5}, ${cx + side * hollowX * 0.72} ${hollowY + 1.2}`,
                `C ${cx + side * gonionX * 0.8} ${gonionY + 1.6}, ${cx + side * chinHalf * 0.92} ${chinY + 0.5}, ${cx + side * chinHalf * 0.65} ${chinY + 1.5}`,
                `L ${cx + side * fw * 1.18} ${chinY + 2}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity={side === 1 ? '0.72' : '0.56'}
            />
            {/* Sombra suave en cuenca ocular */}
            <ellipse
              cx={cx + side * eyeCenterOffset}
              cy={eyeY - 1.9}
              rx={eyeRx * 1.15}
              ry={2.1}
              fill={`url(#${patternPrefix}-ambient-occlusion)`}
              opacity="0.52"
            />
            {/* Luz clave sutil sobre el arco del pómulo */}
            <ellipse
              cx={cx + side * fw * 0.56}
              cy={cheekY + 0.8}
              rx={3.4}
              ry={1.9}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.72"
            />
            {/* Rubor natural */}
            <ellipse
              cx={cx + side * fw * 0.5}
              cy={cheekY + 2.8}
              rx={3.8}
              ry={2.1}
              fill={`url(#${patternPrefix}-cheek-blush)`}
            />
          </g>
        ))}

        {/* Sombra proyectada por la línea del cabello sobre la frente */}
        <path
          d={`M ${cx - fw} ${headTopY + headRy * 0.34} Q ${cx} ${headTopY + headRy * 0.52} ${cx + fw} ${headTopY + headRy * 0.34} L ${cx + fw} ${headTopY} L ${cx - fw} ${headTopY} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
          opacity="0.34"
        />

        {/* Planos de luz suaves en frente, dorso nasal y mentón */}
        <ellipse
          cx={cx}
          cy={headCenterY - headRy * 0.3}
          rx={fw * 0.38}
          ry={headRy * 0.13}
          fill={`url(#${patternPrefix}-skin-sheen)`}
          opacity="0.72"
        />
        <ellipse
          cx={cx - 0.3}
          cy={(eyeY + noseTipY) * 0.5}
          rx={1.1}
          ry={headRy * 0.17}
          fill={`url(#${patternPrefix}-skin-sheen)`}
          opacity="0.75"
        />
        <ellipse
          cx={cx}
          cy={mouthY + (chinY - mouthY) * 0.58}
          rx={isFemale ? 2.4 : 3.4}
          ry={1.5}
          fill={`url(#${patternPrefix}-skin-sheen)`}
          opacity="0.65"
        />

        {/* Sombra lateral del puente nasal y bajo la punta */}
        <path
          d={`M ${cx + 0.7} ${eyeY - 0.4} L ${cx + noseW * 0.82} ${noseTipY - 0.4} Q ${cx} ${noseTipY + 1.5} ${cx - noseW * 0.75} ${noseTipY + 0.1} L ${cx - 0.5} ${noseTipY - 0.7} Z`}
          fill="var(--mannequin-shade-deep)"
          opacity="0.54"
        />
        {/* Sombra suave del surco mentolabial justo debajo del labio inferior */}
        <path
          d={`M ${cx - mouthW * 0.62} ${mouthY + 2.8} Q ${cx} ${mouthY + 4.0} ${cx + mouthW * 0.62} ${mouthY + 2.8} Q ${cx} ${mouthY + 4.9} ${cx - mouthW * 0.62} ${mouthY + 2.8} Z`}
          fill="var(--mannequin-shade-deep)"
          opacity="0.52"
        />
      </g>

      {/* Contorno de tinta refinada del rostro esculpido */}
      <path
        d={headPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />

      {/* Rasgos faciales de retrato editorial */}
      <g pointerEvents="none">
        {/* Cejas esculpidas con volumen anatómico (conectadas dinámicamente al cabello) */}
        {([-1, 1] as const).map((side) => {
          const innerX = cx + side * fw * 0.13;
          const archX = cx + side * fw * 0.48;
          const tailX = cx + side * fw * 0.74;
          const baseY = eyeY - headRy * 0.155;
          const archY = eyeY - headRy * (isFemale ? 0.235 : 0.205);
          const thickness = isFemale ? 1.1 : 1.65;
          return (
            <path
              key={`brow-${side}`}
              d={[
                `M ${innerX} ${baseY - thickness * 0.42}`,
                `Q ${archX} ${archY - thickness * 0.52} ${tailX} ${baseY + 0.15}`,
                `Q ${archX} ${archY + thickness * 0.46} ${innerX} ${baseY + thickness * 0.55}`,
                'Z',
              ].join(' ')}
              fill="var(--avatar-brow, var(--avatar-hair-dark))"
              opacity="0.93"
            />
          );
        })}

        {/* Ojos almendrados multicapa (anillo limbal + iris dinámico de Color + media luna + 2 brillos) */}
        {([-1, 1] as const).map((side) => {
          const ex = cx + side * eyeCenterOffset;
          return (
            <g key={`eye-${side}`}>
              {/* Pliegue del párpado superior */}
              <path
                d={`M ${ex - eyeRx * 0.94} ${eyeY - eyeRy - 0.55} Q ${ex} ${eyeY - eyeRy - 1.95} ${ex + eyeRx * 0.96} ${eyeY - eyeRy - 0.35}`}
                fill="none"
                stroke="var(--mannequin-detail)"
                strokeWidth="0.48"
                strokeLinecap="round"
                opacity="0.82"
              />
              {/* Esclerótica almendrada */}
              <path
                d={`M ${ex - eyeRx} ${eyeY + 0.15} Q ${ex} ${eyeY - eyeRy - 0.25} ${ex + eyeRx} ${eyeY + 0.15} Q ${ex} ${eyeY + eyeRy * 0.88} ${ex - eyeRx} ${eyeY + 0.15} Z`}
                fill="#faf7f4"
              />
              {/* Sombra proyectada por el párpado superior */}
              <path
                d={`M ${ex - eyeRx * 0.92} ${eyeY - 0.1} Q ${ex} ${eyeY - eyeRy - 0.1} ${ex + eyeRx * 0.92} ${eyeY - 0.1} Q ${ex} ${eyeY - eyeRy * 0.35} ${ex - eyeRx * 0.92} ${eyeY - 0.1} Z`}
                fill="rgb(55 40 34 / 18%)"
              />
              {/* Anillo limbal oscuro + iris dinámico + media luna luminosa + pupila */}
              <circle cx={ex} cy={eyeY + 0.05} r={irisR} fill="var(--avatar-iris-rim, #2b1d14)" />
              <circle cx={ex} cy={eyeY + 0.05} r={irisR * 0.83} fill="var(--avatar-iris)" />
              <path
                d={`M ${ex - irisR * 0.52} ${eyeY + irisR * 0.28} Q ${ex} ${eyeY + irisR * 0.72} ${ex + irisR * 0.52} ${eyeY + irisR * 0.28}`}
                fill="none"
                stroke="var(--avatar-iris-glow, #a07d60)"
                strokeWidth="0.56"
                strokeLinecap="round"
                opacity="0.88"
              />
              <circle cx={ex} cy={eyeY + 0.02} r={irisR * 0.43} fill="#120e0c" />
              {/* Dos brillos especulares para mirada viva */}
              <circle cx={ex - 0.56} cy={eyeY - 0.48} r={0.46} fill="#ffffff" />
              <circle cx={ex + 0.45} cy={eyeY + 0.42} r={0.22} fill="#ffffff" opacity="0.8" />
              {/* Línea de pestañas superior */}
              <path
                d={
                  isFemale
                    ? `M ${ex - eyeRx - 0.15} ${eyeY + 0.15} Q ${ex} ${eyeY - eyeRy - 0.48} ${ex + eyeRx + side * 0.55} ${eyeY - 0.08}`
                    : `M ${ex - eyeRx - 0.1} ${eyeY + 0.15} Q ${ex} ${eyeY - eyeRy - 0.35} ${ex + eyeRx + 0.1} ${eyeY + 0.15}`
                }
                fill="none"
                stroke="var(--mannequin-stroke)"
                strokeWidth={isFemale ? '1.12' : '0.94'}
                strokeLinecap="round"
              />
              {/* Línea sutil de párpado inferior */}
              <path
                d={`M ${ex - eyeRx * 0.72} ${eyeY + eyeRy * 0.55} Q ${ex} ${eyeY + eyeRy * 0.92} ${ex + eyeRx * 0.72} ${eyeY + eyeRy * 0.55}`}
                fill="none"
                stroke="var(--mannequin-detail)"
                strokeWidth="0.4"
                strokeLinecap="round"
                opacity="0.74"
              />
            </g>
          );
        })}

        {/* Nariz esculpida (puente sutil, punta, aletas, fosas nasales y filtrum) */}
        <path
          d={`M ${cx - 0.85} ${eyeY + 1.0} Q ${cx - 1.05} ${(eyeY + noseTipY) * 0.55} ${cx - 0.7} ${noseTipY - 0.9}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.46"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d={`M ${cx - noseW} ${noseTipY - 0.25} Q ${cx - noseW * 0.65} ${noseTipY + 0.65} ${cx - noseW * 0.24} ${noseTipY + 0.42} Q ${cx} ${noseTipY + 0.95} ${cx + noseW * 0.24} ${noseTipY + 0.42} Q ${cx + noseW * 0.65} ${noseTipY + 0.65} ${cx + noseW} ${noseTipY - 0.25}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.78"
        />
        <ellipse
          cx={cx - noseW * 0.52}
          cy={noseTipY + 0.22}
          rx={0.56}
          ry={0.26}
          fill="var(--mannequin-stroke)"
          opacity="0.52"
        />
        <ellipse
          cx={cx + noseW * 0.52}
          cy={noseTipY + 0.22}
          rx={0.56}
          ry={0.26}
          fill="var(--mannequin-stroke)"
          opacity="0.52"
        />
        {/* Filtrum delicado */}
        <path
          d={`M ${cx - 0.7} ${noseTipY + 1.3} L ${cx - 0.95} ${mouthY - 1.6} M ${cx + 0.7} ${noseTipY + 1.3} L ${cx + 0.95} ${mouthY - 1.6}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.38"
          strokeLinecap="round"
          opacity="0.42"
        />

        {/* Labios anatómicos en 2 planos proporcionales (arco de cupido + labio inferior con brillo) */}
        <path
          d={`M ${cx - mouthW} ${mouthY} Q ${cx - mouthW * 0.42} ${mouthY - (isFemale ? 1.75 : 1.35)} ${cx} ${mouthY - 0.58} Q ${cx + mouthW * 0.42} ${mouthY - (isFemale ? 1.75 : 1.35)} ${cx + mouthW} ${mouthY} Q ${cx} ${mouthY + 0.75} ${cx - mouthW} ${mouthY} Z`}
          fill="var(--avatar-lip-upper, var(--avatar-lip))"
          opacity={isFemale ? '0.9' : '0.72'}
        />
        <path
          d={`M ${cx - mouthW * 0.9} ${mouthY + 0.12} Q ${cx} ${mouthY + (isFemale ? 3.1 : 2.5)} ${cx + mouthW * 0.9} ${mouthY + 0.12} Q ${cx} ${mouthY + 0.7} ${cx - mouthW * 0.9} ${mouthY + 0.12} Z`}
          fill="var(--avatar-lip)"
          opacity={isFemale ? '0.86' : '0.66'}
        />
        {/* Brillo en el centro del labio inferior */}
        <ellipse
          cx={cx}
          cy={mouthY + (isFemale ? 1.6 : 1.3)}
          rx={mouthW * 0.34}
          ry={0.52}
          fill="#ffffff"
          opacity={isFemale ? '0.34' : '0.18'}
        />
        {/* Comisura labial expresiva */}
        <path
          d={`M ${cx - mouthW - 0.2} ${mouthY} Q ${cx - mouthW * 0.35} ${mouthY + 0.62} ${cx} ${mouthY + 0.42} Q ${cx + mouthW * 0.35} ${mouthY + 0.62} ${cx + mouthW + 0.2} ${mouthY}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.62"
          strokeLinecap="round"
          opacity="0.84"
        />
      </g>

      {/* Cabello editorial en capas orgánicas conectado dinámicamente a Color */}
      {isFemale ? (
        <g pointerEvents="none">
          {/* Melena editorial con volumen en coronilla, raya ligeramente lateral y mechones suaves */}
          <path
            d={[
              `M ${cx - fw * 1.28} ${cheekY + 4}`,
              `C ${cx - fw * 1.44} ${headTopY + 3}, ${cx - fw * 0.84} ${headTopY - 7.8}, ${cx - fw * 0.14} ${headTopY - 7.0}`,
              `C ${cx + fw * 0.56} ${headTopY - 8.2}, ${cx + fw * 1.42} ${headTopY + 2}, ${cx + fw * 1.28} ${cheekY + 4}`,
              // Mechón derecho suavemente ondulado enmarcando mejilla y cayendo al hombro
              `C ${cx + fw * 1.34} ${gonionY + 4}, ${cx + fw * 1.18} ${chinY + 8}, ${cx + fw * 0.94} ${chinY + 14}`,
              `C ${cx + fw * 1.0} ${gonionY - 1}, ${cx + fw * 1.02} ${cheekY - 2}, ${cx + fw * 0.9} ${templeY - 2}`,
              `C ${cx + fw * 0.68} ${headTopY + headRy * 0.36}, ${cx + fw * 0.18} ${headTopY + headRy * 0.42}, ${cx - fw * 0.14} ${headTopY + headRy * 0.22}`,
              // Barrido izquierdo natural sobre la frente/sien
              `C ${cx - fw * 0.48} ${headTopY + headRy * 0.44}, ${cx - fw * 0.92} ${templeY - 1}, ${cx - fw * 1.02} ${cheekY}`,
              `C ${cx - fw * 1.04} ${gonionY + 1}, ${cx - fw * 1.0} ${chinY + 7}, ${cx - fw * 0.92} ${chinY + 13}`,
              `C ${cx - fw * 1.2} ${chinY + 6}, ${cx - fw * 1.34} ${gonionY + 4}, ${cx - fw * 1.28} ${cheekY + 4}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.0"
            strokeLinejoin="round"
          />
          {/* Brillos suaves en coronilla y ondas laterales */}
          <path
            d={[
              `M ${cx - fw * 0.14} ${headTopY - 5.2} Q ${cx - fw * 0.74} ${headTopY - 2.6} ${cx - fw * 1.1} ${templeY + 2}`,
              `M ${cx - fw * 0.08} ${headTopY - 5.0} Q ${cx + fw * 0.68} ${headTopY - 2.8} ${cx + fw * 1.1} ${templeY + 2}`,
              `M ${cx - fw * 1.14} ${cheekY + 1} Q ${cx - fw * 1.18} ${gonionY + 3} ${cx - fw * 0.98} ${chinY + 9}`,
              `M ${cx + fw * 1.14} ${cheekY + 1} Q ${cx + fw * 1.18} ${gonionY + 3} ${cx + fw * 0.98} ${chinY + 9}`,
            ].join(' ')}
            fill="none"
            stroke="var(--avatar-hair-hi)"
            strokeWidth="0.92"
            strokeLinecap="round"
            opacity="0.72"
          />
        </g>
      ) : (
        <g pointerEvents="none">
          {/* Peinado masculino editorial con lados pulidos, patillas limpias y ondas texturizadas arriba */}
          <path
            d={[
              `M ${cx - cheekX * 0.97} ${cheekY + 0.5}`,
              `L ${cx - templeX * 1.06} ${templeY - 1.5}`,
              `C ${cx - fw * 1.16} ${headTopY + 4.5}, ${cx - fw * 1.12} ${headTopY - 2.2}, ${cx - fw * 0.72} ${headTopY - 5.6}`,
              `C ${cx - fw * 0.36} ${headTopY - 8.6}, ${cx + fw * 0.14} ${headTopY - 9.0}, ${cx + fw * 0.52} ${headTopY - 6.8}`,
              `C ${cx + fw * 0.78} ${headTopY - 7.4}, ${cx + fw * 1.08} ${headTopY - 3.0}, ${cx + fw * 1.14} ${headTopY + 3.2}`,
              `C ${cx + fw * 1.14} ${templeY - 2.5}, ${cx + templeX * 1.06} ${templeY + 0.5}, ${cx + cheekX * 0.97} ${cheekY + 0.5}`,
              // Línea de entrada de patilla derecha y flequillo natural sobre la frente
              `L ${cx + templeX * 0.92} ${templeY - 1.8}`,
              `C ${cx + fw * 0.82} ${headTopY + headRy * 0.38}, ${cx + fw * 0.56} ${headTopY + headRy * 0.44}, ${cx + fw * 0.34} ${headTopY + headRy * 0.28}`,
              `Q ${cx + fw * 0.1} ${headTopY + headRy * 0.46} ${cx - fw * 0.1} ${headTopY + headRy * 0.3}`,
              `Q ${cx - fw * 0.38} ${headTopY + headRy * 0.44} ${cx - fw * 0.58} ${headTopY + headRy * 0.3}`,
              `C ${cx - fw * 0.8} ${headTopY + headRy * 0.4}, ${cx - templeX * 0.92} ${templeY - 2.2}, ${cx - templeX * 0.92} ${templeY - 1.5}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.02"
            strokeLinejoin="round"
          />
          {/* Brillo direccional en la onda superior */}
          <path
            d={[
              `M ${cx - fw * 0.68} ${headTopY + 1.8}`,
              `Q ${cx - fw * 0.08} ${headTopY - 6.2} ${cx + fw * 0.66} ${headTopY - 3.0}`,
              `Q ${cx + fw * 0.14} ${headTopY + 1.4} ${cx - fw * 0.46} ${headTopY + 4.2}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-highlight-grad)`}
          />
          {/* Trazos finos de dirección de mechones */}
          <path
            d={[
              `M ${cx - fw * 0.72} ${headTopY + 0.2} Q ${cx - fw * 0.1} ${headTopY - 5.4} ${cx + fw * 0.54} ${headTopY - 3.8}`,
              `M ${cx - fw * 0.4} ${headTopY + 4.4} Q ${cx + fw * 0.18} ${headTopY + 0.2} ${cx + fw * 0.78} ${headTopY + 2.0}`,
              `M ${cx - fw * 0.84} ${headTopY + 3.8} Q ${cx - fw * 0.4} ${headTopY + 1.8} ${cx - fw * 0.04} ${headTopY + 4.8}`,
            ].join(' ')}
            fill="none"
            stroke="var(--avatar-hair-dark)"
            strokeWidth="0.66"
            strokeLinecap="round"
            opacity="0.65"
          />
        </g>
      )}
    </g>
  );
}

/**
 * Cabeza y rostro de perfil anatómico derecho con tercios verticales idénticos al frente,
 * transición continua sin huecos hacia la nuca y el cuello, y cabello editorial bien ceñido al cráneo.
 */
export function EditorialSideHead({ rig, patternPrefix }: EditorialPartProps) {
  const { cx, headTopY, headCenterY, chinY, headRy: hr, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const sideHeadClipId = `${patternPrefix}-side-head-clip`;

  // Mismos tercios anatómicos que la vista frontal
  const eyeY = headCenterY + hr * 0.05;
  const noseTipY = headCenterY + hr * 0.4;
  const mouthY = headCenterY + hr * 0.65;
  const earX = cx - hr * 0.14;
  const earY = (eyeY + noseTipY) * 0.5 + 0.5;
  // Anclaje exacto de la nuca del cuerpo (ver anatomyPaths.ts: cx - (6.8 | 8.0), chinY - 4)
  const neckBackX = cx - (isFemale ? 6.9 : 8.1);

  const profileHeadPath = [
    `M ${cx - hr * 0.12} ${headTopY}`,
    // Frente -> arco superciliar -> hendidura del nasion
    `C ${cx + hr * 0.36} ${headTopY}, ${cx + hr * 0.56} ${headCenterY - hr * 0.46}, ${cx + hr * 0.6} ${eyeY - hr * 0.22}`,
    `Q ${cx + hr * 0.57} ${eyeY - hr * 0.06} ${cx + hr * 0.62} ${eyeY + hr * 0.05}`,
    // Dorso nasal recto y punta esculpida en noseTipY
    `L ${cx + hr * (isFemale ? 0.8 : 0.83)} ${noseTipY - hr * 0.03}`,
    `Q ${cx + hr * (isFemale ? 0.8 : 0.83)} ${noseTipY + hr * 0.07} ${cx + hr * 0.65} ${noseTipY + hr * 0.09}`,
    // Filtrum cóncavo -> labio superior -> comisura (mouthY) -> labio inferior -> surco mentolabial
    `Q ${cx + hr * 0.65} ${mouthY - hr * 0.11} ${cx + hr * 0.72} ${mouthY - hr * 0.04}`,
    `Q ${cx + hr * 0.66} ${mouthY + hr * 0.01} ${cx + hr * 0.62} ${mouthY + hr * 0.02}`,
    `Q ${cx + hr * 0.7} ${mouthY + hr * 0.11} ${cx + hr * 0.61} ${mouthY + hr * 0.18}`,
    // Mentón firme -> línea submental limpia -> enlace continuo hacia la nuca sin huecos
    `Q ${cx + hr * 0.66} ${chinY - 1.6} ${cx + hr * 0.48} ${chinY + 0.1}`,
    `C ${cx + hr * 0.24} ${chinY + 0.3}, ${cx + hr * 0.02} ${chinY - 1.2}, ${cx - hr * 0.14} ${chinY - 2.2}`,
    `L ${neckBackX} ${chinY - 2.4}`,
    // Occipucio (cráneo posterior lleno y redondeado que nace limpio desde la nuca)
    `C ${cx - hr * 0.66} ${headCenterY + hr * 0.68}, ${cx - hr * 0.84} ${headCenterY + hr * 0.22}, ${cx - hr * 0.82} ${headCenterY - hr * 0.18}`,
    `C ${cx - hr * 0.8} ${headTopY + hr * 0.16}, ${cx - hr * 0.52} ${headTopY}, ${cx - hr * 0.12} ${headTopY}`,
    'Z',
  ].join(' ');

  // Contorno externo abierto del rostro de perfil (sin línea transversal sobre la unión con el cuello)
  const profileFaceStrokePath = [
    `M ${cx - hr * 0.12} ${headTopY}`,
    `C ${cx + hr * 0.36} ${headTopY}, ${cx + hr * 0.56} ${headCenterY - hr * 0.46}, ${cx + hr * 0.6} ${eyeY - hr * 0.22}`,
    `Q ${cx + hr * 0.57} ${eyeY - hr * 0.06} ${cx + hr * 0.62} ${eyeY + hr * 0.05}`,
    `L ${cx + hr * (isFemale ? 0.8 : 0.83)} ${noseTipY - hr * 0.03}`,
    `Q ${cx + hr * (isFemale ? 0.8 : 0.83)} ${noseTipY + hr * 0.07} ${cx + hr * 0.65} ${noseTipY + hr * 0.09}`,
    `Q ${cx + hr * 0.65} ${mouthY - hr * 0.11} ${cx + hr * 0.72} ${mouthY - hr * 0.04}`,
    `Q ${cx + hr * 0.66} ${mouthY + hr * 0.01} ${cx + hr * 0.62} ${mouthY + hr * 0.02}`,
    `Q ${cx + hr * 0.7} ${mouthY + hr * 0.11} ${cx + hr * 0.61} ${mouthY + hr * 0.18}`,
    `Q ${cx + hr * 0.66} ${chinY - 1.6} ${cx + hr * 0.48} ${chinY + 0.1}`,
    `C ${cx + hr * 0.24} ${chinY + 0.3}, ${cx + hr * 0.02} ${chinY - 1.2}, ${cx - hr * 0.12} ${chinY - 2.1}`,
  ].join(' ');

  return (
    <g data-editorial-head="side">
      <defs>
        <clipPath id={sideHeadClipId}>
          <path d={profileHeadPath} />
        </clipPath>
      </defs>

      <path d={profileHeadPath} fill={`url(#${patternPrefix}-side-body-grad)`} />

      <g
        clipPath={`url(#${sideHeadClipId})`}
        filter={`url(#${patternPrefix}-micro-shade)`}
        pointerEvents="none"
      >
        <path
          d={[
            `M ${cx + hr * 0.48} ${chinY + 1}`,
            `C ${cx + hr * 0.18} ${chinY - 1.8}, ${cx - hr * 0.02} ${mouthY + hr * 0.1}, ${earX + 1.5} ${earY + 2}`,
            `L ${cx - hr * 0.84} ${chinY + 1}`,
            `L ${cx + hr * 0.48} ${chinY + 2}`,
            'Z',
          ].join(' ')}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.68"
        />
        <ellipse
          cx={cx + hr * 0.44}
          cy={eyeY - 1.2}
          rx={3.1}
          ry={2.0}
          fill={`url(#${patternPrefix}-ambient-occlusion)`}
          opacity="0.48"
        />
        <ellipse
          cx={cx + hr * 0.34}
          cy={noseTipY - 1.4}
          rx={3.5}
          ry={2.1}
          fill={`url(#${patternPrefix}-cheek-blush)`}
        />
      </g>

      <path
        d={profileFaceStrokePath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Rasgos de perfil detallados (ceja rellena, ojo con iris dinámico, aleta nasal, labios y mandíbula) */}
      <g pointerEvents="none">
        <path
          d={`M ${cx + hr * 0.27} ${eyeY - hr * 0.155} Q ${cx + hr * 0.46} ${eyeY - hr * (isFemale ? 0.215 : 0.195)} ${cx + hr * 0.61} ${eyeY - hr * 0.145} Q ${cx + hr * 0.46} ${eyeY - hr * 0.15} ${cx + hr * 0.27} ${eyeY - hr * 0.11} Z`}
          fill="var(--avatar-brow, var(--avatar-hair-dark))"
          opacity="0.92"
        />
        {/* Párpado superior y ojo lateral con iris dinámico */}
        <path
          d={`M ${cx + hr * 0.34} ${eyeY - 2.0} Q ${cx + hr * 0.48} ${eyeY - 3.0} ${cx + hr * 0.59} ${eyeY - 1.85}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.46"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx + hr * 0.34} ${eyeY} Q ${cx + hr * 0.48} ${eyeY - 1.45} ${cx + hr * 0.59} ${eyeY - 0.1} Q ${cx + hr * 0.48} ${eyeY + 1.25} ${cx + hr * 0.34} ${eyeY} Z`}
          fill="#faf7f4"
        />
        <ellipse cx={cx + hr * 0.51} cy={eyeY} rx={1.0} ry={1.3} fill="var(--avatar-iris-rim, #2b1d14)" />
        <ellipse cx={cx + hr * 0.52} cy={eyeY} rx={0.82} ry={1.08} fill="var(--avatar-iris)" />
        <circle cx={cx + hr * 0.53} cy={eyeY} r={0.46} fill="#14100d" />
        <circle cx={cx + hr * 0.49} cy={eyeY - 0.46} r={0.32} fill="#ffffff" />
        <path
          d={`M ${cx + hr * 0.33} ${eyeY} Q ${cx + hr * 0.48} ${eyeY - 1.6} ${cx + hr * 0.61} ${eyeY - 0.18}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth={isFemale ? '1.0' : '0.88'}
          strokeLinecap="round"
        />
        {/* Aleta nasal y fosa */}
        <path
          d={`M ${cx + hr * 0.57} ${noseTipY + 0.4} Q ${cx + hr * 0.64} ${noseTipY + 1.4} ${cx + hr * 0.68} ${noseTipY + 0.6}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.74"
        />
        {/* Labios superior/inferior de perfil */}
        <path
          d={`M ${cx + hr * 0.53} ${mouthY + 0.2} Q ${cx + hr * 0.63} ${mouthY - 1.4} ${cx + hr * 0.71} ${mouthY - 0.7} Q ${cx + hr * 0.65} ${mouthY + 2.6} ${cx + hr * 0.53} ${mouthY + 0.2} Z`}
          fill="var(--avatar-lip)"
          opacity={isFemale ? '0.84' : '0.62'}
        />
        <path
          d={`M ${cx + hr * 0.5} ${mouthY + 0.35} Q ${cx + hr * 0.6} ${mouthY + 0.6} ${cx + hr * 0.66} ${mouthY + 0.25}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
        {/* Línea mandibular definida hacia la oreja */}
        <path
          d={`M ${cx + hr * 0.12} ${chinY - 1.6} Q ${cx - hr * 0.1} ${mouthY + hr * 0.16} ${earX + 1.2} ${earY + 4.0}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.62"
          strokeLinecap="round"
          opacity="0.76"
        />
      </g>

      {/* Cabello lateral en capas orgánicas conectado a Color */}
      <g pointerEvents="none">
        {isFemale ? (
          <>
            <path
              d={[
                `M ${cx + hr * 0.56} ${headTopY + 2.4}`,
                `C ${cx + hr * 0.26} ${headTopY - 7.8}, ${cx - hr * 0.88} ${headTopY - 7.0}, ${cx - hr * 1.06} ${headCenterY + 3}`,
                `C ${cx - hr * 1.16} ${chinY + 12}, ${cx - hr * 1.0} ${rig.shoulderY + 16}, ${cx - hr * 0.44} ${rig.shoulderY + 23}`,
                `C ${cx - hr * 0.08} ${rig.shoulderY + 15}, ${cx - hr * 0.14} ${chinY + 4}, ${earX - 0.6} ${earY + 5.2}`,
                `C ${earX + 1.8} ${earY - 3.6}, ${cx + hr * 0.18} ${headTopY + 7.2}, ${cx + hr * 0.56} ${headTopY + 2.4}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-hair-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="1.02"
              strokeLinejoin="round"
            />
            {/* Brillo suave en ondas de la melena */}
            <path
              d={[
                `M ${cx + hr * 0.22} ${headTopY + 0.6} C ${cx - hr * 0.44} ${headTopY - 1.0}, ${cx - hr * 0.84} ${headCenterY + 6}, ${cx - hr * 0.68} ${rig.shoulderY + 12}`,
                `M ${cx + hr * 0.12} ${headTopY + 5.2} C ${cx - hr * 0.24} ${headCenterY + 2}, ${cx - hr * 0.52} ${chinY + 8}, ${cx - hr * 0.42} ${rig.shoulderY + 15}`,
              ].join(' ')}
              fill="none"
              stroke="var(--avatar-hair-hi)"
              strokeWidth="0.92"
              strokeLinecap="round"
              opacity="0.68"
            />
          </>
        ) : (
          <>
            {/* Peinado masculino de perfil ceñido al cráneo (sin bulto trasero) y nuca continua */}
            <path
              d={[
                `M ${cx + hr * 0.56} ${headTopY + 2.8}`,
                `C ${cx + hr * 0.72} ${headTopY - 2.4}, ${cx + hr * 0.34} ${headTopY - 7.6}, ${cx - hr * 0.14} ${headTopY - 6.4}`,
                `C ${cx - hr * 0.62} ${headTopY - 5.4}, ${cx - hr * 0.92} ${headTopY + 2.4}, ${cx - hr * 0.9} ${headCenterY + hr * 0.2}`,
                `C ${cx - hr * 0.86} ${headCenterY + hr * 0.62}, ${cx - hr * 0.58} ${chinY - 3.6}, ${neckBackX + 0.3} ${chinY - 0.8}`,
                `L ${neckBackX + 4.4} ${chinY - 4.4}`,
                `C ${earX - 2.6} ${earY + 4.8}, ${earX - 2.4} ${earY + 2.8}, ${earX - 1.4} ${earY - 3.4}`,
                `C ${earX + 1.8} ${earY - 4.8}, ${earX + 2.8} ${earY + 0.4}, ${earX + 3.2} ${earY + 1.8}`,
                `L ${earX + 4.2} ${earY - 4.0}`,
                `C ${cx + hr * 0.14} ${headCenterY - hr * 0.24}, ${cx + hr * 0.34} ${headTopY + 6.4}, ${cx + hr * 0.56} ${headTopY + 2.8}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-hair-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="1.02"
              strokeLinejoin="round"
            />
            <path
              d={`M ${cx + hr * 0.48} ${headTopY + 0.2} Q ${cx - hr * 0.04} ${headTopY - 4.8} ${cx - hr * 0.68} ${headTopY + 3.2} M ${cx + hr * 0.24} ${headTopY + 3.6} Q ${cx - hr * 0.26} ${headTopY + 1.2} ${cx - hr * 0.76} ${headCenterY + 3.8}`}
              fill="none"
              stroke="var(--avatar-hair-hi)"
              strokeWidth="0.92"
              strokeLinecap="round"
              opacity="0.7"
            />
          </>
        )}
      </g>

      {/* Oreja esculpida de perfil con hélix, antihélix y trago */}
      <g>
        <path
          d={[
            `M ${earX + 0.6} ${earY - 4.4}`,
            `C ${earX - 3.8} ${earY - 5.0}, ${earX - 4.4} ${earY + 2.2}, ${earX - 1.3} ${earY + 5.0}`,
            `C ${earX + 0.4} ${earY + 5.7}, ${earX + 1.7} ${earY + 3.6}, ${earX + 1.1} ${earY + 1.2}`,
          ].join(' ')}
          fill={`url(#${patternPrefix}-limb-grad)`}
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.94"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${earX - 0.5} ${earY - 2.3} C ${earX - 2.5} ${earY - 1.7}, ${earX - 2.5} ${earY + 2.0}, ${earX - 0.5} ${earY + 2.4} M ${earX + 0.35} ${earY - 0.3} Q ${earX - 0.75} ${earY + 0.6} ${earX + 0.3} ${earY + 1.4}`}
          fill="none"
          stroke="var(--mannequin-detail)"
          strokeWidth="0.56"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

/**
 * Cabeza trasera editorial con cráneo occipital natural, orejas detalladas y cabello en capas.
 */
export function EditorialBackHead({ rig, patternPrefix }: EditorialPartProps) {
  const { cx, headRx, headRy, headTopY, headCenterY, neckHalf, chinY, shoulderY, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const fw = headRx * (isFemale ? 1.08 : 1.07);
  const napeY = headCenterY + headRy * 0.84;

  return (
    <g data-editorial-head="back">
      {([-1, 1] as const).map((side) => {
        const ex = cx + side * fw * 0.96;
        const ey = headCenterY + headRy * 0.22;
        return (
          <g key={`back-ear-${side}`}>
            <path
              d={[
                `M ${ex} ${ey - 4.3}`,
                `C ${ex + side * 2.9} ${ey - 4.8}, ${ex + side * 3.3} ${ey + 1.0}, ${ex + side * 1.9} ${ey + 4.0}`,
                `C ${ex + side * 1.0} ${ey + 5.2}, ${ex} ${ey + 5.0}, ${ex - side * 0.4} ${ey + 3.6}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-limb-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.94"
              strokeLinejoin="round"
            />
            <path
              d={`M ${ex + side * 1.0} ${ey - 1.7} Q ${ex + side * 1.7} ${ey + 0.8} ${ex + side * 0.85} ${ey + 2.8}`}
              fill="none"
              stroke="var(--mannequin-detail)"
              strokeWidth="0.56"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {isFemale ? (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - fw * 1.24} ${headCenterY - 1}`,
              `C ${cx - fw * 1.38} ${headTopY + 1}, ${cx - fw * 0.64} ${headTopY - 7.4}, ${cx} ${headTopY - 6.8}`,
              `C ${cx + fw * 0.64} ${headTopY - 7.4}, ${cx + fw * 1.38} ${headTopY + 1}, ${cx + fw * 1.24} ${headCenterY - 1}`,
              `C ${cx + fw * 1.56} ${chinY + 8}, ${cx + fw * 1.6} ${shoulderY + 8}, ${cx + fw * 1.2} ${shoulderY + 25}`,
              `Q ${cx + fw * 0.46} ${shoulderY + 31} ${cx} ${shoulderY + 27}`,
              `Q ${cx - fw * 0.46} ${shoulderY + 31} ${cx - fw * 1.2} ${shoulderY + 25}`,
              `C ${cx - fw * 1.6} ${shoulderY + 8}, ${cx - fw * 1.56} ${chinY + 8}, ${cx - fw * 1.24} ${headCenterY - 1}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.02"
            strokeLinejoin="round"
          />
          <path
            d={[
              `M ${cx - fw * 0.62} ${headTopY + 3} C ${cx - fw * 0.94} ${chinY + 4}, ${cx - fw * 0.84} ${shoulderY + 10}, ${cx - fw * 0.52} ${shoulderY + 23}`,
              `M ${cx + fw * 0.62} ${headTopY + 3} C ${cx + fw * 0.94} ${chinY + 4}, ${cx + fw * 0.84} ${shoulderY + 10}, ${cx + fw * 0.52} ${shoulderY + 23}`,
              `M ${cx} ${headTopY + 1} C ${cx - fw * 0.12} ${chinY + 8}, ${cx + fw * 0.12} ${shoulderY + 12}, ${cx} ${shoulderY + 24}`,
            ].join(' ')}
            fill="none"
            stroke="var(--avatar-hair-hi)"
            strokeWidth="0.92"
            strokeLinecap="round"
            opacity="0.62"
          />
        </g>
      ) : (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - fw * 1.02} ${headCenterY + 2.0}`,
              `C ${cx - fw * 1.18} ${headCenterY - 5.5}, ${cx - fw * 1.16} ${headTopY + 2}, ${cx - fw * 0.78} ${headTopY - 4.2}`,
              `C ${cx - fw * 0.38} ${headTopY - 8.4}, ${cx + fw * 0.16} ${headTopY - 8.8}, ${cx + fw * 0.58} ${headTopY - 6.4}`,
              `C ${cx + fw * 0.94} ${headTopY - 5.0}, ${cx + fw * 1.18} ${headTopY + 2}, ${cx + fw * 1.02} ${headCenterY + 2.0}`,
              `C ${cx + fw * 0.92} ${napeY - 3.6}, ${cx + neckHalf + 0.8} ${napeY + 0.8}, ${cx + neckHalf * 0.72} ${napeY + 2.6}`,
              `Q ${cx} ${napeY + 3.8} ${cx - neckHalf * 0.72} ${napeY + 2.6}`,
              `C ${cx - neckHalf - 0.8} ${napeY + 0.8}, ${cx - fw * 0.92} ${napeY - 3.6}, ${cx - fw * 1.02} ${headCenterY + 2.0}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.02"
            strokeLinejoin="round"
          />
          <path
            d={`M ${cx - fw * 0.9} ${headCenterY + 4.4} Q ${cx} ${headCenterY + 9.2} ${cx + fw * 0.9} ${headCenterY + 4.4} C ${cx + neckHalf + 0.6} ${napeY + 0.8}, ${cx + neckHalf * 0.7} ${napeY + 2.4}, ${cx} ${napeY + 3.4} C ${cx - neckHalf * 0.7} ${napeY + 2.4}, ${cx - neckHalf - 0.6} ${napeY + 0.8}, ${cx - fw * 0.9} ${headCenterY + 4.4} Z`}
            fill="var(--avatar-hair-dark)"
            opacity="0.46"
          />
          <path
            d={`M ${cx - fw * 0.68} ${headTopY + 1.2} Q ${cx - fw * 0.08} ${headTopY - 4.4} ${cx + fw * 0.52} ${headTopY - 0.8} M ${cx - fw * 0.52} ${headCenterY - 2.6} Q ${cx} ${headCenterY - 6.0} ${cx + fw * 0.58} ${headCenterY - 1.8} M ${cx - fw * 0.22} ${headCenterY + 3.6} Q ${cx + fw * 0.04} ${headCenterY + 8.4} ${cx - fw * 0.04} ${napeY + 1.6}`}
            fill="none"
            stroke="var(--avatar-hair-hi)"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.64"
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
  const waistTopY = Math.max(
    rig.waistY + (rig.hipY - rig.waistY) * (isFemale ? 0.36 : 0.44),
    rig.hipY - (isFemale ? 17 : 18),
  );
  const bandBottomY = waistTopY + (isFemale ? 5.2 : 6.4);
  const hemY = rig.crotchY + (isFemale ? 13.5 : 17.5);

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

      <path d={boxerFillPath} fill={`url(#${patternPrefix}-basewear-grad)`} />
      <path d={bandFillPath} fill={`url(#${patternPrefix}-basewear-band-grad)`} />

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
