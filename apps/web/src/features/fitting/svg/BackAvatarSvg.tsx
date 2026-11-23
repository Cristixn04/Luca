import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX } from './anchors';
import { BackPantsTemplate } from './BackPantsTemplate';
import { BackTshirtTemplate } from './BackTshirtTemplate';
import { EditorialBackHead, EditorialBasewear } from './EditorialFigureParts';
import { isLowerCategory, type SingleAvatarViewProps } from './FrontAvatarSvg';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { MannequinDefs } from './MannequinDefs';
import { computeMannequinRig } from './mannequinRig';

export function BackAvatarSvg({
  model,
  silhouette = 'female',
  garmentCategory,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  outfitLayers,
  compact = false,
  frameless = false,
  patternIdSuffix,
}: SingleAvatarViewProps) {
  const rig = computeMannequinRig(model, silhouette);
  const cx = rig.cx;
  const a = rig.arm;
  const patternPrefix = patternIdSuffix ? `back-${patternIdSuffix}` : 'back';
  const bodyClipId = `${patternPrefix}-back-body-clip`;

  const wY = a.wrist.y;
  const handTipY = a.handTipY;
  const handLen = Math.max(14, handTipY - wY);
  const napeTopY = rig.headCenterY + rig.headRy * 0.68;
  const trapStartY = rig.chinY + (rig.shoulderY - rig.chinY) * 0.34;
  const deltoidDomeY = rig.shoulderY + 2;
  const heelOuterX = rig.ankleOuterX + 7.4;
  const heelInnerX = Math.max(3.0, rig.ankleInnerX - 2.8);
  const calfMidX = (rig.calfOuterX + rig.calfInnerX) * 0.5;
  const kneeMidX = (rig.kneeOuterX + rig.kneeInnerX) * 0.5;
  const thighMidY = rig.crotchY + (rig.kneeY - rig.crotchY) * 0.5;

  // Silueta posterior continua: nuca atlética -> caída diagonal de trapecios -> deltoides redondeados ->
  // brazos en postura A -> dorsales (backChestX) -> muslos y gemelos esculpidos -> talones realistas
  const unifiedBackPath = [
    `M ${cx - rig.neckHalf} ${napeTopY}`,
    `C ${cx - rig.neckHalf - 0.5} ${trapStartY}, ${cx - rig.neckHalf - 3.5} ${rig.neckBaseY + 3}, ${cx - rig.shoulderX * 0.68} ${rig.shoulderY - 1.5}`,
    `C ${cx - rig.shoulderX * 0.96} ${deltoidDomeY - 1}, ${cx - a.deltoid.outerX - 1.6} ${deltoidDomeY + 4}, ${cx - a.deltoid.outerX - 1.4} ${a.deltoid.y + 10}`,
    // Brazo izquierdo posterior exterior
    `C ${cx - a.bicep.outerX - 1.8} ${a.bicep.y - 5}, ${cx - a.bicep.outerX - 0.8} ${a.bicep.y + 6}, ${cx - a.elbow.outerX} ${a.elbow.y}`,
    `C ${cx - a.forearm.outerX - 2.2} ${a.forearm.y - 10}, ${cx - a.forearm.outerX - 1.0} ${a.forearm.y + 6}, ${cx - a.wrist.outerX} ${wY}`,
    // Mano izquierda vista posterior
    `C ${cx - (a.wrist.outerX + 3.2)} ${wY + handLen * 0.28}, ${cx - (a.wrist.outerX + 2.4)} ${handTipY - handLen * 0.24}, ${cx - (a.wrist.outerX - 1.0)} ${handTipY - 2.6}`,
    `C ${cx - (a.wrist.innerX + 4.4)} ${handTipY + 0.8}, ${cx - (a.wrist.innerX + 1.8)} ${handTipY + 0.4}, ${cx - (a.wrist.innerX + 0.5)} ${handTipY - 3.8}`,
    `C ${cx - (a.wrist.innerX + 0.2)} ${wY + handLen * 0.58}, ${cx - (a.wrist.innerX + 0.2)} ${wY + handLen * 0.48}, ${cx - (a.wrist.innerX - 0.8)} ${wY + handLen * 0.4}`,
    `L ${cx - (a.wrist.innerX - 3.8)} ${wY + handLen * 0.54}`,
    `C ${cx - (a.wrist.innerX - 5.2)} ${wY + handLen * 0.46}, ${cx - (a.wrist.innerX - 3.0)} ${wY + handLen * 0.2}, ${cx - a.wrist.innerX} ${wY}`,
    // Brazo izquierdo interior -> axila posterior
    `C ${cx - a.forearm.innerX + 0.6} ${a.forearm.y + 4}, ${cx - a.elbow.innerX} ${a.elbow.y + 4}, ${cx - a.elbow.innerX} ${a.elbow.y}`,
    `C ${cx - a.bicep.innerX} ${a.bicep.y + 3}, ${cx - rig.armpitX - 1.2} ${rig.armpitY + 5}, ${cx - rig.armpitX} ${rig.armpitY}`,
    // Dorsal ancho izquierdo (rig.backChestX) -> cintura -> cadera
    `C ${cx - rig.backChestX - 1.2} ${rig.chestY + 2}, ${cx - rig.backChestX + 0.8} ${rig.waistY - 14}, ${cx - rig.waistX} ${rig.waistY}`,
    `C ${cx - rig.waistX - 0.8} ${rig.hipY - 15}, ${cx - rig.hipX - 0.8} ${rig.hipY - 10}, ${cx - rig.hipX} ${rig.hipY}`,
    // Pierna izquierda posterior exterior -> gemelo -> tobillo -> pie posterior con talón
    `C ${cx - rig.hipX * 1.02} ${rig.crotchY + 10}, ${cx - rig.hipX * 0.94} ${rig.crotchY + 34}, ${cx - rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx - rig.calfOuterX - 2.0} ${rig.calfY - 10}, ${cx - rig.calfOuterX - 0.6} ${rig.calfY + 12}, ${cx - rig.ankleOuterX} ${rig.ankleJointY}`,
    `C ${cx - rig.ankleOuterX - 2.2} ${rig.footY - 6}, ${cx - heelOuterX - 1.2} ${rig.footY - 2.4}, ${cx - heelOuterX + 0.6} ${rig.footY + 0.5}`,
    `C ${cx - heelOuterX + 4.2} ${rig.footY + 2.2}, ${cx - heelInnerX - 2.6} ${rig.footY + 2.2}, ${cx - heelInnerX} ${rig.footY + 0.4}`,
    `C ${cx - heelInnerX + 1.4} ${rig.footY - 3.6}, ${cx - rig.ankleInnerX + 1.2} ${rig.ankleJointY + 3}, ${cx - rig.ankleInnerX} ${rig.ankleJointY}`,
    // Pierna izquierda interior -> entrepierna
    `C ${cx - rig.calfInnerX + 0.4} ${rig.calfY + 12}, ${cx - rig.calfInnerX - 2.2} ${rig.calfY - 10}, ${cx - rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx - rig.kneeInnerX - 2.6} ${rig.crotchY + 36}, ${cx - 3.4} ${rig.crotchY + 11}, ${cx} ${rig.crotchY + 3.2}`,
    // Pierna derecha interior (espejo)
    `C ${cx + 3.4} ${rig.crotchY + 11}, ${cx + rig.kneeInnerX + 2.6} ${rig.crotchY + 36}, ${cx + rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx + rig.calfInnerX + 2.2} ${rig.calfY - 10}, ${cx + rig.calfInnerX - 0.4} ${rig.calfY + 12}, ${cx + rig.ankleInnerX} ${rig.ankleJointY}`,
    // Pie derecho posterior con talón
    `C ${cx + rig.ankleInnerX - 1.2} ${rig.ankleJointY + 3}, ${cx + heelInnerX - 1.4} ${rig.footY - 3.6}, ${cx + heelInnerX} ${rig.footY + 0.4}`,
    `C ${cx + heelInnerX + 2.6} ${rig.footY + 2.2}, ${cx + heelOuterX - 4.2} ${rig.footY + 2.2}, ${cx + heelOuterX - 0.6} ${rig.footY + 0.5}`,
    `C ${cx + heelOuterX + 1.2} ${rig.footY - 2.4}, ${cx + rig.ankleOuterX + 2.2} ${rig.footY - 6}, ${cx + rig.ankleOuterX} ${rig.ankleJointY}`,
    // Pierna derecha exterior -> cadera -> cintura -> dorsal derecho -> axila
    `C ${cx + rig.calfOuterX + 0.6} ${rig.calfY + 12}, ${cx + rig.calfOuterX + 2.0} ${rig.calfY - 10}, ${cx + rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx + rig.hipX * 0.94} ${rig.crotchY + 34}, ${cx + rig.hipX * 1.02} ${rig.crotchY + 10}, ${cx + rig.hipX} ${rig.hipY}`,
    `C ${cx + rig.hipX + 0.8} ${rig.hipY - 10}, ${cx + rig.waistX + 0.8} ${rig.hipY - 15}, ${cx + rig.waistX} ${rig.waistY}`,
    `C ${cx + rig.backChestX - 0.8} ${rig.waistY - 14}, ${cx + rig.backChestX + 1.2} ${rig.chestY + 2}, ${cx + rig.armpitX} ${rig.armpitY}`,
    // Brazo derecho interior -> mano derecha -> brazo derecho exterior -> deltoides -> trapecio -> nuca
    `C ${cx + rig.armpitX + 1.2} ${rig.armpitY + 5}, ${cx + a.bicep.innerX} ${a.bicep.y + 3}, ${cx + a.elbow.innerX} ${a.elbow.y}`,
    `C ${cx + a.elbow.innerX} ${a.elbow.y + 4}, ${cx + a.forearm.innerX - 0.6} ${a.forearm.y + 4}, ${cx + a.wrist.innerX} ${wY}`,
    `C ${cx + (a.wrist.innerX - 3.0)} ${wY + handLen * 0.2}, ${cx + (a.wrist.innerX - 5.2)} ${wY + handLen * 0.46}, ${cx + (a.wrist.innerX - 3.8)} ${wY + handLen * 0.54}`,
    `L ${cx + (a.wrist.innerX - 0.8)} ${wY + handLen * 0.4}`,
    `C ${cx + (a.wrist.innerX + 0.2)} ${wY + handLen * 0.48}, ${cx + (a.wrist.innerX + 0.2)} ${wY + handLen * 0.58}, ${cx + (a.wrist.innerX + 0.5)} ${handTipY - 3.8}`,
    `C ${cx + (a.wrist.innerX + 1.8)} ${handTipY + 0.4}, ${cx + (a.wrist.innerX + 4.4)} ${handTipY + 0.8}, ${cx + (a.wrist.outerX - 1.0)} ${handTipY - 2.6}`,
    `C ${cx + (a.wrist.outerX + 2.4)} ${handTipY - handLen * 0.24}, ${cx + (a.wrist.outerX + 3.2)} ${wY + handLen * 0.28}, ${cx + a.wrist.outerX} ${wY}`,
    `C ${cx + a.forearm.outerX + 1.0} ${a.forearm.y + 6}, ${cx + a.forearm.outerX + 2.2} ${a.forearm.y - 10}, ${cx + a.elbow.outerX} ${a.elbow.y}`,
    `C ${cx + a.bicep.outerX + 0.8} ${a.bicep.y + 6}, ${cx + a.bicep.outerX + 1.8} ${a.bicep.y - 5}, ${cx + a.deltoid.outerX + 1.4} ${a.deltoid.y + 10}`,
    `C ${cx + a.deltoid.outerX + 1.6} ${deltoidDomeY + 4}, ${cx + rig.shoulderX * 0.96} ${deltoidDomeY - 1}, ${cx + rig.shoulderX * 0.68} ${rig.shoulderY - 1.5}`,
    `C ${cx + rig.neckHalf + 3.5} ${rig.neckBaseY + 3}, ${cx + rig.neckHalf + 0.5} ${trapStartY}, ${cx + rig.neckHalf} ${napeTopY}`,
    'Z',
  ].join(' ');

  const isBackEstimated = model.backWidthEstimated || model.backLengthEstimated;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
      role="img"
      aria-label="Avatar paramétrico de espalda con mapa de calor de calce"
    >
      <HeatmapPatternDefs prefix={patternPrefix} />
      <MannequinDefs prefix={patternPrefix} />
      <defs>
        <clipPath id={bodyClipId}>
          <path d={unifiedBackPath} />
        </clipPath>
      </defs>

      {/* Relleno base cálido del cuerpo posterior unificado */}
      <path
        d={unifiedBackPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        data-avatar-body="back"
      />

      {/* Sombreado muscular posterior esculpido por planos tonales suaves (sin rayas bruscas) */}
      <g clipPath={`url(#${bodyClipId})`} pointerEvents="none">
        {/* Sombra bajo la línea del cabello en la nuca */}
        <path
          d={`M ${cx - rig.neckHalf - 4} ${napeTopY} L ${cx + rig.neckHalf + 4} ${napeTopY} L ${cx + rig.neckHalf + 2} ${rig.neckBaseY + 1} Q ${cx} ${rig.neckBaseY + 7} ${cx - rig.neckHalf - 2} ${rig.neckBaseY + 1} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
          opacity="0.68"
        />

        {/* Surco espinal central modelado con volumen tonal */}
        <path
          d={`M ${cx - 2.4} ${rig.shoulderY + 8} Q ${cx} ${rig.chestY + 14} ${cx - 4.2} ${rig.waistY + 6} L ${cx + 4.2} ${rig.waistY + 6} Q ${cx} ${rig.chestY + 14} ${cx + 2.4} ${rig.shoulderY + 8} Z`}
          fill={`url(#${patternPrefix}-skin-core-shade)`}
          opacity="0.66"
        />

        {([-1, 1] as const).map((side) => (
          <g key={`back-shade-${side}`}>
            {/* Plano lateral del dorsal ancho y oblicuos */}
            <path
              d={[
                `M ${cx + side * (rig.backChestX + 2)} ${rig.armpitY - 2}`,
                `C ${cx + side * (rig.backChestX - 7.5)} ${rig.chestY + 8}, ${cx + side * (rig.waistX - 5.5)} ${rig.waistY - 4}, ${cx + side * (rig.hipX - 6)} ${rig.hipY}`,
                `L ${cx + side * (rig.hipX + 4)} ${rig.hipY}`,
                `L ${cx + side * (rig.backChestX + 4)} ${rig.armpitY - 2}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity={side === 1 ? '0.84' : '0.64'}
            />
            {/* Volumen tonal del omóplato y relieve del trapecio */}
            <path
              d={[
                `M ${cx + side * rig.backChestX * 0.22} ${rig.shoulderY + 14}`,
                `Q ${cx + side * rig.backChestX * 0.56} ${rig.shoulderY + 11} ${cx + side * rig.backChestX * 0.72} ${rig.chestY + 4}`,
                `Q ${cx + side * rig.backChestX * 0.44} ${rig.chestY + 18} ${cx + side * rig.backChestX * 0.2} ${rig.chestY + 11}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.58"
            />
            {/* Brillo en la parte alta del omóplato y deltoides posterior */}
            <ellipse
              cx={cx + side * rig.backChestX * 0.44}
              cy={rig.shoulderY + 18}
              rx={rig.backChestX * 0.2}
              ry={7}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.72"
            />
            <ellipse
              cx={cx + side * (rig.shoulderX - 1)}
              cy={a.deltoid.y + 6}
              rx={6}
              ry={10.5}
              fill={`url(#${patternPrefix}-skin-sheen)`}
            />
            {/* Sombra interior de tríceps y antebrazo */}
            <path
              d={[
                `M ${cx + side * (a.bicep.innerX - 0.5)} ${rig.armpitY + 1}`,
                `L ${cx + side * (a.bicep.innerX + 4.0)} ${a.bicep.y}`,
                `L ${cx + side * (a.elbow.innerX + 3.0)} ${a.elbow.y}`,
                `L ${cx + side * (a.wrist.innerX + 2.0)} ${wY}`,
                `L ${cx + side * (a.wrist.innerX - 2)} ${wY}`,
                `L ${cx + side * (a.elbow.innerX - 2)} ${a.elbow.y}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity="0.68"
            />
            {/* Sombra de isquiotibiales y hueco poplíteo */}
            <path
              d={`M ${cx + side * 1.2} ${rig.crotchY + 3} L ${cx + side * (rig.kneeInnerX + 6.5)} ${thighMidY} L ${cx + side * (rig.kneeInnerX + 4.2)} ${rig.kneeY + 4} L ${cx + side * (rig.kneeInnerX - 2)} ${rig.kneeY + 4} L ${cx + side * 1} ${rig.crotchY + 3} Z`}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.54"
            />
            <ellipse
              cx={cx + side * kneeMidX}
              cy={rig.kneeY + 1}
              rx={6.4}
              ry={3.2}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity="0.48"
            />
            {/* Volumen esculpido de las dos cabezas del gemelo y tendón de Aquiles */}
            <path
              d={[
                `M ${cx + side * (rig.calfOuterX - 1.5)} ${rig.calfY - 4}`,
                `Q ${cx + side * calfMidX} ${rig.calfY + 14} ${cx + side * (rig.calfInnerX + 1.5)} ${rig.calfY - 2}`,
                `Q ${cx + side * calfMidX} ${rig.calfY + 25} ${cx + side * (rig.ankleInnerX + (rig.ankleOuterX - rig.ankleInnerX) * 0.5)} ${rig.ankleJointY - 2}`,
                `L ${cx + side * (rig.calfOuterX + 2)} ${rig.calfY + 12}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.6"
            />
            <ellipse
              cx={cx + side * calfMidX}
              cy={rig.calfY - 4}
              rx={5}
              ry={11}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.78"
            />
          </g>
        ))}
      </g>

      {/* Trazos anatómicos posteriores muy sutiles (fieles a ilustración editorial sin líneas duras) */}
      <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Surco espinal y hoyuelos lumbares delicados */}
        <path
          d={`M ${cx} ${rig.shoulderY + 5} L ${cx} ${rig.waistY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.62"
          opacity="0.62"
        />
        <path
          d={`M ${cx - 5.4} ${rig.waistY + 1.5} Q ${cx - 4.4} ${rig.waistY + 3.2} ${cx - 3.6} ${rig.waistY + 2} M ${cx + 5.4} ${rig.waistY + 1.5} Q ${cx + 4.4} ${rig.waistY + 3.2} ${cx + 3.6} ${rig.waistY + 2}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.6"
          opacity="0.58"
        />

        {([-1, 1] as const).map((side) => (
          <g key={`back-lines-${side}`}>
            {/* Acento delicado del borde inferior del omóplato */}
            <path
              d={`M ${cx + side * rig.backChestX * 0.56} ${rig.shoulderY + 16} Q ${cx + side * rig.backChestX * 0.34} ${rig.chestY + 4} ${cx + side * rig.backChestX * 0.25} ${rig.chestY + 13}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.62"
              opacity="0.56"
            />
            {/* Pliegue axilar posterior */}
            <path
              d={`M ${cx + side * rig.armpitX} ${rig.armpitY} Q ${cx + side * (rig.armpitX + 1.8)} ${rig.armpitY - 7} ${cx + side * (rig.shoulderX * 0.85)} ${rig.shoulderY + 12}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.82"
              opacity="0.72"
            />
            {/* Marca sutil del codo y dedos traseros */}
            <path
              d={`M ${cx + side * (a.elbow.innerX + 2.4)} ${a.elbow.y - 1.5} Q ${cx + side * ((a.elbow.innerX + a.elbow.outerX) * 0.5)} ${a.elbow.y + 1.8} ${cx + side * (a.elbow.outerX - 2.4)} ${a.elbow.y - 1.5}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.6"
              opacity="0.68"
            />
            <path
              d={`M ${cx + side * (a.wrist.innerX + 2.8)} ${handTipY - handLen * 0.36} L ${cx + side * (a.wrist.innerX + 2.0)} ${handTipY - 1.2} M ${cx + side * (a.wrist.outerX - 1.8)} ${handTipY - handLen * 0.42} L ${cx + side * (a.wrist.outerX - 2.8)} ${handTipY - 2.4}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.6"
              opacity="0.7"
            />
            {/* Pliegue poplíteo detrás de la rodilla */}
            <path
              d={`M ${cx + side * (rig.kneeOuterX - 4.8)} ${rig.kneeY + 1.5} Q ${cx + side * kneeMidX} ${rig.kneeY - 1.6} ${cx + side * (rig.kneeInnerX + 4.2)} ${rig.kneeY + 1.5}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.72"
              opacity="0.66"
            />
            {/* Gemelo inferior, tendón de Aquiles y talón */}
            <path
              d={`M ${cx + side * (rig.calfOuterX - 4.2)} ${rig.calfY + 4} Q ${cx + side * calfMidX} ${rig.calfY + 11.5} ${cx + side * (rig.calfInnerX + 3.4)} ${rig.calfY + 5}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.7"
              opacity="0.75"
            />
            <path
              d={`M ${cx + side * (rig.ankleInnerX + (rig.ankleOuterX - rig.ankleInnerX) * 0.44)} ${rig.calfY + 16} L ${cx + side * (rig.ankleInnerX + (rig.ankleOuterX - rig.ankleInnerX) * 0.44)} ${rig.ankleJointY + 5}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.62"
              opacity="0.72"
            />
            <path
              d={`M ${cx + side * (rig.ankleInnerX + 0.5)} ${rig.footY - 4} Q ${cx + side * ((rig.ankleInnerX + rig.ankleOuterX) * 0.5)} ${rig.footY - 1.4} ${cx + side * (rig.ankleOuterX - 0.5)} ${rig.footY - 4}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.62"
              opacity="0.7"
            />
          </g>
        ))}
      </g>

      {/* Ropa base verde oliva mate recortada limpiamente al cuerpo posterior */}
      <EditorialBasewear
        view="back"
        rig={rig}
        patternPrefix={patternPrefix}
        bodyClipId={bodyClipId}
      />

      {/* Contorno exterior de tinta espresso limpia abrazando cuerpo y ropa base */}
      <path
        d={unifiedBackPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Cabeza trasera con orejas y cabello castaño en capas */}
      <EditorialBackHead rig={rig} patternPrefix={patternPrefix} />

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <BackPantsTemplate
              rig={rig}
              fitReport={outfitLayers.bottomFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.bottomColorHex}
              garmentMeta={outfitLayers.bottomMeta}
              variant={outfitLayers.bottomVariant}
            />
          )}
          {outfitLayers.topFitReport && (
            <BackTshirtTemplate
              model={model}
              rig={rig}
              fitReport={outfitLayers.topFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.topColorHex}
              garmentMeta={outfitLayers.topMeta}
              variant={outfitLayers.topVariant}
            />
          )}
          {outfitLayers.outerwearFitReport && (
            <BackTshirtTemplate
              model={model}
              rig={rig}
              fitReport={outfitLayers.outerwearFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.outerwearColorHex}
              garmentMeta={outfitLayers.outerwearMeta}
              variant="jacket"
            />
          )}
        </>
      ) : (
        <>
          {fitReport && !isLowerCategory(garmentCategory) && (
            <BackTshirtTemplate
              model={model}
              rig={rig}
              fitReport={fitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={garmentColorHex}
              garmentMeta={garmentMeta}
              variant={garmentCategory}
            />
          )}
          {fitReport && isLowerCategory(garmentCategory) && (
            <BackPantsTemplate
              rig={rig}
              fitReport={fitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={garmentColorHex}
              garmentMeta={garmentMeta}
              variant={garmentCategory}
            />
          )}
        </>
      )}
    </svg>
  );

  if (frameless) {
    return svgNode;
  }

  return (
    <div
      data-avatar-view="back"
      data-mannequin-silhouette={silhouette}
      className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg p-3 ${compact ? 'w-full' : 'w-full max-w-[320px]'}`}
    >
      <div className="flex w-full items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">Espalda</span>
        {isBackEstimated && (
          <Badge data-estimated-badge="back">Espalda: estimado</Badge>
        )}
      </div>
      {svgNode}
    </div>
  );
}
