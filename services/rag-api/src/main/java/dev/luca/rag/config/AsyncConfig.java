package dev.luca.rag.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Pool acotado para trabajos asíncronos de segmentación e indexación vectorial,
 * protegiendo la CPU/RAM del servidor ante lotes grandes.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "ragIndexingExecutor")
    public Executor ragIndexingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("rag-index-");
        executor.initialize();
        return executor;
    }
}
