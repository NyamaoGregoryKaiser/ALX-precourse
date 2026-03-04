package com.authsystem.auth.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Service for handling JWT (JSON Web Token) operations.
 * This includes generating tokens, extracting claims, validating tokens,
 * and extracting user details from tokens.
 *
 * The secret key for signing JWTs is retrieved from application properties.
 */
@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    @Value("${application.security.jwt.secret-key}")
    private String secretKey;

    @Value("${application.security.jwt.expiration}")
    private long jwtExpiration; // Token expiration in milliseconds

    private SecretKey signingKey;

    /**
     * Initializes the signing key for JWTs after the bean has been constructed.
     * The secret key from properties is base64-decoded into a {@link SecretKey}.
     */
    @PostConstruct
    public void init() {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
        logger.info("JWT Service initialized. Secret key loaded.");
    }

    /**
     * Extracts the username (subject) from a JWT token.
     *
     * @param token The JWT token string.
     * @return The username extracted from the token's subject claim.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts a specific claim from a JWT token using a claims resolver function.
     *
     * @param token The JWT token string.
     * @param claimsResolver A function to resolve a specific claim from {@link Claims}.
     * @param <T> The type of the claim to extract.
     * @return The extracted claim.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Generates a JWT token for a given UserDetails object.
     *
     * @param userDetails The {@link UserDetails} object representing the authenticated user.
     * @return The generated JWT token string.
     */
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Generates a JWT token with additional claims for a given UserDetails object.
     *
     * @param extraClaims A map of additional claims to include in the token payload.
     * @param userDetails The {@link UserDetails} object representing the authenticated user.
     * @return The generated JWT token string.
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    /**
     * Builds the JWT token with specified claims, subject, and expiration.
     *
     * @param extraClaims Additional claims for the token.
     * @param userDetails The {@link UserDetails} object (subject).
     * @param expiration The expiration time for the token in milliseconds.
     * @return The built JWT token string.
     */
    private String buildToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            long expiration
    ) {
        // Add roles as a custom claim for easy access during authorization
        extraClaims.put("roles", userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));

        String token = Jwts
                .builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(signingKey)
                .compact();
        logger.debug("Generated JWT for user: {} with expiration: {}ms", userDetails.getUsername(), expiration);
        return token;
    }

    /**
     * Validates a JWT token against a UserDetails object.
     * Checks if the username in the token matches the UserDetails username
     * and if the token is not expired.
     *
     * @param token The JWT token string.
     * @param userDetails The {@link UserDetails} object to validate against.
     * @return {@code true} if the token is valid for the given user, {@code false} otherwise.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        boolean isValid = (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
        if (!isValid) {
            logger.warn("Invalid JWT token for user: {}. Is username mismatch? {}, Is token expired? {}",
                    username, !username.equals(userDetails.getUsername()), isTokenExpired(token));
        }
        return isValid;
    }

    /**
     * Checks if a JWT token has expired.
     *
     * @param token The JWT token string.
     * @return {@code true} if the token is expired, {@code false} otherwise.
     */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Extracts the expiration date from a JWT token.
     *
     * @param token The JWT token string.
     * @return The expiration {@link Date} of the token.
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extracts all claims from a JWT token.
     * This method parses the token and returns the payload claims.
     *
     * @param token The JWT token string.
     * @return The {@link Claims} object containing all payload claims.
     */
    private Claims extractAllClaims(String token) {
        return Jwts
                .parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}