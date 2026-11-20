# Motor de Colorimetría Estacional (M8 · v0.7)

> La colorimetría estacional es un marco de estilo orientativo, **no una ciencia exacta**. Luca la calcula 100 % en el dispositivo, presenta siempre las 2 estaciones más probables con su nivel de confianza, explica el porqué y permite sobrescribir o ignorar el perfil en cualquier momento.

## 1. Espacio de color y distancia perceptual (T8.1)

Implementado como dominio puro en `packages/domain/src/color/cielab.ts`:

- **Conversión sRGB ↔ CIELAB (D65, observador 2°)** siguiendo IEC 61966-2-1:
  - Linealización por canal ($\gamma = 2{,}4$ con tramo lineal en $c \le 0{,}04045$).
  - Matriz sRGB → XYZ D65 con punto blanco $(X_n, Y_n, Z_n) = (0{,}95047,\, 1{,}00000,\, 1{,}08883)$.
  - Transformación CIE 1976 $(L^*, a^*, b^*)$.
- **Distancia perceptual CIEDE2000 ($\Delta E_{00}$)** siguiendo exactamente **Sharma, Wu y Dalal (2005)** (*Color Research & Application*, 30(1):21–30), con $k_L = k_C = k_H = 1$ y término de rotación $R_T$.
- **Verificación automática:** `packages/domain/tests/color.test.ts` valida 10 pares de referencia de la Tabla 1 de Sharma et al. (2005) con tolerancia `< 0.0005`.

## 2. Las 12 estaciones y fuentes de las paletas (T8.3)

Las 12 paletas (14 colores curados cada una, agrupados en `neutral`, `core` y `accent`) viven en `config/color_palettes.json` y `packages/domain/src/color/palettes.ts`:

- **Primavera:** Primavera Brillante (`bright_spring`), Primavera Cálida (`warm_spring`), Primavera Clara (`light_spring`).
- **Verano:** Verano Claro (`light_summer`), Verano Frío (`cool_summer`), Verano Suave (`soft_summer`).
- **Otoño:** Otoño Suave (`soft_autumn`), Otoño Cálido (`warm_autumn`), Otoño Profundo (`deep_autumn`).
- **Invierno:** Invierno Profundo (`deep_winter`), Invierno Frío (`cool_winter`), Invierno Brillante (`bright_winter`).

**Fuentes de referencia:**
1. Sistema 12-Tone **Sci\ART** (Kathryn Kalisz), fundamentado en las tres dimensiones perceptuales del **Munsell Color Order System** (temperatura/subtono, valor/luminosidad y croma/saturación).
2. Calibración perceptual sRGB / CIELAB D65 para compatibilidad directa con $\Delta E_{00}$.

## 3. Árbol de decisión y nivel de confianza (T8.4, T8.5)

Implementado en `packages/domain/src/color/classifier.ts` a partir de las 3 muestras guiadas (piel, cabello y ojos):

1. **Subtono (`undertoneScore ∈ [-1, +1]`):** combina `b* - 1.35·a*` de la piel (peso `0.60`), cabello (`0.25`) y ojos (`0.15`). Umbrales: `≥ +0.16` cálido, `≤ -0.16` frío, intermedio neutro.
2. **Valor (`valueScoreL ∈ [0, 100]`):** `0.45·L*_piel + 0.40·L*_cabello + 0.15·L*_ojos`. Umbrales: `≥ 66` claro, `≤ 43` profundo, intermedio medio.
3. **Contraste personal:** $\Delta L^* = |L^*_{\text{piel}} - L^*_{\text{cabello}}|$.
4. **Croma efectivo (`chromaScoreC`):** promedio ponderado de $C^*_{ab} = \sqrt{a^{*2} + b^{*2}}$ más un aporte de claridad por contraste alto (`max(0, ΔL* - 38) × 0.42`) para representar correctamente perfiles de alto contraste con cabello acromático (p. ej. piel porcelana + cabello negro azabache → Invierno Brillante/Frío).
5. **Clasificación y confianza:** cada una de las 12 estaciones tiene un prototipo ponderado según su rasgo dominante + penalización de coherencia de rama (temperatura y valor extremo). Se devuelven las **Top 2 estaciones** y un nivel de confianza en `[0.42, 0.95]` proporcional al margen entre la #1 y la #2.

## 4. Puntaje de armonía de prenda (T8.6)

Implementado en `packages/domain/src/color/harmony.ts`:

$$A = \exp\!\left(-\frac{\Delta E_{00,\min}}{15}\right)$$

donde $\Delta E_{00,\min}$ es la distancia CIEDE2000 mínima entre el color dominante de la prenda y los 14 colores de la estación activa.

| Banda | Rango de $A$ | Interpretación en la interfaz |
| :--- | :---: | :--- |
| `excellent` | `≥ 0.72` | Armonía muy alta con tu paleta |
| `good` | `[0.52, 0.72)` | Buena afinidad con tu estación |
| `neutral` | `[0.34, 0.52)` | Afinidad neutra (útil como apoyo o lejos del rostro) |
| `clashing` | `< 0.34` | Contrasta con tu paleta estacional |

## 5. Validación con 10 perfiles representativos y ajuste de umbrales (T8.8)

Durante la validación sobre 10 perfiles diversos (ejecutados de forma continua en `packages/domain/tests/color.test.ts`), se detectaron y calibraron dos casos borde importantes:

1. **Alto contraste con cabello negro acromático (P7 — porcelana fría `#F2D6CE` + cabello negro `#1B1C20` + ojos azul hielo `#6D9DC5`):** inicialmente el croma crudo $C^*$ del cabello negro (`≈ 2`) arrastraba el perfil hacia *Verano Suave*. Se calibró el aporte de claridad por contraste alto (`contrastClarityBoost`) para clasificarlo correctamente en la familia *Invierno*.
2. **Perfiles profundos con contraste piel-cabello moderado (P8 — piel profunda cacao `#6D4539` + cabello negro `#1B1C20`):** se calibró el peso dominante del valor profundo (`wValue = 0.48`) y la penalización de coherencia de rama para evitar que perfiles con $L^* \le 43$ caigan en estaciones claras o suaves, clasificándolo en *Invierno Profundo*.

| Perfil | Piel | Cabello | Ojos | Familia esperada | Verificado en CI |
| :--- | :---: | :---: | :---: | :--- | :---: |
| P1 · Claro dorado | `#F0D5BA` | `#CFA668` | `#8A733E` | Primavera | Sí |
| P2 · Cobrizo cálido | `#E8C39E` | `#9E4B27` | `#A66E2E` | Primavera / Otoño | Sí |
| P3 · Porcelana y platino | `#F2D6CE` | `#CFC9BF` | `#6D9DC5` | Verano | Sí |
| P4 · Medio rosado ceniza | `#CFA08E` | `#7D7168` | `#748594` | Verano | Sí |
| P5 · Oliva suave y miel | `#D7BA98` | `#8C5B35` | `#8A733E` | Otoño / Primavera | Sí |
| P6 · Profunda ámbar cálida | `#885636` | `#3B281E` | `#3D291E` | Otoño | Sí |
| P7 · Porcelana y azabache | `#F2D6CE` | `#1B1C20` | `#6D9DC5` | Invierno | Sí |
| P8 · Profunda cacao fría | `#6D4539` | `#1B1C20` | `#231D1D` | Invierno | Sí |
| P9 · Media rosada y plata | `#CFA08E` | `#A9B0B8` | `#6D9DC5` | Verano / Invierno | Sí |
| P10 · Ébano neutra y negro | `#4B3129` | `#1B1C20` | `#231D1D` | Invierno / Otoño | Sí |
