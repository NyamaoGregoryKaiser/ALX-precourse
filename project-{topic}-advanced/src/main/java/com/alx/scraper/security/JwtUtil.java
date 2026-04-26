package com.alx.scraper.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Utility class for JSON Web Token (JWT) operations.
 * Handles token generation, validation, and extraction of information.
 *
 * ALX Focus: Demonstrates secure authentication token management, including
 * secrets, expiration, and claims, critical for stateless API security.
 * Error handling for various JWT-related issues is also included.
 */
@Component
@Slf4j // Lombok annotation for logging
public class JwtUtil {

    @Value("${alx.app.jwtSecret}")
    private String jwtSecret;

    @Value("${alx.app.jwtExpirationMs}")
    private int jwtExpirationMs;

    /**
     * Generates a JWT token for an authenticated user.
     * The token includes the username as subject and user roles as a claim.
     *
     * @param authentication The Spring Security Authentication object, containing user details.
     * @return A signed JWT token string.
     */
    public String generateJwtToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();

        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return Jwts.builder()
                .setSubject((userPrincipal.getUsername()))
                .claim("roles", roles) // Custom claim for roles
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Retrieves the signing key from the base64 encoded secret.
     *
     * @return The {@link Key} object used for signing/verifying JWTs.
     */
    private Key key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    /**
     * Extracts the username from a JWT token.
     *
     * @param token The JWT token string.
     * @return The username (subject) from the token.
     */
    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    /**
     * Validates a given JWT token.
     * Checks for proper signature, expiration, and other common JWT errors.
     *
     * @param authToken The JWT token string to validate.
     * @return True if the token is valid, false otherwise.
     */
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(key()).build().parse(authToken);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }
}