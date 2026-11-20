# Evaluación de visión por computadora (`M6 · T6.9`)

Registro de evaluación del pipeline `POST /v1/vision/analyze` (recorte de fondo en memoria + color dominante CIELAB `k-means`).

## Metodología automatizada (CI)

Suite: `services/api/tests/test_vision.py::test_benchmark_30_garment_photos_rnf02`

- **Lote de prueba:** 30 imágenes de prendas variadas (10 PNG, 10 WEBP, 10 JPEG) con diferentes colores cromáticos y relaciones de aspecto.
- **Proveedor verificado en CI:** `SimpleBorderBackgroundRemover` (Pillow/NumPy en memoria) + `extract_dominant_color` (CIELAB D65 + `KMeans`, `k <= 3`, submuestreo determinista ≤ 4.000 píxeles).
- **Proveedor de producción opcional:** `RembgBackgroundRemover` (`rembg` + ONNX Runtime, activable instalando `pip install -e ".[vision]"`).

## Resultados medidos

| Métrica | Objetivo (RNF-02) | Resultado medido | Estado |
| :-- | :-- | :-- | :-- |
| Latencia p95 (30 fotos) | ≤ 10.000 ms | ~85 ms (modo `simple-border` local) | Cumple |
| Tasa de respuesta válida | 30 / 30 (100 %) | 30 / 30 | Cumple |
| Validación de archivos falsos (SVG/HTML como JPEG) | Rechazo `415` | `415 Unsupported Media Type` | Cumple |
| Exceso de tamaño | Rechazo `413` | `413 Content Too Large` | Cumple |
| Fuga de archivos a disco | 0 archivos escritos | 0 (todo procesado en `io.BytesIO`) | Cumple |

## Limitaciones y fallos conocidos

- `SimpleBorderBackgroundRemover` funciona bien con fondos relativamente uniformes, pero se degrada con fondos muy texturizados o con sombras fuertes; en producción se recomienda instalar `.[vision]` (`rembg`) o usar la alternativa manual de recorte rectangular (`T6.8`), disponible incluso sin conexión.
- El color dominante detectado siempre es editable por el usuario mediante el selector de color y las muestras de paleta sugeridas.
