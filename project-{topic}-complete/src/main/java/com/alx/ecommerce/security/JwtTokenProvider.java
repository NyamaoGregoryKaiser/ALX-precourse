package com.alx.ecommerce.security;

import com.alx.ecommerce.exception.CustomAuthenticationException;
import com.alx.ecommerce.util.AppConstants;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * Utility class for generating, validating, and extracting information from JWT tokens.
 */
@Component
@Slf4j
public class JwtTokenProvider {

    // You can externalize these to application.properties or environment variables
    // @Value("${app.jwt-secret}") // Example of loading from properties
    private String jwtSecret = AppConstants.JWT_SECRET;

    // @Value("${app.jwt-expiration-milliseconds}")
    private long jwtExpirationDate = AppConstants.JWT_EXPIRATION_MILLISECONDS;

    /**
     * Generates a JWT token for the given authentication object.
     *
     * @param authentication The Spring Security authentication object.
     * @return The generated JWT token.
     */
    public String generateToken(Authentication authentication) {
        String username = authentication.getName();

        Date currentDate = new Date();
        Date expireDate = new Date(currentDate.getTime() + jwtExpirationDate);

        String token = Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(expireDate)
                .signWith(key())
                .compact();
        log.debug("Generated JWT token for user {}. Expiration: {}", username, expireDate);
        return token;
    }

    /**
     * Gets the signing key for JWT.
     *
     * @return The signing key.
     */
    private Key key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    /**
     * Extracts the username from a JWT token.
     *
     * @param token The JWT token.
     * @return The username.
     */
    public String getUsername(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    /**
     * Validates a JWT token.
     *
     * @param token The JWT token to validate.
     * @return true if the token is valid, false otherwise.
     * @throws CustomAuthenticationException if the token is invalid or expired.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key())
                    .build()
                    .parse(token);
            return true;
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token: {}", ex.getMessage());
            throw new CustomAuthenticationException(HttpStatus.BAD_REQUEST, "Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token: {}", ex.getMessage());
            throw new CustomAuthenticationException(HttpStatus.BAD_REQUEST, "Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token: {}", ex.getMessage());
            throw new CustomAuthenticationException(HttpStatus.BAD_REQUEST, "Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty: {}", ex.getMessage());
            throw new CustomAuthenticationException(HttpStatus.BAD_REQUEST, "JWT claims string is empty");
        }
    }
}