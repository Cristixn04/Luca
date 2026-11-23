package dev.luca.rag.embedding;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Adaptador de OpenAI Embeddings para el MVP (ej. text-embedding-3-small, 1536 dims).
 */
public class OpenAiEmbeddingProvider implements EmbeddingProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiEmbeddingProvider.class);

    private final RestClient restClient;
    private final String model;
    private final int dimensions;
    private final LocalDeterministicEmbeddingProvider fallback;

    public OpenAiEmbeddingProvider(String baseUrl, String apiKey, String model, int dimensions) {
        this.model = model;
        this.dimensions = dimensions;
        this.fallback = new LocalDeterministicEmbeddingProvider(dimensions);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public float[] embed(String text) {
        try {
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "input", text == null ? "" : text,
                    "dimensions", dimensions
            );

            OpenAiEmbeddingResponse response = restClient.post()
                    .uri("/embeddings")
                    .body(payload)
                    .retrieve()
                    .body(OpenAiEmbeddingResponse.class);

            if (response == null || response.data() == null || response.data().isEmpty()) {
                throw new IllegalStateException("Respuesta vacía de OpenAI Embeddings");
            }

            List<Double> values = response.data().getFirst().embedding();
            float[] vec = new float[dimensions];
            int limit = Math.min(values.size(), dimensions);
            for (int i = 0; i < limit; i++) {
                vec[i] = values.get(i).floatValue();
            }
            return LocalDeterministicEmbeddingProvider.l2Normalize(vec);
        } catch (Exception ex) {
            log.warn("Fallo al solicitar embedding a OpenAI ({}); usando respaldo local determinista.", ex.getMessage());
            return fallback.embed(text);
        }
    }

    @Override
    public String modelName() {
        return "openai:" + model;
    }

    @Override
    public int dimensions() {
        return dimensions;
    }

    private record OpenAiEmbeddingResponse(List<EmbeddingData> data) {
        private record EmbeddingData(List<Double> embedding) {}
    }
}
