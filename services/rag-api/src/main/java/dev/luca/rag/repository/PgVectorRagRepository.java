package dev.luca.rag.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pgvector.PGvector;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Array;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio PostgreSQL + pgvector con aislamiento multi-tenant explícito (WHERE tenant_id = ?
 * + SET LOCAL app.current_tenant para activar Row-Level Security en PostgreSQL).
 */
@Repository
@ConditionalOnBean(JdbcTemplate.class)
public class PgVectorRagRepository implements RagRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PgVectorRagRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
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
        applyTenantContext(tenantId);
        String metaJson = toJson(metadata);

        UUID docId = jdbcTemplate.queryForObject(
                """
                INSERT INTO rag_documents (id, tenant_id, external_id, source_type, title, content_text, content_hash, metadata_json, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), 'INDEXED', NOW())
                ON CONFLICT (tenant_id, external_id) DO UPDATE SET
                    source_type = EXCLUDED.source_type,
                    title = EXCLUDED.title,
                    content_text = EXCLUDED.content_text,
                    content_hash = EXCLUDED.content_hash,
                    metadata_json = EXCLUDED.metadata_json,
                    status = 'INDEXED',
                    updated_at = NOW()
                RETURNING id
                """,
                (rs, rowNum) -> rs.getObject("id", UUID.class),
                UUID.randomUUID(),
                tenantId,
                externalId,
                sourceType == null || sourceType.isBlank() ? "garment" : sourceType,
                title,
                contentText,
                contentHash,
                metaJson
        );

        jdbcTemplate.update(
                "DELETE FROM rag_chunks WHERE tenant_id = ? AND document_id = ?",
                tenantId,
                docId
        );

        for (EmbeddedChunk embedded : chunks) {
            String chunkMetaJson = toJson(embedded.chunk().metadata());
            String vectorLiteral = new PGvector(embedded.embedding()).toString();
            jdbcTemplate.update(
                    """
                    INSERT INTO rag_chunks (
                        id, document_id, tenant_id, external_id, chunk_index,
                        page_number, section, content_text, embedding, embedding_model, metadata_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS vector), ?, CAST(? AS jsonb))
                    """,
                    UUID.randomUUID(),
                    docId,
                    tenantId,
                    externalId,
                    embedded.chunk().chunkIndex(),
                    embedded.chunk().pageNumber(),
                    embedded.chunk().section(),
                    embedded.chunk().contentText(),
                    vectorLiteral,
                    embeddingModel,
                    chunkMetaJson
            );
        }
    }

    @Override
    @Transactional
    public boolean deleteByExternalId(String tenantId, String externalId) {
        applyTenantContext(tenantId);
        int affected = jdbcTemplate.update(
                "DELETE FROM rag_documents WHERE tenant_id = ? AND external_id = ?",
                tenantId,
                externalId
        );
        return affected > 0;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateHit> searchVector(
            String tenantId,
            float[] queryVector,
            String embeddingModel,
            List<String> candidateIds,
            int limit
    ) {
        applyTenantContext(tenantId);
        String vectorLiteral = new PGvector(queryVector).toString();
        boolean filterCandidates = candidateIds != null && !candidateIds.isEmpty();

        String sql = filterCandidates
                ? """
                  SELECT c.external_id, d.title, c.page_number, c.section, c.content_text,
                         GREATEST(0.0, 1.0 - (c.embedding <=> CAST(? AS vector))) AS score
                  FROM rag_chunks c
                  INNER JOIN rag_documents d ON d.id = c.document_id
                  WHERE c.tenant_id = ?
                    AND c.embedding_model = ?
                    AND c.external_id = ANY(?)
                  ORDER BY c.embedding <=> CAST(? AS vector) ASC
                  LIMIT ?
                  """
                : """
                  SELECT c.external_id, d.title, c.page_number, c.section, c.content_text,
                         GREATEST(0.0, 1.0 - (c.embedding <=> CAST(? AS vector))) AS score
                  FROM rag_chunks c
                  INNER JOIN rag_documents d ON d.id = c.document_id
                  WHERE c.tenant_id = ?
                    AND c.embedding_model = ?
                  ORDER BY c.embedding <=> CAST(? AS vector) ASC
                  LIMIT ?
                  """;

        return jdbcTemplate.query(
                con -> {
                    PreparedStatement ps = con.prepareStatement(sql);
                    int idx = 1;
                    ps.setString(idx++, vectorLiteral);
                    ps.setString(idx++, tenantId);
                    ps.setString(idx++, embeddingModel);
                    if (filterCandidates) {
                        Array arr = con.createArrayOf("text", candidateIds.toArray(String[]::new));
                        ps.setArray(idx++, arr);
                    }
                    ps.setString(idx++, vectorLiteral);
                    ps.setInt(idx, limit);
                    return ps;
                },
                PgVectorRagRepository::mapHit
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateHit> searchFullText(
            String tenantId,
            String query,
            List<String> candidateIds,
            int limit
    ) {
        applyTenantContext(tenantId);
        boolean filterCandidates = candidateIds != null && !candidateIds.isEmpty();

        String sql = filterCandidates
                ? """
                  SELECT c.external_id, d.title, c.page_number, c.section, c.content_text,
                         ts_rank_cd(c.tsv, websearch_to_tsquery('spanish', ?)) AS score
                  FROM rag_chunks c
                  INNER JOIN rag_documents d ON d.id = c.document_id
                  WHERE c.tenant_id = ?
                    AND c.external_id = ANY(?)
                    AND c.tsv @@ websearch_to_tsquery('spanish', ?)
                  ORDER BY score DESC
                  LIMIT ?
                  """
                : """
                  SELECT c.external_id, d.title, c.page_number, c.section, c.content_text,
                         ts_rank_cd(c.tsv, websearch_to_tsquery('spanish', ?)) AS score
                  FROM rag_chunks c
                  INNER JOIN rag_documents d ON d.id = c.document_id
                  WHERE c.tenant_id = ?
                    AND c.tsv @@ websearch_to_tsquery('spanish', ?)
                  ORDER BY score DESC
                  LIMIT ?
                  """;

        return jdbcTemplate.query(
                con -> {
                    PreparedStatement ps = con.prepareStatement(sql);
                    int idx = 1;
                    ps.setString(idx++, query);
                    ps.setString(idx++, tenantId);
                    if (filterCandidates) {
                        Array arr = con.createArrayOf("text", candidateIds.toArray(String[]::new));
                        ps.setArray(idx++, arr);
                    }
                    ps.setString(idx++, query);
                    ps.setInt(idx, limit);
                    return ps;
                },
                PgVectorRagRepository::mapHit
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<float[]> findPrimaryEmbedding(
            String tenantId,
            String externalId,
            String embeddingModel
    ) {
        applyTenantContext(tenantId);
        List<float[]> rows = jdbcTemplate.query(
                """
                SELECT embedding::text AS vec
                FROM rag_chunks
                WHERE tenant_id = ? AND external_id = ? AND embedding_model = ?
                ORDER BY chunk_index ASC
                LIMIT 1
                """,
                (rs, rowNum) -> {
                    try {
                        return new PGvector(rs.getString("vec")).toArray();
                    } catch (SQLException ex) {
                        throw new IllegalStateException("Error parseando vector pgvector", ex);
                    }
                },
                tenantId,
                externalId,
                embeddingModel
        );
        return rows.stream().findFirst();
    }

    @Override
    public boolean isHealthy() {
        try {
            Integer ok = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return ok != null && ok == 1;
        } catch (Exception ex) {
            return false;
        }
    }

    private void applyTenantContext(String tenantId) {
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.current_tenant', ?, true)",
                String.class,
                tenantId
        );
    }

    private String toJson(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }

    private static CandidateHit mapHit(ResultSet rs, int rowNum) throws SQLException {
        return new CandidateHit(
                rs.getString("external_id"),
                rs.getString("title"),
                rs.getInt("page_number"),
                rs.getString("section"),
                rs.getString("content_text"),
                rs.getDouble("score")
        );
    }
}
