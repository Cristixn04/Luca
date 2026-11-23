package dev.luca.rag.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luca.rag")
public record RagProperties(
        String allowedOrigins,
        Jwt jwt,
        Embedding embedding,
        Chunking chunking,
        Search search
) {
    public record Jwt(
            String secret,
            long expirationSeconds
    ) {}

    public record Embedding(
            String provider,
            int dimensions,
            OpenAi openai,
            Ollama ollama
    ) {
        public record OpenAi(
                String apiKey,
                String baseUrl,
                String model
        ) {}

        public record Ollama(
                String baseUrl,
                String model
        ) {}
    }

    public record Chunking(
            int maxTokens,
            int overlapTokens
    ) {}

    public record Search(
            int rrfK,
            double vectorWeight,
            double textWeight,
            int candidateMultiplier
    ) {}
}
