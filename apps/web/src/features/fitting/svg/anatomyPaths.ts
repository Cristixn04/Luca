import type { MannequinRig } from './mannequinRig';

/**
 * Trazo anatómico continuo de mano abierta en perspectiva 3/4 natural
 * (pulgar interior separado + 4 dedos curvados suavemente hacia el muslo).
 */
function buildArticulatedHandSegment(
  rig: MannequinRig,
  side: -1 | 1,
  direction: 'outerToInner' | 'innerToOuter',
): string[] {
  const { cx, arm, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const wY = arm.wrist.y;
  const tipY = arm.handTipY;
  const hLen = Math.max(15, tipY - wY);

  const wOutX = cx + side * arm.wrist.outerX;
  const wInX = cx + side * arm.wrist.innerX;
  const palmSpread = isFemale ? 2.8 : 3.8;

  const knuckleOutX = wOutX + side * palmSpread;
  const knuckleOutY = wY + hLen * 0.34;
  const pinkyX = wOutX + side * (palmSpread * 0.5);
  const pinkyY = wY + hLen * 0.78;
  const middleX = wInX + side * (isFemale ? 2.6 : 3.4);
  const middleY = tipY + 0.8;
  const indexX = wInX + side * (isFemale ? 0.6 : 1.0);
  const indexY = wY + hLen * 0.86;
  const thumbWebX = wInX - side * 0.2;
  const thumbWebY = wY + hLen * 0.44;
  const thumbTipX = wInX - side * (isFemale ? 3.8 : 4.6);
  const thumbTipY = wY + hLen * 0.58;
  const thumbPadX = wInX - side * (isFemale ? 2.8 : 3.5);
  const thumbPadY = wY + hLen * 0.26;

  if (direction === 'outerToInner') {
    return [
      `C ${knuckleOutX + side * 0.5} ${wY + hLen * 0.16}, ${knuckleOutX + side * 0.4} ${knuckleOutY + 2}, ${pinkyX} ${pinkyY}`,
      `C ${pinkyX - side * 0.8} ${tipY - 2}, ${middleX + side * 2.0} ${middleY + 0.6}, ${middleX} ${middleY}`,
      `C ${middleX - side * 1.3} ${middleY - 0.3}, ${indexX + side * 0.4} ${indexY + 2}, ${indexX} ${indexY}`,
      `C ${indexX - side * 0.4} ${wY + hLen * 0.64}, ${thumbWebX + side * 0.5} ${thumbWebY + 2}, ${thumbWebX} ${thumbWebY}`,
      `C ${thumbWebX - side * 1.4} ${thumbWebY + 2.4}, ${thumbTipX + side * 0.8} ${thumbTipY + 1.2}, ${thumbTipX} ${thumbTipY}`,
      `C ${thumbTipX - side * 1.3} ${thumbTipY - 2.2}, ${thumbPadX - side * 0.6} ${thumbPadY + 2}, ${wInX} ${wY}`,
    ];
  }

  return [
    `C ${thumbPadX - side * 0.6} ${thumbPadY + 2}, ${thumbTipX - side * 1.3} ${thumbTipY - 2.2}, ${thumbTipX} ${thumbTipY}`,
    `C ${thumbTipX + side * 0.8} ${thumbTipY + 1.2}, ${thumbWebX - side * 1.4} ${thumbWebY + 2.4}, ${thumbWebX} ${thumbWebY}`,
    `C ${thumbWebX + side * 0.5} ${thumbWebY + 2}, ${indexX - side * 0.4} ${wY + hLen * 0.64}, ${indexX} ${indexY}`,
    `C ${indexX + side * 0.4} ${indexY + 2}, ${middleX - side * 1.3} ${middleY - 0.3}, ${middleX} ${middleY}`,
    `C ${middleX + side * 2.0} ${middleY + 0.6}, ${pinkyX - side * 0.8} ${tipY - 2}, ${pinkyX} ${pinkyY}`,
    `C ${knuckleOutX + side * 0.4} ${knuckleOutY + 2}, ${knuckleOutX + side * 0.5} ${wY + hLen * 0.16}, ${wOutX} ${wY}`,
  ];
}

/**
 * Silueta anatómica continua C¹-suave de Frente o Espalda basada en croquis profesionales:
 * tangentes verticales exactas en cintura, cadera, rodillas y gemelos (cero escalones ni quiebres).
 */
export function buildAnatomicalFrontBackPath(
  rig: MannequinRig,
  view: 'front' | 'back',
): string {
  const { cx, arm: a, silhouette } = rig;
  const isFemale = silhouette === 'female';
  const chestLatX = view === 'back' ? rig.backChestX : rig.chestX;

  const neckTopY = view === 'back' ? rig.headCenterY + rig.headRy * 0.68 : rig.chinY - 6;
  const neckMidY = neckTopY + (rig.shoulderY - neckTopY) * 0.48;
  const neckWaistX = rig.neckHalf * (isFemale ? 0.93 : 0.96);
  const trapSlopeY = rig.shoulderY - (isFemale ? 1.0 : 2.0);
  const deltoidDomeY = rig.shoulderY + (isFemale ? 3.5 : 2.5);

  // Continuidad C¹ en cintura -> cadera -> muslo -> rodilla
  const waistToHip = rig.hipY - rig.waistY;
  const hipToKnee = rig.kneeY - rig.hipY;
  const lowerLegLen = rig.ankleJointY - rig.kneeY;

  // Asimetría anatómica real del gastrocnemio (pico exterior más alto, pico interior ligeramente más bajo)
  const calfOuterY = rig.kneeY + lowerLegLen * 0.29;
  const calfInnerY = rig.kneeY + lowerLegLen * 0.36;
  const hipApexX = rig.hipX;

  // Pies proporcionados
  const footOuterX = rig.ankleOuterX + (view === 'back' ? 6.8 : isFemale ? 7.6 : 9.4);
  const footInnerX = Math.max(2.2, rig.ankleInnerX - (view === 'back' ? 2.6 : isFemale ? 3.4 : 4.0));

  const wY = a.wrist.y;
  const leftHand = buildArticulatedHandSegment(rig, -1, 'outerToInner');
  const rightHand = buildArticulatedHandSegment(rig, 1, 'innerToOuter');

  return [
    // Cuello cóncavo -> trapecio fluido -> deltoides en gota
    `M ${cx - rig.neckHalf} ${neckTopY}`,
    `C ${cx - neckWaistX} ${neckMidY}, ${cx - rig.neckHalf - 2.6} ${rig.neckBaseY + 3.5}, ${cx - rig.shoulderX * 0.66} ${trapSlopeY}`,
    `C ${cx - rig.shoulderX * 0.96} ${deltoidDomeY - 1.5}, ${cx - a.deltoid.outerX - 1.4} ${deltoidDomeY + 4.5}, ${cx - a.deltoid.outerX - 1.2} ${a.deltoid.y + 10}`,
    // Brazo izquierdo exterior en curva orgánica continua (sin pellizcarse en codo)
    `C ${cx - a.bicep.outerX - 1.2} ${a.bicep.y - 4}, ${cx - a.bicep.outerX - 0.8} ${a.bicep.y + 8}, ${cx - a.elbow.outerX} ${a.elbow.y}`,
    `C ${cx - a.forearm.outerX - 1.4} ${a.forearm.y - 10}, ${cx - a.forearm.outerX - 0.8} ${a.forearm.y + 8}, ${cx - a.wrist.outerX} ${wY}`,
    ...leftHand,
    // Brazo izquierdo interior paralelo al exterior -> axila
    `C ${cx - a.forearm.innerX + 0.4} ${a.forearm.y + 8}, ${cx - a.elbow.innerX} ${a.elbow.y + 6}, ${cx - a.elbow.innerX} ${a.elbow.y}`,
    `C ${cx - a.bicep.innerX} ${a.bicep.y + 6}, ${cx - rig.armpitX - 0.8} ${rig.armpitY + 6}, ${cx - rig.armpitX} ${rig.armpitY}`,
    // Torso izquierdo: axila -> pecho -> cintura (tangente vertical C¹ en waistY)
    `C ${cx - chestLatX} ${rig.chestY + 6}, ${cx - rig.waistX} ${rig.waistY - 16}, ${cx - rig.waistX} ${rig.waistY}`,
    // Cintura -> cadera (curva en S sedosa C¹: sale vertical de waistX y llega vertical a hipApexX!)
    `C ${cx - rig.waistX} ${rig.waistY + waistToHip * 0.4}, ${cx - hipApexX} ${rig.hipY - waistToHip * 0.46}, ${cx - hipApexX} ${rig.hipY}`,
    // Cadera -> muslo exterior -> rodilla (sale vertical de hipApexX y fluye suave a kneeOuterX)
    `C ${cx - hipApexX} ${rig.hipY + hipToKnee * 0.28}, ${cx - rig.kneeOuterX - 4.5} ${rig.kneeY - hipToKnee * 0.34}, ${cx - rig.kneeOuterX} ${rig.kneeY}`,
    // Rodilla exterior -> gemelo exterior (tangente vertical C¹ en calfOuterY) -> tobillo
    `C ${cx - rig.calfOuterX - 0.6} ${rig.kneeY + (calfOuterY - rig.kneeY) * 0.42}, ${cx - rig.calfOuterX - 1.0} ${calfOuterY - 10}, ${cx - rig.calfOuterX - 1.0} ${calfOuterY}`,
    `C ${cx - rig.calfOuterX - 1.0} ${calfOuterY + 18}, ${cx - rig.ankleOuterX - 1.2} ${rig.ankleJointY - 16}, ${cx - rig.ankleOuterX} ${rig.ankleJointY}`,
    // Pie izquierdo
    `C ${cx - rig.ankleOuterX - 2.0} ${rig.footY - 6.5}, ${cx - footOuterX - 1.2} ${rig.footY - 2.2}, ${cx - footOuterX + 0.6} ${rig.footY + 0.6}`,
    `C ${cx - footOuterX + 4.2} ${rig.footY + 2.3}, ${cx - footInnerX - 3.6} ${rig.footY + 2.3}, ${cx - footInnerX} ${rig.footY + 0.4}`,
    `C ${cx - footInnerX + 1.6} ${rig.footY - 3.6}, ${cx - rig.ankleInnerX + 1.2} ${rig.ankleJointY + 3}, ${cx - rig.ankleInnerX} ${rig.ankleJointY}`,
    // Tobillo interior -> gemelo interior (tangente vertical C¹ en calfInnerY) -> rodilla interior -> entrepierna
    `C ${cx - rig.ankleInnerX + 0.6} ${rig.ankleJointY - 14}, ${cx - rig.calfInnerX - 0.8} ${calfInnerY + 16}, ${cx - rig.calfInnerX - 0.8} ${calfInnerY}`,
    `C ${cx - rig.calfInnerX - 0.8} ${calfInnerY - 14}, ${cx - rig.kneeInnerX} ${rig.kneeY + 10}, ${cx - rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx - rig.kneeInnerX} ${rig.kneeY - hipToKnee * 0.28}, ${cx - 2.6} ${rig.crotchY + 14}, ${cx} ${rig.crotchY + 3.0}`,
    // Pierna derecha interior (espejo exacto C¹)
    `C ${cx + 2.6} ${rig.crotchY + 14}, ${cx + rig.kneeInnerX} ${rig.kneeY - hipToKnee * 0.28}, ${cx + rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx + rig.kneeInnerX} ${rig.kneeY + 10}, ${cx + rig.calfInnerX + 0.8} ${calfInnerY - 14}, ${cx + rig.calfInnerX + 0.8} ${calfInnerY}`,
    `C ${cx + rig.calfInnerX + 0.8} ${calfInnerY + 16}, ${cx + rig.ankleInnerX - 0.6} ${rig.ankleJointY - 14}, ${cx + rig.ankleInnerX} ${rig.ankleJointY}`,
    // Pie derecho
    `C ${cx + rig.ankleInnerX - 1.2} ${rig.ankleJointY + 3}, ${cx + footInnerX - 1.6} ${rig.footY - 3.6}, ${cx + footInnerX} ${rig.footY + 0.4}`,
    `C ${cx + footInnerX + 3.6} ${rig.footY + 2.3}, ${cx + footOuterX - 4.2} ${rig.footY + 2.3}, ${cx + footOuterX - 0.6} ${rig.footY + 0.6}`,
    `C ${cx + footOuterX + 1.2} ${rig.footY - 2.2}, ${cx + rig.ankleOuterX + 2.0} ${rig.footY - 6.5}, ${cx + rig.ankleOuterX} ${rig.ankleJointY}`,
    // Tobillo exterior -> gemelo exterior -> rodilla -> muslo -> cadera -> cintura -> axila
    `C ${cx + rig.ankleOuterX + 1.2} ${rig.ankleJointY - 16}, ${cx + rig.calfOuterX + 1.0} ${calfOuterY + 18}, ${cx + rig.calfOuterX + 1.0} ${calfOuterY}`,
    `C ${cx + rig.calfOuterX + 1.0} ${calfOuterY - 10}, ${cx + rig.calfOuterX + 0.6} ${rig.kneeY + (calfOuterY - rig.kneeY) * 0.42}, ${cx + rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx + rig.kneeOuterX + 4.5} ${rig.kneeY - hipToKnee * 0.34}, ${cx + hipApexX} ${rig.hipY + hipToKnee * 0.28}, ${cx + hipApexX} ${rig.hipY}`,
    `C ${cx + hipApexX} ${rig.hipY - waistToHip * 0.46}, ${cx + rig.waistX} ${rig.waistY + waistToHip * 0.4}, ${cx + rig.waistX} ${rig.waistY}`,
    `C ${cx + rig.waistX} ${rig.waistY - 16}, ${cx + chestLatX} ${rig.chestY + 6}, ${cx + rig.armpitX} ${rig.armpitY}`,
    // Brazo derecho interior -> mano derecha -> brazo derecho exterior -> deltoides -> trapecio -> cuello
    `C ${cx + rig.armpitX + 0.8} ${rig.armpitY + 6}, ${cx + a.bicep.innerX} ${a.bicep.y + 6}, ${cx + a.elbow.innerX} ${a.elbow.y}`,
    `C ${cx + a.elbow.innerX} ${a.elbow.y + 6}, ${cx + a.forearm.innerX - 0.4} ${a.forearm.y + 8}, ${cx + a.wrist.innerX} ${wY}`,
    ...rightHand,
    `C ${cx + a.forearm.outerX + 0.8} ${a.forearm.y + 8}, ${cx + a.forearm.outerX + 1.4} ${a.forearm.y - 10}, ${cx + a.elbow.outerX} ${a.elbow.y}`,
    `C ${cx + a.bicep.outerX + 0.8} ${a.bicep.y + 8}, ${cx + a.bicep.outerX + 1.2} ${a.bicep.y - 4}, ${cx + a.deltoid.outerX + 1.2} ${a.deltoid.y + 10}`,
    `C ${cx + a.deltoid.outerX + 1.4} ${deltoidDomeY + 4.5}, ${cx + rig.shoulderX * 0.96} ${deltoidDomeY - 1.5}, ${cx + rig.shoulderX * 0.66} ${trapSlopeY}`,
    `C ${cx + rig.neckHalf + 2.6} ${rig.neckBaseY + 3.5}, ${cx + neckWaistX} ${neckMidY}, ${cx + rig.neckHalf} ${neckTopY}`,
    'Z',
  ].join(' ');
}

/**
 * Silueta anatómica de Perfil Derecho con continuidad C¹ estricta en todos los ápices
 * (espalda torácica, arco lumbar, glúteo redondo, hueco poplíteo, gemelo alto y busto/pectoral).
 */
export function buildAnatomicalSideBodyPath(rig: MannequinRig): string {
  const { cx, side: s, silhouette } = rig;
  const isFemale = silhouette === 'female';

  const chestToWaist = rig.waistY - rig.chestY;
  const waistToGlute = s.gluteApexY - rig.waistY;
  const gluteToKnee = rig.kneeY - s.gluteApexY;
  const lowerLegLen = rig.ankleJointY - rig.kneeY;
  const calfPeakY = rig.kneeY + lowerLegLen * 0.3;

  const backChestApexX = s.chestBackX - 2.0;
  const gluteApexX = s.hipBackX - (isFemale ? 2.2 : 1.6);
  const calfApexX = s.calfBackX - 1.2;

  return [
    // Nuca -> espalda dorsal torácica (tangente vertical C¹ en backChestApexX, chestY)
    `M ${cx - (isFemale ? 6.8 : 8.0)} ${rig.chinY - 4}`,
    `C ${cx - (isFemale ? 7.4 : 8.8)} ${rig.neckBaseY + 2}, ${backChestApexX} ${rig.shoulderY + 2}, ${backChestApexX} ${rig.chestY}`,
    // Dorsal -> arco lumbar (tangente vertical C¹ en waistBackX, waistY)
    `C ${backChestApexX} ${rig.chestY + chestToWaist * 0.45}, ${s.waistBackX} ${rig.waistY - chestToWaist * 0.4}, ${s.waistBackX} ${rig.waistY}`,
    // Arco lumbar -> glúteo perfectamente redondo (tangente vertical C¹ en gluteApexX, gluteApexY!)
    `C ${s.waistBackX} ${rig.waistY + waistToGlute * 0.36}, ${gluteApexX} ${s.gluteApexY - waistToGlute * 0.56}, ${gluteApexX} ${s.gluteApexY}`,
    // Glúteo -> isquiotibial -> hueco poplíteo (sale vertical de gluteApexX, curva suave sin picos!)
    `C ${gluteApexX} ${s.gluteApexY + gluteToKnee * 0.24}, ${s.thighBackX} ${rig.crotchY + 22}, ${s.kneeBackX + 1.0} ${rig.kneeY}`,
    // Hueco poplíteo -> gemelo posterior redondo (tangente vertical C¹ en calfApexX, calfPeakY!)
    `C ${s.kneeBackX + 1.0} ${rig.kneeY + (calfPeakY - rig.kneeY) * 0.38}, ${calfApexX} ${calfPeakY - 12}, ${calfApexX} ${calfPeakY}`,
    // Gemelo -> tendón de Aquiles (sale vertical de calfApexX y se afina suavemente sin muescas!)
    `C ${calfApexX} ${calfPeakY + 22}, ${s.ankleBackX + 1.4} ${rig.ankleJointY - 16}, ${s.ankleBackX} ${rig.ankleJointY}`,
    // Talón -> arco plantar -> bola del pie -> dedo gordo -> empeine
    `C ${s.ankleBackX - 3.6} ${rig.footY - 4.5}, ${s.ankleBackX - 4.0} ${rig.footY + 0.5}, ${s.ankleBackX + 2.6} ${rig.footY + 0.8}`,
    `Q ${cx + 2.5} ${rig.footY - 1.0} ${s.ankleFrontX + 9.5} ${rig.footY + 0.8}`,
    `L ${s.ankleFrontX + (isFemale ? 17.6 : 19.6)} ${rig.footY + 0.8}`,
    `C ${s.ankleFrontX + (isFemale ? 20.0 : 22.2)} ${rig.footY + 0.3}, ${s.ankleFrontX + (isFemale ? 19.8 : 21.8)} ${rig.footY - 3.6}, ${s.ankleFrontX + (isFemale ? 15.4 : 17.4)} ${rig.footY - 4.6}`,
    `C ${s.ankleFrontX + 10.0} ${rig.footY - 6.8}, ${s.ankleFrontX + 4.4} ${rig.ankleJointY + 3}, ${s.ankleFrontX} ${rig.ankleJointY}`,
    // Tibia -> rótula -> cuádriceps adelantado -> abdomen -> bajo pecho/busto
    `C ${s.calfFrontX - 1.4} ${calfPeakY + 12}, ${s.kneeFrontX + 0.6} ${rig.kneeY + 8}, ${s.kneeFrontX + 1.2} ${rig.kneeY - 2}`,
    `C ${s.thighFrontX + 1.8} ${rig.crotchY + 18}, ${s.hipFrontX + 1.2} ${rig.hipY + 8}, ${s.hipFrontX} ${rig.hipY}`,
    `C ${s.waistFrontX + 1.0} ${rig.waistY + 12}, ${s.waistFrontX} ${rig.waistY - 8}, ${s.chestFrontX - (isFemale ? 1.0 : 0)} ${s.underBustY}`,
    // Busto femenino en gota o pectoral masculino firme (tangente suave)
    isFemale
      ? `C ${s.bustFrontX + 1.6} ${s.underBustY + 0.8}, ${s.bustFrontX + 2.0} ${s.bustApexY - 2}, ${s.chestFrontX - 1.6} ${rig.chestY - 14}`
      : `C ${s.bustFrontX + 1.8} ${s.underBustY - 2}, ${s.bustFrontX + 2.0} ${s.bustApexY - 4}, ${s.chestFrontX - 1.2} ${rig.chestY - 14}`,
    `C ${s.shoulderFrontX + 1.2} ${rig.shoulderY + 4}, ${s.shoulderFrontX - 0.6} ${rig.shoulderY - 1}, ${cx + (isFemale ? 5.2 : 6.4)} ${rig.neckBaseY + 2}`,
    `L ${cx + (isFemale ? 5.0 : 6.2)} ${rig.chinY - 4}`,
    'Z',
  ].join(' ');
}
