package dev.luca.rag.service;

import dev.luca.rag.embedding.EmbeddingProvider;
import dev.luca.rag.model.RagDtos.IndexItemPayload;
import dev.luca.rag.model.TextChunk;
import dev.luca.rag.repository.RagRepository;
import dev.luca.rag.repository.RagRepository.EmbeddedChunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

@Service
public class RagIndexingService {

    private static final Logger log = LoggerFactory.getLogger(RagIndexingService.class);

    private final TextChunker chunker;
    private final EmbeddingProvider embeddingProvider;
    private final RagRepository repository;

    public RagIndexingService(
            TextChunker chunker,
            EmbeddingProvider embeddingProvider,
            RagRepository repository
    ) {
        this.chunker = chunker;
        this.embeddingProvider = embeddingProvider;
        this.repository = repository;
    }

    @Async("ragIndexingExecutor")
    public void indexBatchAsync(String tenantId, List<IndexItemPayload> items) {
        try {
            indexBatchSync(tenantId, items);
        } catch (Exception ex) {
            log.error("Error en indexación asíncrona para tenant {}: {}", tenantId, ex.getMessage());
        }
    }

    public int indexBatchSync(String tenantId, List<IndexItemPayload> items) {
        int indexed = 0;
        String modelName = embeddingProvider.modelName();

        for (IndexItemPayload item : items) {
            String fullText = buildIndexableText(item);
            List<TextChunk> chunks = chunker.chunk(fullText, item.section(), item.metadata());
            if (chunks.isEmpty()) {
                continue;
            }

            List<EmbeddedChunk> embeddedChunks = chunks.stream()
                    .map(c -> new EmbeddedChunk(c, embeddingProvider.embed(c.contentText())))
                    .toList();

            repository.upsertDocumentWithChunks(
                    tenantId,
                    item.externalId().trim(),
                    item.sourceType(),
                    item.title().trim(),
                    fullText,
                    sha256Hex(fullText),
                    item.metadata(),
                    modelName,
                    embeddedChunks
            );
            indexed++;
        }

        return indexed;
    }

    public boolean deleteItem(String tenantId, String externalId) {
        return repository.deleteByExternalId(tenantId, externalId);
    }

    public String activeEmbeddingModel() {
        return embeddingProvider.modelName();
    }

    private static String buildIndexableText(IndexItemPayload item) {
        String title = item.title() == null ? "" : item.title().trim();
        String content = item.content() == null ? "" : item.content().trim();
        if (content.toLowerCase().contains(title.toLowerCase())) {
            return content;
        }
        return title + ". " + content;
    }

    private static String sha256Hex(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible", ex);
        }
    }
}
