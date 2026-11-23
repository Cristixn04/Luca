package dev.luca.rag.embedding;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Adaptador para proveedor local de embeddings (Ollama /api/embeddings) en etapa posterior.
 * Ajusta el vector a la dimensión fija del esquema pgvector conservando la norma L2.
 */
public class OllamaEmbeddingProvider implements EmbeddingProvider {

    private static final Logger log = LoggerFactory.getLogger(OllamaEmbeddingProvider.class);

    private final RestClient restClient;
    private final String model;
    private final int dimensions;
    private final LocalDeterministicEmbeddingProvider fallback;

    public OllamaEmbeddingProvider(String baseUrl, String model, int dimensions) {
        this.model = model;
        this.dimensions = dimensions;
        this.fallback = new LocalDeterministicEmbeddingProvider(dimensions);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public float[] embed(String text) {
        try {
            OllamaResponse response = restClient.post()
                    .uri("/api/embeddings")
                    .body(Map.of("model", model, "prompt", text == null ? "" : text))
                    .retrieve()
                    .body(OllamaResponse.class);

            if (response == null || response.embedding() == null || response.embedding().isEmpty()) {
                throw new IllegalStateException("Respuesta vacía de Ollama Embeddings");
            }

            float[] vec = new float[dimensions];
            int limit = Math.min(response.embedding().size(), dimensions);
            for (int i = 0; i < limit; i++) {
                vec[i] = response.embedding().get(i).floatValue();
            }
            return LocalDeterministicEmbeddingProvider.l2Normalize(vec);
        } catch (Exception ex) {
            log.warn("Fallo al solicitar embedding a Ollama ({}); usando respaldo local determinista.", ex.getMessage());
            return fallback.embed(text);
        }
    }

    @Override
    public String modelName() {
        return "ollama:" + model;
    }

    @Override
    public int dimensions() {
        return dimensions;
    }

    private record OllamaResponse(List<Double> embedding) {}
}
