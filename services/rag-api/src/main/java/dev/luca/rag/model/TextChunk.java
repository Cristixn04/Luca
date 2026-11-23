package dev.luca.rag.model;

import java.util.Map;

public record TextChunk(
        int chunkIndex,
        int pageNumber,
        String section,
        String contentText,
        Map<String, Object> metadata
) {}
