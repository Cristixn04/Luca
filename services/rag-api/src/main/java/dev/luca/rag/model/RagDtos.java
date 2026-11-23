package dev.luca.rag.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public final class RagDtos {

    private RagDtos() {}

    public record SessionRequest(
            @NotBlank @Size(min = 8, max = 128) String tenantKey
    ) {}

    public record SessionResponse(
            String token,
            String tenantId,
            String expiresAt
    ) {}

    public record IndexItemPayload(
            @NotBlank @Size(max = 128) String externalId,
            @Size(max = 40) String sourceType,
            @NotBlank @Size(max = 255) String title,
            @NotBlank @Size(max = 24000) String content,
            String section,
            Map<String, Object> metadata
    ) {}

    public record BatchIndexRequest(
            @NotEmpty @Size(max = 200) List<@Valid IndexItemPayload> items
    ) {}

    public record BatchIndexResponse(
            String status,
            int acceptedCount,
            String embeddingModel
    ) {}

    public record RerankSearchRequest(
            @NotBlank @Size(max = 500) String query,
            List<String> candidateIds,
            Integer limit
    ) {}

    public record SimilarSearchRequest(
            @NotBlank @Size(max = 128) String externalId,
            List<String> candidateIds,
            Integer limit
    ) {}

    public record RankedItem(
            String externalId,
            String title,
            double score,
            double vectorScore,
            double textScore,
            int pageNumber,
            String section,
            String snippet
    ) {}

    public record RerankSearchResponse(
            String query,
            String embeddingModel,
            List<RankedItem> results
    ) {}

    public record HealthResponse(
            String status,
            String service,
            String embeddingModel,
            int embeddingDimensions,
            boolean databaseUp
    ) {}
}
