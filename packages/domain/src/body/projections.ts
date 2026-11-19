import type { FitReport, FitState, FitZone } from '../fit/types.js';
import type {
  AllViewProjections,
  BodyModel,
  ProjectedPoint,
  ProjectedZoneBand,
  ViewProjection,
} from './types.js';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function buildStateMap(fitReport?: FitReport): ReadonlyMap<FitZone, FitState> {
  const map = new Map<FitZone, FitState>();
  if (!fitReport) {
    return map;
  }
  for (const zone of fitReport.evaluatedZones) {
    map.set(zone.zone, zone.state);
  }
  return map;
}

function symmetricContours(
  rows: ReadonlyArray<{ y: number; span: number }>,
): { leftContour: ProjectedPoint[]; rightContour: ProjectedPoint[] } {
  const leftContour: ProjectedPoint[] = [];
  const rightContour: ProjectedPoint[] = [];

  for (const row of rows) {
    const half = round2(row.span / 2);
    const y = round2(row.y);
    leftContour.push({ x: -half, y });
    rightContour.push({ x: half, y });
  }

  return { leftContour, rightContour };
}

export function projectFront(model: BodyModel, fitReport?: FitReport): ViewProjection {
  const states = buildStateMap(fitReport);
  const { landmarks, sections } = model;

  const chestWidth = round2(sections.chest.widthCm);
  const waistWidth = round2(sections.waist.widthCm);
  const hipWidth = round2(sections.hip.widthCm);
  const shouldersWidth = round2(model.shouldersWidthCm);

  const zones: ProjectedZoneBand[] = [
    {
      zone: 'shoulders',
      yCm: round2(landmarks.shoulderY),
      spanCm: shouldersWidth,
      estimated: false,
      ...(states.has('shoulders') ? { fitState: states.get('shoulders') } : {}),
    },
    {
      zone: 'chest',
      yCm: round2(landmarks.chestY),
      spanCm: chestWidth,
      estimated: false,
      ...(states.has('chest') ? { fitState: states.get('chest') } : {}),
    },
    {
      zone: 'waist',
      yCm: round2(landmarks.waistY),
      spanCm: waistWidth,
      estimated: landmarks.torsoEstimated,
      ...(states.has('waist') ? { fitState: states.get('waist') } : {}),
    },
    {
      zone: 'hip',
      yCm: round2(landmarks.hipY),
      spanCm: hipWidth,
      estimated: false,
      ...(states.has('hip') ? { fitState: states.get('hip') } : {}),
    },
  ];

  const { leftContour, rightContour } = symmetricContours([
    { y: landmarks.shoulderY, span: shouldersWidth },
    { y: landmarks.chestY, span: chestWidth },
    { y: landmarks.waistY, span: waistWidth },
    { y: landmarks.hipY, span: hipWidth },
    { y: landmarks.crotchY, span: hipWidth * 0.88 },
  ]);

  const estimatedZones = zones.filter((z) => z.estimated).map((z) => z.zone);
  const maxSpanCm = Math.max(shouldersWidth, chestWidth, waistWidth, hipWidth);

  return {
    view: 'front',
    heightCm: model.heightCm,
    maxSpanCm,
    leftContour,
    rightContour,
    zones,
    estimatedZones,
  };
}

export function projectSide(model: BodyModel, fitReport?: FitReport): ViewProjection {
  const states = buildStateMap(fitReport);
  const { landmarks, sections } = model;

  const chestDepth = round2(sections.chest.depthCm);
  const waistDepth = round2(sections.waist.depthCm);
  const hipDepth = round2(sections.hip.depthCm);
  const shoulderDepth = round2(chestDepth * 0.58);

  const zones: ProjectedZoneBand[] = [
    {
      zone: 'chest',
      yCm: round2(landmarks.chestY),
      spanCm: chestDepth,
      estimated: sections.chest.depthEstimated,
      ...(states.has('chest') ? { fitState: states.get('chest') } : {}),
    },
    {
      zone: 'waist',
      yCm: round2(landmarks.waistY),
      spanCm: waistDepth,
      estimated: sections.waist.depthEstimated || landmarks.torsoEstimated,
      ...(states.has('waist') ? { fitState: states.get('waist') } : {}),
    },
    {
      zone: 'hip',
      yCm: round2(landmarks.hipY),
      spanCm: hipDepth,
      estimated: sections.hip.depthEstimated,
      ...(states.has('hip') ? { fitState: states.get('hip') } : {}),
    },
  ];

  // Perfil con ligera asimetría anatómica (pecho ligeramente adelante, cadera atrás).
  const leftContour: ProjectedPoint[] = [
    { x: round2(-shoulderDepth * 0.5), y: round2(landmarks.shoulderY) },
    { x: round2(-chestDepth * 0.44), y: round2(landmarks.chestY) },
    { x: round2(-waistDepth * 0.48), y: round2(landmarks.waistY) },
    { x: round2(-hipDepth * 0.56), y: round2(landmarks.hipY) },
    { x: round2(-hipDepth * 0.46), y: round2(landmarks.crotchY) },
  ];
  const rightContour: ProjectedPoint[] = [
    { x: round2(shoulderDepth * 0.5), y: round2(landmarks.shoulderY) },
    { x: round2(chestDepth * 0.56), y: round2(landmarks.chestY) },
    { x: round2(waistDepth * 0.52), y: round2(landmarks.waistY) },
    { x: round2(hipDepth * 0.44), y: round2(landmarks.hipY) },
    { x: round2(hipDepth * 0.42), y: round2(landmarks.crotchY) },
  ];

  const estimatedZones = zones.filter((z) => z.estimated).map((z) => z.zone);
  const maxSpanCm = Math.max(chestDepth, waistDepth, hipDepth);

  return {
    view: 'side',
    heightCm: model.heightCm,
    maxSpanCm,
    leftContour,
    rightContour,
    zones,
    estimatedZones,
  };
}

export function projectBack(model: BodyModel, fitReport?: FitReport): ViewProjection {
  const states = buildStateMap(fitReport);
  const { landmarks, sections } = model;

  const shouldersWidth = round2(model.shouldersWidthCm);
  const backWidth = round2(model.backWidthCm);
  const chestWidth = round2(sections.chest.widthCm);
  const waistWidth = round2(sections.waist.widthCm);
  const hipWidth = round2(sections.hip.widthCm);

  const zones: ProjectedZoneBand[] = [
    {
      zone: 'shoulders',
      yCm: round2(landmarks.shoulderY),
      spanCm: shouldersWidth,
      estimated: false,
      ...(states.has('shoulders') ? { fitState: states.get('shoulders') } : {}),
    },
    {
      zone: 'back',
      yCm: round2(landmarks.chestY),
      spanCm: backWidth,
      estimated: model.backWidthEstimated,
      ...(states.has('back') ? { fitState: states.get('back') } : {}),
    },
    {
      zone: 'waist',
      yCm: round2(landmarks.waistY),
      spanCm: waistWidth,
      estimated: landmarks.torsoEstimated || model.backLengthEstimated,
      ...(states.has('waist') ? { fitState: states.get('waist') } : {}),
    },
    {
      zone: 'hip',
      yCm: round2(landmarks.hipY),
      spanCm: hipWidth,
      estimated: false,
      ...(states.has('hip') ? { fitState: states.get('hip') } : {}),
    },
  ];

  const { leftContour, rightContour } = symmetricContours([
    { y: landmarks.shoulderY, span: shouldersWidth },
    { y: landmarks.chestY, span: Math.max(backWidth, chestWidth) },
    { y: landmarks.waistY, span: waistWidth },
    { y: landmarks.hipY, span: hipWidth },
    { y: landmarks.crotchY, span: hipWidth * 0.88 },
  ]);

  const estimatedZones = zones.filter((z) => z.estimated).map((z) => z.zone);
  const maxSpanCm = Math.max(shouldersWidth, backWidth, chestWidth, waistWidth, hipWidth);

  return {
    view: 'back',
    heightCm: model.heightCm,
    maxSpanCm,
    leftContour,
    rightContour,
    zones,
    estimatedZones,
  };
}

export function projectAllViews(model: BodyModel, fitReport?: FitReport): AllViewProjections {
  return {
    front: projectFront(model, fitReport),
    side: projectSide(model, fitReport),
    back: projectBack(model, fitReport),
  };
}
