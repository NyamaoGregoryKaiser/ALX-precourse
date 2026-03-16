```java
package com.alx.scrapineer.common.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Utility class for generating, validating, and extracting information from JWT tokens.
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration; // Expiration time in milliseconds

    /**
     * Extracts the username from a JWT token.
     * @param token The JWT token.
     * @return The username (subject) from the token.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts a specific claim from a JWT token.
     * @param token The JWT token.
     * @param claimsResolver Function to resolve the claim from Claims.
     * @param <T> Type of the claim.
     * @return The extracted claim.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Generates a JWT token for a given UserDetails.
     * @param userDetails The UserDetails to generate the token for.
     * @return The generated JWT token.
     */
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Generates a JWT token with extra claims and a UserDetails.
     * @param extraClaims Additional claims to include in the token.
     * @param userDetails The UserDetails to generate the token for.
     * @return The generated JWT token.
     */
    public String generateToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails
    ) {
        return Jwts
                .builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Validates if a JWT token is valid for a given UserDetails.
     * @param token The JWT token.
     * @param userDetails The UserDetails to validate against.
     * @return True if the token is valid, false otherwise.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    /**
     * Checks if a JWT token has expired.
     * @param token The JWT token.
     * @return True if the token has expired, false otherwise.
     */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Extracts the expiration date from a JWT token.
     * @param token The JWT token.
     * @return The expiration date.
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extracts all claims from a JWT token.
     * @param token The JWT token.
     * @return The Claims object containing all claims.
     */
    private Claims extractAllClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Decodes the secret key from base64 and returns it as a Key object.
     * @return The signing key.
     */
    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```