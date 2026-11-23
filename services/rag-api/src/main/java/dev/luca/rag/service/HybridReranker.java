package dev.luca.rag.service;

import dev.luca.rag.config.RagProperties;
import dev.luca.rag.embedding.LocalDeterministicEmbeddingProvider;
import dev.luca.rag.model.RagDtos.RankedItem;
import dev.luca.rag.repository.RagRepository.CandidateHit;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reordenador híbrido mediante Reciprocal Rank Fusion (RRF) combinando similitud vectorial
 * (pgvector) + relevancia léxica (tsvector) + impulso por coincidencia en título.
 */
@Component
public class HybridReranker {

    private final int rrfK;
    private final double vectorWeight;
    private final double textWeight;

    public HybridReranker(RagProperties properties) {
        RagProperties.Search cfg = properties.search();
        this.rrfK = (cfg != null && cfg.rrfK() > 0) ? cfg.rrfK() : 60;
        this.vectorWeight = (cfg != null && cfg.vectorWeight() > 0) ? cfg.vectorWeight() : 0.62;
        this.textWeight = (cfg != null && cfg.textWeight() > 0) ? cfg.textWeight() : 0.38;
    }

    public List<RankedItem> fuseAndRerank(
            String query,
            List<CandidateHit> vectorHits,
            List<CandidateHit> textHits,
            int limit
    ) {
        Map<String, Accumulator> byExternalId = new LinkedHashMap<>();

        // 1. Ranking vectorial (pgvector)
        int vRank = 0;
        for (CandidateHit hit : vectorHits) {
            Accumulator acc = byExternalId.computeIfAbsent(hit.externalId(), k -> new Accumulator(hit));
            if (acc.vectorRank == Integer.MAX_VALUE) {
                vRank++;
                acc.vectorRank = vRank;
                acc.vectorScore = Math.max(acc.vectorScore, hit.rawScore());
                acc.rrfScore += vectorWeight / (rrfK + vRank);
            }
        }

        // 2. Ranking textual (PostgreSQL tsvector)
        int tRank = 0;
        for (CandidateHit hit : textHits) {
            Accumulator acc = byExternalId.computeIfAbsent(hit.externalId(), k -> new Accumulator(hit));
            if (acc.textRank == Integer.MAX_VALUE) {
                tRank++;
                acc.textRank = tRank;
                acc.textScore = Math.max(acc.textScore, hit.rawScore());
                acc.rrfScore += textWeight / (rrfK + tRank);
            }
        }

        // 3. Reordenamiento final con leve impulso por coincidencia normalizada en título
        String normalizedQuery = LocalDeterministicEmbeddingProvider.normalize(query == null ? "" : query);
        String[] queryTokens = normalizedQuery.isEmpty() ? new String[0] : normalizedQuery.split("\\s+");

        for (Accumulator acc : byExternalId.values()) {
            double titleBoost = computeTitleBoost(acc.hit.title(), normalizedQuery, queryTokens);
            // Combinación balanceada entre RRF (ranking) + magnitud coseno directa + impulso de título
            acc.finalScore = (acc.rrfScore * 32.0) + (acc.vectorScore * 0.45) + titleBoost;
        }

        return byExternalId.values().stream()
                .filter(acc -> acc.vectorScore > 0.04 || acc.textScore > 0.0)
                .sorted(Comparator.comparingDouble((Accumulator a) -> a.finalScore).reversed())
                .limit(Math.max(1, limit))
                .map(acc -> new RankedItem(
                        acc.hit.externalId(),
                        acc.hit.title(),
                        round4(acc.finalScore),
                        round4(acc.vectorScore),
                        round4(acc.textScore),
                        acc.hit.pageNumber(),
                        acc.hit.section(),
                        abbreviate(acc.hit.contentText(), 180)
                ))
                .toList();
    }

    private static double computeTitleBoost(String title, String normalizedQuery, String[] queryTokens) {
        if (title == null || title.isBlank() || normalizedQuery.isEmpty()) {
            return 0.0;
        }
        String normTitle = LocalDeterministicEmbeddingProvider.normalize(title);
        if (normTitle.contains(normalizedQuery)) {
            return 0.25;
        }
        if (queryTokens.length == 0) {
            return 0.0;
        }
        int matched = 0;
        for (String token : queryTokens) {
            if (token.length() >= 3 && normTitle.contains(token)) {
                matched++;
            }
        }
        return 0.14 * ((double) matched / queryTokens.length);
    }

    private static String abbreviate(String text, int maxLen) {
        if (text == null) {
            return "";
        }
        String clean = text.trim();
        return clean.length() <= maxLen ? clean : clean.substring(0, maxLen - 1) + "…";
    }

    private static double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private static final class Accumulator {
        final CandidateHit hit;
        int vectorRank = Integer.MAX_VALUE;
        int textRank = Integer.MAX_VALUE;
        double vectorScore = 0.0;
        double textScore = 0.0;
        double rrfScore = 0.0;
        double finalScore = 0.0;

        Accumulator(CandidateHit hit) {
            this.hit = hit;
        }
    }
}
