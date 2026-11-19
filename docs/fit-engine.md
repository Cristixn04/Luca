# Motor de cuerpo y calce (`@luca/domain`)

Este documento describe las fórmulas matemáticas, los supuestos y las limitaciones del motor de calce y del modelo corporal `BodyModel` implementados en `packages/domain`.

---

## 1. Fórmulas de holgura y elasticidad

Las prendas se registran con **medidas en plano** (ancho de axila a axila, cintura plana, cadera plana), igual que las tablas de tallas de las marcas.

- **Zonas de perímetro (`chest`, `waist`, `hip`):**
  - `circ_prenda = ancho_plano × 2`
  - `holgura = circ_prenda − circ_cuerpo`
  - `alivio_elastico = circ_prenda × elasticidad`
- **Zonas lineales (`shoulders`, `back`):**
  - `holgura = ancho_prenda − ancho_cuerpo`
  - `alivio_elastico = ancho_prenda × elasticidad`

### Regla de clasificación

Sea `min_fisico` el umbral inferior de tensión (`0 cm` en pecho, cintura, cadera y espalda; `-1 cm` en hombros):

1. Si `holgura + alivio_elastico < min_fisico` → **Tenso (`tense`)**
2. Si `holgura < min_fisico` (pero el alivio elástico compensa) → **Ajustado (`tight`, `elasticCompensated = true`)**
3. En otro caso → se evalúa la holgura cruda contra las bandas semiabiertas `[a, b)` de `config/fit_bands.json`.

### Bandas por defecto (`config/fit_bands.json`)

| Zona | Ajustado | Regular | Holgado | Oversize |
| :-- | :-: | :-: | :-: | :-: |
| Pecho | `[0, 4)` | `[4, 12)` | `[12, 20)` | `≥ 20` |
| Cintura | `[0, 2)` | `[2, 6)` | `[6, 10)` | `≥ 10` |
| Cadera | `[0, 4)` | `[4, 10)` | `[10, 18)` | `≥ 18` |
| Hombros | `[−1, 1)` | `[1, 3)` | `[3, 6)` | `≥ 6` |
| Espalda | `[0, 2)` | `[2, 5)` | `[5, 9)` | `≥ 9` |

La categoría `jacket` suma `+4 cm` a las bandas de pecho (ajustado hasta `8 cm`, regular `[8, 16)`, holgado `[16, 24)`, oversize `≥ 24`).

---

## 2. `BodyModel` y elipses de Ramanujan

Cada sección transversal (pecho, cintura, cadera) se modela como una elipse de semiancho lateral `a` y semifondo `b`:

$$P(a, b) = \pi \cdot \left[3(a + b) - \sqrt{(3a + b)(a + 3b)}\right]$$

- **Sin fondo medido:** se fija `b = r · a` con relaciones por defecto `r_pecho = 0.65`, `r_cintura = 0.70`, `r_cadera = 0.70` y se resuelve `a` de forma cerrada. La sección queda marcada con `depthEstimated = true`.
- **Con fondo medido `d`:** se fija `b = d / 2` y se resuelve `a` mediante **bisección** (64 iteraciones), logrando un error relativo `< 10⁻⁶` (muy por debajo del límite RNF-05 de `0.5 %`).

### Coherencia entre vistas

`projectAllViews(model, fitReport)` proyecta un único `BodyModel` hacia **frente** (`2a`), **perfil** (`2b`) y **espalda** (`2a` + ancho de espalda). El estado de calce por zona se calcula una sola vez en `evaluateGarmentFit` y se propaga a las tres vistas para que nunca se contradigan.

---

## 3. Recomendador de talla

Para una lista de tallas disponibles y una preferencia (`tight`, `regular` o `loose`):

1. Calcula la distancia en centímetros de cada zona relevante al intervalo `[min, max)` de la banda objetivo.
2. Cualquier zona en estado `tense` recibe una penalización alta (`100 + 10 × distancia`) para evitar recomendar tallas que aprietan frente a opciones usables.
3. Ordena las tallas por menor penalización total, menor distancia en centímetros y desempate alfabético determinista.

---

## 4. Limitaciones conocidas

- Las mediciones con cinta métrica manual suelen tener un margen de error de 1 a 2 cm.
- Las bandas por defecto son valores iniciales calibrables por usuario en M12.
- El wireframe y el avatar son ayudas visuales; la fuente de verdad numérica son las cifras de holgura del motor.
