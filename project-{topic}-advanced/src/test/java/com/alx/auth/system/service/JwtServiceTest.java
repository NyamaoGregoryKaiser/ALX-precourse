package com.alx.auth.system.service;

import com.alx.auth.system.data.entity.Role;
import com.alx.auth.system.data.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link JwtService}.
 * These tests verify the correct generation, extraction, and validation of JWT tokens.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("JwtService Unit Tests")
class JwtServiceTest {

    @InjectMocks
    private JwtService jwtService;

    // A test secret key for consistent JWT generation/validation in tests
    private static final String TEST_SECRET_KEY = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"; // 256-bit key
    private static final long TEST_EXPIRATION = 3600000; // 1 hour in ms

    private User testUser;

    @BeforeEach
    void setUp() {
        // Inject the test secret key and expiration into the JwtService
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET_KEY);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", TEST_EXPIRATION);

        testUser = User.builder()
                .id(1L)
                .firstname("Test")
                .lastname("User")
                .email("test@example.com")
                .password("password")
                .role(Role.USER)
                .build();
    }

    /**
     * Helper to get the signing key for manual token parsing in tests.
     */
    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(TEST_SECRET_KEY);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Test
    @DisplayName("Should generate a valid JWT token")
    void generateToken_ValidTokenGenerated() {
        String token = jwtService.generateToken(testUser);

        assertNotNull(token);
        assertFalse(token.isEmpty());

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        assertEquals(testUser.getUsername(), claims.getSubject());
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
        assertTrue(claims.getExpiration().after(claims.getIssuedAt()));
    }

    @Test
    @DisplayName("Should extract username from a valid token")
    void extractUsername_CorrectUsernameExtracted() {
        String token = jwtService.generateToken(testUser);
        String extractedUsername = jwtService.extractUsername(token);

        assertEquals(testUser.getUsername(), extractedUsername);
    }

    @Test
    @DisplayName("Should validate a token for the correct user and not expired")
    void isTokenValid_ValidToken_ReturnsTrue() {
        String token = jwtService.generateToken(testUser);
        assertTrue(jwtService.isTokenValid(token, testUser));
    }

    @Test
    @DisplayName("Should invalidate a token with a different user")
    void isTokenValid_DifferentUser_ReturnsFalse() {
        String token = jwtService.generateToken(testUser);
        User anotherUser = User.builder()
                .id(2L)
                .firstname("Another")
                .lastname("User")
                .email("another@example.com")
                .password("anotherpass")
                .role(Role.USER)
                .build();
        assertFalse(jwtService.isTokenValid(token, anotherUser));
    }

    @Test
    @DisplayName("Should invalidate an expired token")
    void isTokenValid_ExpiredToken_ReturnsFalse() {
        // Generate a token with a very short expiration time (e.g., 1ms)
        long shortExpiration = 1; // 1 millisecond
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", shortExpiration);
        String token = jwtService.generateToken(testUser);

        try {
            // Wait for the token to expire
            Thread.sleep(10); // Sleep for more than 1ms
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        assertFalse(jwtService.isTokenValid(token, testUser));
    }

    @Test
    @DisplayName("Should generate a token with extra claims")
    void generateToken_WithExtraClaims_ClaimsArePresent() {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", testUser.getRole().name());
        extraClaims.put("customId", testUser.getId());

        String token = jwtService.generateToken(extraClaims, testUser);
        assertNotNull(token);

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        assertEquals(testUser.getUsername(), claims.getSubject());
        assertEquals(testUser.getRole().name(), claims.get("role"));
        assertEquals(testUser.getId().intValue(), claims.get("customId", Integer.class)); // Claims converts Long to Integer sometimes
    }

    @Test
    @DisplayName("Should throw exception for an invalid signature token")
    void isTokenValid_InvalidSignature_ThrowsException() {
        // Create a valid token first
        String validToken = jwtService.generateToken(testUser);

        // Tamper with the token (e.g., change a character in the payload)
        // This is a crude way to simulate invalid signature; a real attack would be more subtle.
        String[] parts = validToken.split("\\.");
        String tamperedToken = parts[0] + "." + parts[1].substring(0, parts[1].length() - 1) + "X" + "." + parts[2];

        // Ensure isTokenValid handles the exception gracefully (or the filter does)
        assertThrows(io.jsonwebtoken.security.SignatureException.class, () -> jwtService.extractUsername(tamperedToken));
    }
}