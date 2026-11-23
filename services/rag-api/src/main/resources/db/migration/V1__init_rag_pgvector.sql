-- Esquema RAG + pgvector con aislamiento multi-tenant (RLS) y búsqueda híbrida (HNSW + GIN)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
    id              UUID PRIMARY KEY,
    tenant_id       VARCHAR(128) NOT NULL,
    external_id     VARCHAR(128) NOT NULL,
    source_type     VARCHAR(40)  NOT NULL DEFAULT 'garment',
    title           VARCHAR(255) NOT NULL,
    content_text    TEXT         NOT NULL,
    content_hash    VARCHAR(64)  NOT NULL,
    metadata_json   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status          VARCHAR(24)  NOT NULL DEFAULT 'INDEXED',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rag_documents_tenant_external UNIQUE (tenant_id, external_id)
);

CREATE TABLE IF NOT EXISTS rag_chunks (
    id              UUID PRIMARY KEY,
    document_id     UUID         NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    tenant_id       VARCHAR(128) NOT NULL,
    external_id     VARCHAR(128) NOT NULL,
    chunk_index     INTEGER      NOT NULL,
    page_number     INTEGER      NOT NULL DEFAULT 1,
    section         VARCHAR(120) NOT NULL DEFAULT 'general',
    content_text    TEXT         NOT NULL,
    tsv             TSVECTOR     GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(content_text, ''))) STORED,
    embedding       vector(1536) NOT NULL,
    embedding_model VARCHAR(120) NOT NULL,
    metadata_json   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rag_chunks_doc_idx UNIQUE (document_id, chunk_index)
);

-- Índices para filtrado multi-tenant, búsqueda vectorial aproximada (HNSW coseno) y búsqueda textual (GIN)
CREATE INDEX IF NOT EXISTS idx_rag_documents_tenant ON rag_documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_tenant_model ON rag_chunks (tenant_id, embedding_model);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_tenant_external ON rag_chunks (tenant_id, external_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_tsv_gin ON rag_chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw
    ON rag_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Aislamiento defensivo por tenant a nivel de motor PostgreSQL (Row-Level Security)
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rag_documents_tenant_isolation ON rag_documents;
CREATE POLICY rag_documents_tenant_isolation ON rag_documents
    USING (tenant_id = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS rag_chunks_tenant_isolation ON rag_chunks;
CREATE POLICY rag_chunks_tenant_isolation ON rag_chunks
    USING (tenant_id = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
