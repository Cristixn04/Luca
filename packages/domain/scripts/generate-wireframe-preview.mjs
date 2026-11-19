import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createBodyModel,
  evaluateGarmentFit,
  renderThreeViewWireframeSvg,
} from '../dist/index.js';

const sampleBody = createBodyModel({
  required: {
    height: 175,
    shoulders: 44,
    chest: 92,
    waist: 78,
    hip: 98,
    inseam: 80,
  },
});

const sampleFit = evaluateGarmentFit(sampleBody, {
  category: 'dress',
  sizeLabel: 'M',
  elasticity: 0.05,
  flatMeasuresCm: {
    chestFlat: 52, // +12 cm -> loose
    waistFlat: 41, // +4 cm -> regular
    hipFlat: 48, // -2 cm + 5 % elasticidad -> tight (compensado)
  },
});

const svg = renderThreeViewWireframeSvg(sampleBody, sampleFit, 2);

const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Luca · Visor wireframe 3 vistas (T1.5)</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; background: #FAF9F7; color: #1B1F23; margin: 2rem; }
      main { max-width: 720px; margin: 0 auto; }
      .frame { background: #FFFFFF; border: 1px solid #E4E0DA; border-radius: 12px; padding: 1.5rem; }
      p { color: #5B6670; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Luca · Validación visual wireframe (T1.5)</h1>
      <p>Generado de forma determinista desde <code>@luca/domain</code>. Las líneas discontinuas indican zonas estimadas.</p>
      <div class="frame">
        ${svg}
      </div>
    </main>
  </body>
</html>
`;

const outPath = resolve(import.meta.dirname, '../../../docs/wireframe-debug.html');
writeFileSync(outPath, html, 'utf-8');
console.log(`Wireframe generado en ${outPath}`);
