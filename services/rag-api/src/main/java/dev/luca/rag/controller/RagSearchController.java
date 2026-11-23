package dev.luca.rag.controller;

import dev.luca.rag.model.RagDtos.RerankSearchRequest;
import dev.luca.rag.model.RagDtos.RerankSearchResponse;
import dev.luca.rag.model.RagDtos.SimilarSearchRequest;
import dev.luca.rag.service.RagSearchService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag/v1/search")
public class RagSearchController {

    private final RagSearchService searchService;

    public RagSearchController(RagSearchService searchService) {
        this.searchService = searchService;
    }

    @PostMapping("/rerank")
    public ResponseEntity<RerankSearchResponse> rerank(
            Authentication authentication,
            @Valid @RequestBody RerankSearchRequest request
    ) {
        String tenantId = authentication.getName();
        int limit = request.limit() == null ? 30 : request.limit();
        RerankSearchResponse response = searchService.searchAndRerank(
                tenantId,
                request.query(),
                request.candidateIds(),
                limit
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/similar")
    public ResponseEntity<RerankSearchResponse> similar(
            Authentication authentication,
            @Valid @RequestBody SimilarSearchRequest request
    ) {
        String tenantId = authentication.getName();
        int limit = request.limit() == null ? 6 : request.limit();
        RerankSearchResponse response = searchService.findSimilar(
                tenantId,
                request.externalId(),
                request.candidateIds(),
                limit
        );
        return ResponseEntity.ok(response);
    }
}
