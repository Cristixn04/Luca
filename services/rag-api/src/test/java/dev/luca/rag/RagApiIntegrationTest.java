package dev.luca.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.luca.rag.embedding.LocalDeterministicEmbeddingProvider;
import dev.luca.rag.repository.RagRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RagApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @TestConfiguration
    static class InMemoryRepoConfig {
        @Bean
        @Primary
        RagRepository ragRepository() {
            return new InMemoryRagRepository();
        }
    }

    @Test
    void healthIsPublicAndProtectedEndpointsRequireJwt() throws Exception {
        mockMvc.perform(get("/api/rag/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("luca-rag-api"));

        mockMvc.perform(post("/api/rag/v1/search/rerank")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"query": "chaqueta lluvia"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void enforcesTenantIsolationAndHybridRerankingAcrossClosetItems() throws Exception {
        String tokenA = obtainToken("device-tenant-alpha-0001");
        String tokenB = obtainToken("device-tenant-beta-0002");

        // Indexar prendas en Tenant A
        mockMvc.perform(post("/api/rag/v1/index/items?sync=true")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "externalId": "g-rain-jacket",
                                      "sourceType": "garment",
                                      "title": "Chaqueta impermeable azul",
                                      "content": "Chaqueta impermeable azul oscuro invierno otoño formalidad 3",
                                      "section": "closet"
                                    },
                                    {
                                      "externalId": "g-summer-short",
                                      "sourceType": "garment",
                                      "title": "Short de lino beige",
                                      "content": "Short fresco verano calor playa casual",
                                      "section": "closet"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptedCount").value(2));

        // Indexar prenda en Tenant B con palabra clave similar
        mockMvc.perform(post("/api/rag/v1/index/items?sync=true")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "externalId": "g-tenant-b-secret",
                                      "sourceType": "garment",
                                      "title": "Chaqueta lluvia privada B",
                                      "content": "Chaqueta para lluvia tormenta exclusiva tenant B",
                                      "section": "closet"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        // Búsqueda híbrida en Tenant A: debe reordenar la chaqueta primero y jamás devolver g-tenant-b-secret
        MvcResult searchRes = mockMvc.perform(post("/api/rag/v1/search/rerank")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"query": "algo para lluvia", "limit": 10}
                                """))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(searchRes.getResponse().getContentAsString());
        JsonNode results = json.get("results");
        assertThat(results.isArray()).isTrue();
        assertThat(results.size()).isGreaterThanOrEqualTo(1);
        assertThat(results.get(0).get("externalId").asText()).isEqualTo("g-rain-jacket");
        for (JsonNode node : results) {
            assertThat(node.get("externalId").asText()).isNotEqualTo("g-tenant-b-secret");
        }

        // Eliminar prenda de Tenant A
        mockMvc.perform(delete("/api/rag/v1/index/items/g-rain-jacket")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNoContent());
    }

    private String obtainToken(String tenantKey) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/rag/v1/auth/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tenantKey\":\"" + tenantKey + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    static final class InMemoryRagRepository implements RagRepository {
        private record StoredRow(
                String tenantId,
                String externalId,
                String title,
                String contentText,
                String section,
                String embeddingModel,
                float[] embedding
        ) {}

        private final Map<String, StoredRow> rows = new ConcurrentHashMap<>();

        @Override
        public void upsertDocumentWithChunks(
                String tenantId,
                String externalId,
                String sourceType,
                String title,
                String contentText,
                String contentHash,
                Map<String, Object> metadata,
                String embeddingModel,
                List<EmbeddedChunk> chunks
        ) {
            if (chunks.isEmpty()) return;
            rows.put(tenantId + "::" + externalId, new StoredRow(
                    tenantId,
                    externalId,
                    title,
                    contentText,
                    chunks.getFirst().chunk().section(),
                    embeddingModel,
                    chunks.getFirst().embedding()
            ));
        }

        @Override
        public boolean deleteByExternalId(String tenantId, String externalId) {
            return rows.remove(tenantId + "::" + externalId) != null;
        }

        @Override
        public List<CandidateHit> searchVector(
                String tenantId,
                float[] queryVector,
                String embeddingModel,
                List<String> candidateIds,
                int limit
        ) {
            List<CandidateHit> hits = new ArrayList<>();
            for (StoredRow row : rows.values()) {
                if (!row.tenantId().equals(tenantId)) continue;
                if (!row.embeddingModel().equals(embeddingModel)) continue;
                if (candidateIds != null && !candidateIds.isEmpty() && !candidateIds.contains(row.externalId())) continue;
                double sim = Math.max(0.0, cosine(queryVector, row.embedding()));
                hits.add(new CandidateHit(row.externalId(), row.title(), 1, row.section(), row.contentText(), sim));
            }
            return hits.stream()
                    .sorted(Comparator.comparingDouble(CandidateHit::rawScore).reversed())
                    .limit(limit)
                    .toList();
        }

        @Override
        public List<CandidateHit> searchFullText(String tenantId, String query, List<String> candidateIds, int limit) {
            String normQ = LocalDeterministicEmbeddingProvider.normalize(query);
            String[] tokens = normQ.isEmpty() ? new String[0] : normQ.split("\\s+");
            List<CandidateHit> hits = new ArrayList<>();
            for (StoredRow row : rows.values()) {
                if (!row.tenantId().equals(tenantId)) continue;
                if (candidateIds != null && !candidateIds.isEmpty() && !candidateIds.contains(row.externalId())) continue;
                String normDoc = LocalDeterministicEmbeddingProvider.normalize(row.contentText());
                int matched = 0;
                for (String token : tokens) {
                    if (token.length() >= 3 && normDoc.contains(token)) matched++;
                }
                if (matched > 0) {
                    hits.add(new CandidateHit(
                            row.externalId(),
                            row.title(),
                            1,
                            row.section(),
                            row.contentText(),
                            (double) matched / Math.max(1, tokens.length)
                    ));
                }
            }
            return hits.stream()
                    .sorted(Comparator.comparingDouble(CandidateHit::rawScore).reversed())
                    .limit(limit)
                    .toList();
        }

        @Override
        public Optional<float[]> findPrimaryEmbedding(String tenantId, String externalId, String embeddingModel) {
            StoredRow row = rows.get(tenantId + "::" + externalId);
            if (row == null || !row.embeddingModel().equals(embeddingModel)) return Optional.empty();
            return Optional.of(row.embedding());
        }

        @Override
        public boolean isHealthy() {
            return true;
        }

        private static double cosine(float[] a, float[] b) {
            double dot = 0.0;
            for (int i = 0; i < Math.min(a.length, b.length); i++) {
                dot += (double) a[i] * b[i];
            }
            return dot;
        }
    }
}
