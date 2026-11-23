package dev.luca.rag.embedding;

import dev.luca.rag.config.RagProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Locale;

@Configuration
public class EmbeddingProviderConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingProviderConfig.class);

    @Bean
    public EmbeddingProvider embeddingProvider(RagProperties properties) {
        RagProperties.Embedding cfg = properties.embedding();
        String provider = cfg.provider() == null ? "auto" : cfg.provider().trim().toLowerCase(Locale.ROOT);
        int dims = cfg.dimensions() > 0 ? cfg.dimensions() : 1536;

        boolean hasOpenAiKey = cfg.openai() != null
                && cfg.openai().apiKey() != null
                && !cfg.openai().apiKey().isBlank();

        if ("openai".equals(provider) || ("auto".equals(provider) && hasOpenAiKey)) {
            if (!hasOpenAiKey) {
                log.warn("LUCA_RAG_EMBEDDING_PROVIDER=openai sin LUCA_OPENAI_API_KEY; activando proveedor local.");
                return new LocalDeterministicEmbeddingProvider(dims);
            }
            log.info("Proveedor de embeddings activo: OpenAI ({}, {} dims)", cfg.openai().model(), dims);
            return new OpenAiEmbeddingProvider(
                    cfg.openai().baseUrl(),
                    cfg.openai().apiKey(),
                    cfg.openai().model(),
                    dims
            );
        }

        if ("ollama".equals(provider)) {
            log.info("Proveedor de embeddings activo: Ollama ({}, {} dims)", cfg.ollama().model(), dims);
            return new OllamaEmbeddingProvider(
                    cfg.ollama().baseUrl(),
                    cfg.ollama().model(),
                    dims
            );
        }

        log.info("Proveedor de embeddings activo: Local determinista ({} dims)", dims);
        return new LocalDeterministicEmbeddingProvider(dims);
    }
}
