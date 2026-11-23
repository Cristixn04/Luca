package dev.luca.rag;

import dev.luca.rag.config.RagProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableConfigurationProperties(RagProperties.class)
public class RagApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(RagApiApplication.class, args);
    }
}
