package dev.luca.rag;

import dev.luca.rag.config.RagProperties;
import dev.luca.rag.embedding.LocalDeterministicEmbeddingProvider;
import dev.luca.rag.model.RagDtos.RankedItem;
import dev.luca.rag.model.TextChunk;
import dev.luca.rag.repository.RagRepository.CandidateHit;
import dev.luca.rag.service.HybridReranker;
import dev.luca.rag.service.TextChunker;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class HybridRerankerAndChunkerTest {

    private static RagProperties testProps() {
        return new RagProperties(
                "http://localhost:5173",
                new RagProperties.Jwt("test-secret-key-for-unit-tests-256-bits-minimum", 3600),
                new RagProperties.Embedding("local", 1536, null, null),
                new RagProperties.Chunking(60, 15),
                new RagProperties.Search(60, 0.62, 0.38, 4)
        );
    }

    @Test
    void chunkerDividesLongTextWithOverlapPreservingOrder() {
        TextChunker chunker = new TextChunker(testProps());
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 140; i++) {
            sb.append("palabra").append(i).append(' ');
        }

        List<TextChunk> chunks = chunker.chunk(sb.toString(), "ficha", Map.of("source", "test"));

        assertThat(chunks).hasSizeGreaterThanOrEqualTo(3);
        assertThat(chunks.get(0).chunkIndex()).isEqualTo(0);
        assertThat(chunks.get(1).chunkIndex()).isEqualTo(1);
        assertThat(chunks.get(1).contentText()).contains("palabra50");
        assertThat(chunks.get(0).section()).isEqualTo("ficha");
    }

    @Test
    void localEmbeddingCapturesFashionSemanticSimilarity() {
        LocalDeterministicEmbeddingProvider provider = new LocalDeterministicEmbeddingProvider(1536);
        float[] queryVec = provider.embed("ropa elegante para oficina");
        float[] formalBlazer = provider.embed("Chaqueta blazer azul marino formal estilo clasico oficina");
        float[] sportyShort = provider.embed("Short deportivo verde correr gimnasio verano");

        double simFormal = cosine(queryVec, formalBlazer);
        double simSporty = cosine(queryVec, sportyShort);

        assertThat(simFormal).isGreaterThan(simSporty + 0.15);
    }

    @Test
    void hybridRerankerFusesVectorAndTextWithRrf() {
        HybridReranker reranker = new HybridReranker(testProps());
        List<CandidateHit> vectorHits = List.of(
                new CandidateHit("g-jacket", "Chaqueta impermeable", 1, "closet", "Chaqueta para lluvia invierno", 0.88),
                new CandidateHit("g-coat", "Abrigo gris", 1, "closet", "Abrigo cálido otoño", 0.72)
        );
        List<CandidateHit> textHits = List.of(
                new CandidateHit("g-coat", "Abrigo gris", 1, "closet", "Abrigo cálido otoño lluvia", 0.55),
                new CandidateHit("g-jacket", "Chaqueta impermeable", 1, "closet", "Chaqueta para lluvia invierno", 0.50)
        );

        List<RankedItem> ranked = reranker.fuseAndRerank("chaqueta lluvia", vectorHits, textHits, 5);

        assertThat(ranked).hasSize(2);
        assertThat(ranked.get(0).externalId()).isEqualTo("g-jacket");
        assertThat(ranked.get(0).score()).isGreaterThan(ranked.get(1).score());
    }

    private static double cosine(float[] a, float[] b) {
        double dot = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += (double) a[i] * b[i];
        }
        return dot;
    }
}
