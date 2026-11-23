package dev.luca.rag.controller;

import dev.luca.rag.model.RagDtos.SessionRequest;
import dev.luca.rag.model.RagDtos.SessionResponse;
import dev.luca.rag.security.JwtTokenService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Emite un JWT multi-tenant vinculado a un identificador técnico de dispositivo/sesión
 * (nunca recibe ni almacena la contraseña de la bóveda AES-GCM local de Luca).
 */
@RestController
@RequestMapping("/api/rag/v1/auth")
public class AuthController {

    private final JwtTokenService jwtTokenService;

    public AuthController(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @PostMapping("/session")
    public ResponseEntity<SessionResponse> createSession(@Valid @RequestBody SessionRequest request) {
        String tenantId = "tnt_" + sha256Prefix(request.tenantKey().trim());
        JwtTokenService.TokenResult issued = jwtTokenService.issueToken(tenantId);
        return ResponseEntity.ok(new SessionResponse(
                issued.token(),
                issued.tenantId(),
                issued.expiresAt().toString()
        ));
    }

    private static String sha256Prefix(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 32);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible", ex);
        }
    }
}
