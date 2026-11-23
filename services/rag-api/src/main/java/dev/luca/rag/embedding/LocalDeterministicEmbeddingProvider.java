package dev.luca.rag.embedding;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Proveedor local determinista sin dependencias externas (hashing de tokens + trigramas +
 * expansión ligera de sinónimos de vestuario en español, normalizado L2).
 * Permite operar búsqueda vectorial en pgvector localmente cuando no hay clave de OpenAI u Ollama.
 */
public class LocalDeterministicEmbeddingProvider implements EmbeddingProvider {

    private static final Set<String> STOP_WORDS = Set.of(
            "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas",
            "para", "por", "con", "en", "y", "o", "al", "mi", "tu", "su", "que"
    );

    private static final Map<String, List<String>> FASHION_SYNONYMS = Map.ofEntries(
            Map.entry("elegante", List.of("formal", "oficina", "etiqueta", "clasico", "traje")),
            Map.entry("formal", List.of("elegante", "oficina", "etiqueta", "clasico")),
            Map.entry("oficina", List.of("formal", "smart", "clasico", "elegante")),
            Map.entry("lluvia", List.of("chaqueta", "invierno", "otono", "impermeable", "abrigo")),
            Map.entry("frio", List.of("chaqueta", "invierno", "otono", "manga", "larga", "buzo")),
            Map.entry("calor", List.of("verano", "short", "camiseta", "lino", "primavera")),
            Map.entry("verano", List.of("calor", "short", "camiseta", "lino", "fresco")),
            Map.entry("deporte", List.of("deportivo", "sporty", "comodo", "gym")),
            Map.entry("urbano", List.of("streetwear", "casual", "moderno")),
            Map.entry("fiesta", List.of("etiqueta", "elegante", "noche", "formal")),
            Map.entry("trabajo", List.of("oficina", "formal", "smart", "clasico")),
            Map.entry("diario", List.of("casual", "minimalista", "basico")),
            Map.entry("basico", List.of("minimalista", "casual", "liso", "neutro"))
    );

    private final int dimensions;

    public LocalDeterministicEmbeddingProvider(int dimensions) {
        this.dimensions = dimensions;
    }

    @Override
    public float[] embed(String text) {
        float[] vector = new float[dimensions];
        if (text == null || text.isBlank()) {
            return vector;
        }

        String normalized = normalize(text);
        if (normalized.isEmpty()) {
            return vector;
        }

        String[] tokens = normalized.split("\\s+");
        for (String token : tokens) {
            if (token.isEmpty() || STOP_WORDS.contains(token)) {
                continue;
            }
            addFeature(vector, "tok:" + token, 2.0f);

            // Raíz aproximada y trigramas para tolerancia morfológica (plurales/género)
            if (token.length() >= 4) {
                addFeature(vector, "pfx:" + token.substring(0, 4), 1.1f);
                for (int i = 0; i <= token.length() - 3; i++) {
                    addFeature(vector, "ng3:" + token.substring(i, i + 3), 0.55f);
                }
            }

            List<String> related = FASHION_SYNONYMS.get(token);
            if (related != null) {
                for (String syn : related) {
                    addFeature(vector, "tok:" + syn, 1.05f);
                }
            }
        }

        return l2Normalize(vector);
    }

    @Override
    public String modelName() {
        return "local-deterministic-v1";
    }

    @Override
    public int dimensions() {
        return dimensions;
    }

    private void addFeature(float[] vector, String feature, float weight) {
        int h1 = fnv1a(feature, 0x811c9dc5);
        int h2 = fnv1a(feature, 0x9e3779b9);
        int idx1 = Math.floorMod(h1, dimensions);
        int idx2 = Math.floorMod(h2, dimensions);
        float sign1 = (h1 & 1) == 0 ? 1.0f : -1.0f;
        float sign2 = (h2 & 1) == 0 ? 1.0f : -1.0f;
        vector[idx1] += sign1 * weight;
        vector[idx2] += sign2 * (weight * 0.5f);
    }

    private static int fnv1a(String value, int seed) {
        int hash = seed;
        for (int i = 0; i < value.length(); i++) {
            hash ^= value.charAt(i);
            hash *= 0x01000193;
        }
        return hash;
    }

    public static float[] l2Normalize(float[] vector) {
        double sumSq = 0.0;
        for (float v : vector) {
            sumSq += (double) v * v;
        }
        if (sumSq <= 1e-12) {
            return vector;
        }
        float norm = (float) Math.sqrt(sumSq);
        for (int i = 0; i < vector.length; i++) {
            vector[i] /= norm;
        }
        return vector;
    }

    public static String normalize(String input) {
        String decomposed = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return decomposed;
    }
}
