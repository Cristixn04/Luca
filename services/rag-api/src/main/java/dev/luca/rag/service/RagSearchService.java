package dev.luca.rag.service;

import dev.luca.rag.config.RagProperties;
import dev.luca.rag.embedding.EmbeddingProvider;
import dev.luca.rag.model.RagDtos.RankedItem;
import dev.luca.rag.model.RagDtos.RerankSearchResponse;
import dev.luca.rag.repository.RagRepository;
import dev.luca.rag.repository.RagRepository.CandidateHit;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RagSearchService {

    private final EmbeddingProvider embeddingProvider;
    private final RagRepository repository;
    private final HybridReranker reranker;
    private final int candidateMultiplier;

    public RagSearchService(
            EmbeddingProvider embeddingProvider,
            RagRepository repository,
            HybridReranker reranker,
            RagProperties properties
    ) {
        this.embeddingProvider = embeddingProvider;
        this.repository = repository;
        this.reranker = reranker;
        int configuredMult = properties.search() != null ? properties.search().candidateMultiplier() : 4;
        this.candidateMultiplier = Math.max(2, configuredMult);
    }

    public RerankSearchResponse searchAndRerank(
            String tenantId,
            String query,
            List<String> candidateIds,
            int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        int fetchLimit = Math.min(200, safeLimit * candidateMultiplier);
        String model = embeddingProvider.modelName();

        float[] queryVector = embeddingProvider.embed(query);
        List<CandidateHit> vectorHits = repository.searchVector(tenantId, queryVector, model, candidateIds, fetchLimit);
        List<CandidateHit> textHits = repository.searchFullText(tenantId, query, candidateIds, fetchLimit);

        List<RankedItem> ranked = reranker.fuseAndRerank(query, vectorHits, textHits, safeLimit);
        return new RerankSearchResponse(query, model, ranked);
    }

    public RerankSearchResponse findSimilar(
            String tenantId,
            String externalId,
            List<String> candidateIds,
            int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        String model = embeddingProvider.modelName();
        Optional<float[]> sourceVec = repository.findPrimaryEmbedding(tenantId, externalId, model);
        if (sourceVec.isEmpty()) {
            return new RerankSearchResponse(externalId, model, List.of());
        }

        List<CandidateHit> hits = repository.searchVector(
                tenantId,
                sourceVec.get(),
                model,
                candidateIds,
                safeLimit + 1
        );

        List<RankedItem> ranked = hits.stream()
                .filter(h -> !h.externalId().equals(externalId))
                .limit(safeLimit)
                .map(h -> new RankedItem(
                        h.externalId(),
                        h.title(),
                        Math.round(h.rawScore() * 10000.0) / 10000.0,
                        Math.round(h.rawScore() * 10000.0) / 10000.0,
                        0.0,
                        h.pageNumber(),
                        h.section(),
                        h.contentText().length() <= 180 ? h.contentText() : h.contentText().substring(0, 179) + "…"
                ))
                .toList();

        return new RerankSearchResponse(externalId, model, ranked);
    }
}
