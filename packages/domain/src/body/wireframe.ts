import type { FitReport, FitState } from '../fit/types.js';
import { projectAllViews } from './projections.js';
import type { BodyModel, ProjectedPoint, ViewProjection } from './types.js';

const STATE_COLOR: Readonly<Record<FitState, string>> = {
  tense: '#C2410C',
  tight: '#E0A526',
  regular: '#2A9D8F',
  loose: '#5B8DEF',
  oversize: '#7C6FD6',
};

const VIEW_LABELS: Readonly<Record<ViewProjection['view'], string>> = {
  front: 'Frente',
  side: 'Perfil',
  back: 'Espalda',
};

function buildClosedPolygonPoints(
  left: readonly ProjectedPoint[],
  right: readonly ProjectedPoint[],
  centerX: number,
  offsetY: number,
  scale: number,
): string {
  const ordered = [...left, ...[...right].reverse()];
  return ordered
    .map((pt) => `${(centerX + pt.x * scale).toFixed(2)},${(offsetY + pt.y * scale).toFixed(2)}`)
    .join(' ');
}

function renderViewGroup(
  projection: ViewProjection,
  centerX: number,
  offsetY: number,
  scale: number,
): string {
  const polygon = buildClosedPolygonPoints(
    projection.leftContour,
    projection.rightContour,
    centerX,
    offsetY,
    scale,
  );

  const zoneLines = projection.zones
    .map((zone) => {
      const y = (offsetY + zone.yCm * scale).toFixed(2);
      const half = (zone.spanCm / 2) * scale;
      const x1 = (centerX - half).toFixed(2);
      const x2 = (centerX + half).toFixed(2);
      const stroke = zone.fitState ? STATE_COLOR[zone.fitState] : '#1F5F6B';
      const dash = zone.estimated ? ' stroke-dasharray="4 3"' : '';
      const stateAttr = zone.fitState ? ` data-fit-state="${zone.fitState}"` : '';

      return `<line data-zone="${zone.zone}"${stateAttr} data-estimated="${zone.estimated}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${stroke}" stroke-width="2.5"${dash} />`;
    })
    .join('\n    ');

  const labelY = (offsetY - 12).toFixed(2);
  const floorY = (offsetY + projection.heightCm * scale).toFixed(2);

  return `  <g data-view="${projection.view}">
    <text x="${centerX.toFixed(2)}" y="${labelY}" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#1B1F23">${VIEW_LABELS[projection.view]}</text>
    <line x1="${centerX.toFixed(2)}" y1="${offsetY.toFixed(2)}" x2="${centerX.toFixed(2)}" y2="${floorY}" stroke="#E4E0DA" stroke-width="1" stroke-dasharray="3 3" />
    <polygon points="${polygon}" fill="rgba(31, 95, 107, 0.08)" stroke="#1B1F23" stroke-width="1.5" />
    ${zoneLines}
  </g>`;
}

/**
 * Genera un wireframe SVG determinista de las tres vistas (frente, perfil y espalda)
 * para validación geométrica temprana (T1.5) y pruebas de determinismo por hash (RNF-04).
 */
export function renderThreeViewWireframeSvg(
  model: BodyModel,
  fitReport?: FitReport,
  scale = 2,
): string {
  const views = projectAllViews(model, fitReport);
  const panelWidth = 180;
  const totalWidth = panelWidth * 3;
  const offsetY = 32;
  const totalHeight = Math.ceil(model.heightCm * scale + offsetY + 24);

  const frontGroup = renderViewGroup(views.front, panelWidth * 0.5, offsetY, scale);
  const sideGroup = renderViewGroup(views.side, panelWidth * 1.5, offsetY, scale);
  const backGroup = renderViewGroup(views.back, panelWidth * 2.5, offsetY, scale);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" role="img" aria-label="Wireframe corporal en tres vistas">`,
    `  <rect width="${totalWidth}" height="${totalHeight}" fill="#FAF9F7" />`,
    frontGroup,
    sideGroup,
    backGroup,
    `</svg>`,
  ].join('\n');
}
