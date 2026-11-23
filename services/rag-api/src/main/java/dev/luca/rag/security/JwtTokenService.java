package dev.luca.rag.security;

import dev.luca.rag.config.RagProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtTokenService {

    private static final String TENANT_CLAIM = "tenant_id";

    private final SecretKey signingKey;
    private final long expirationSeconds;

    public JwtTokenService(RagProperties properties) {
        this.signingKey = deriveKey(properties.jwt().secret());
        this.expirationSeconds = Math.max(300L, properties.jwt().expirationSeconds());
    }

    public TokenResult issueToken(String tenantId) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expirationSeconds);

        String token = Jwts.builder()
                .subject(tenantId)
                .claim(TENANT_CLAIM, tenantId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();

        return new TokenResult(token, tenantId, expiresAt);
    }

    public Optional<String> extractTenantId(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String tenantId = claims.get(TENANT_CLAIM, String.class);
            if (tenantId == null || tenantId.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(tenantId);
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private static SecretKey deriveKey(String rawSecret) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(rawSecret.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible en la JVM", ex);
        }
    }

    public record TokenResult(String token, String tenantId, Instant expiresAt) {}
}
