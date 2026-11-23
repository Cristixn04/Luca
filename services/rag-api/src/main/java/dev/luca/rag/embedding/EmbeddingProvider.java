package dev.luca.rag.embedding;

/**
 * Puerto de generación de embeddings desacoplado del proveedor (OpenAI MVP, Ollama o local).
 */
public interface EmbeddingProvider {

    float[] embed(String text);

    String modelName();

    int dimensions();
}
