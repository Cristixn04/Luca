package dev.luca.rag.controller;

import dev.luca.rag.model.RagDtos.BatchIndexRequest;
import dev.luca.rag.model.RagDtos.BatchIndexResponse;
import dev.luca.rag.service.RagIndexingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag/v1/index")
public class RagIndexController {

    private final RagIndexingService indexingService;

    public RagIndexController(RagIndexingService indexingService) {
        this.indexingService = indexingService;
    }

    @PostMapping("/items")
    public ResponseEntity<BatchIndexResponse> indexItems(
            Authentication authentication,
            @Valid @RequestBody BatchIndexRequest request,
            @RequestParam(name = "sync", defaultValue = "false") boolean sync
    ) {
        String tenantId = authentication.getName();
        if (sync) {
            int indexed = indexingService.indexBatchSync(tenantId, request.items());
            return ResponseEntity.ok(new BatchIndexResponse(
                    "indexed",
                    indexed,
                    indexingService.activeEmbeddingModel()
            ));
        }

        indexingService.indexBatchAsync(tenantId, request.items());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new BatchIndexResponse(
                "queued",
                request.items().size(),
                indexingService.activeEmbeddingModel()
        ));
    }

    @DeleteMapping("/items/{externalId}")
    public ResponseEntity<Void> deleteItem(
            Authentication authentication,
            @PathVariable("externalId") String externalId
    ) {
        String tenantId = authentication.getName();
        indexingService.deleteItem(tenantId, externalId);
        return ResponseEntity.noContent().build();
    }
}
