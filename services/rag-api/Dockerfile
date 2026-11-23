# Build multi-stage: Maven + Java 21 JRE sin privilegios
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S luca && adduser -S luca -G luca
COPY --from=builder /build/target/rag-api-*.jar /app/app.jar
RUN chown -R luca:luca /app

USER luca
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
