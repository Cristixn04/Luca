package dev.luca.rag.service;

import dev.luca.rag.config.RagProperties;
import dev.luca.rag.model.TextChunk;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Segmentador de texto por ventana de tokens con solapamiento moderado (por defecto 650 tokens,
 * solapamiento 80 tokens), preservando orden, página y sección para trazabilidad.
 */
@Component
public class TextChunker {

    private final int maxTokens;
    private final int overlapTokens;

    public TextChunker(RagProperties properties) {
        int configuredMax = properties.chunking() != null ? properties.chunking().maxTokens() : 650;
        int configuredOverlap = properties.chunking() != null ? properties.chunking().overlapTokens() : 80;
        this.maxTokens = Math.max(50, configuredMax);
        this.overlapTokens = Math.max(0, Math.min(configuredOverlap, this.maxTokens / 2));
    }

    public List<TextChunk> chunk(String text, String section, Map<String, Object> metadata) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        String safeSection = (section == null || section.isBlank()) ? "general" : section.trim();
        Map<String, Object> safeMeta = metadata == null ? Collections.emptyMap() : metadata;

        String[] words = text.trim().split("\\s+");
        if (words.length <= maxTokens) {
            return List.of(new TextChunk(0, 1, safeSection, text.trim(), safeMeta));
        }

        List<TextChunk> chunks = new ArrayList<>();
        int step = Math.max(1, maxTokens - overlapTokens);
        int chunkIdx = 0;

        for (int start = 0; start < words.length; start += step) {
            int end = Math.min(words.length, start + maxTokens);
            StringBuilder sb = new StringBuilder();
            for (int i = start; i < end; i++) {
                if (i > start) {
                    sb.append(' ');
                }
                sb.append(words[i]);
            }
            chunks.add(new TextChunk(chunkIdx, 1, safeSection, sb.toString(), safeMeta));
            chunkIdx++;
            if (end == words.length) {
                break;
            }
        }

        return chunks;
    }
}
