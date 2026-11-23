package dev.luca.rag.repository;

import dev.luca.rag.model.TextChunk;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface RagRepository {

    void upsertDocumentWithChunks(
            String tenantId,
            String externalId,
            String sourceType,
            String title,
            String contentText,
            String contentHash,
            Map<String, Object> metadata,
            String embeddingModel,
            List<EmbeddedChunk> chunks
    );

    boolean deleteByExternalId(String tenantId, String externalId);

    List<CandidateHit> searchVector(
            String tenantId,
            float[] queryVector,
            String embeddingModel,
            List<String> candidateIds,
            int limit
    );

    List<CandidateHit> searchFullText(
            String tenantId,
            String query,
            List<String> candidateIds,
            int limit
    );

    Optional<float[]> findPrimaryEmbedding(
            String tenantId,
            String externalId,
            String embeddingModel
    );

    boolean isHealthy();

    record EmbeddedChunk(TextChunk chunk, float[] embedding) {}

    record CandidateHit(
            String externalId,
            String title,
            int pageNumber,
            String section,
            String contentText,
            double rawScore
    ) {}
}
