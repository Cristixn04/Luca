package dev.luca.rag.controller;

import dev.luca.rag.embedding.EmbeddingProvider;
import dev.luca.rag.model.RagDtos.HealthResponse;
import dev.luca.rag.repository.RagRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag/v1")
public class HealthController {

    private final EmbeddingProvider embeddingProvider;
    private final RagRepository repository;

    public HealthController(EmbeddingProvider embeddingProvider, RagRepository repository) {
        this.embeddingProvider = embeddingProvider;
        this.repository = repository;
    }

    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        boolean dbUp = repository.isHealthy();
        return ResponseEntity.ok(new HealthResponse(
                dbUp ? "ok" : "degraded",
                "luca-rag-api",
                embeddingProvider.modelName(),
                embeddingProvider.dimensions(),
                dbUp
        ));
    }
}
