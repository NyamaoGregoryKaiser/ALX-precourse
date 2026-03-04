package com.authsystem.auth.util;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Custom Spring Security filter to intercept incoming requests and validate JWT tokens.
 * This filter runs once per request to authenticate users based on the presence and validity of a JWT in the Authorization header.
 *
 * If a valid JWT is found, the user's authentication context is set in Spring Security.
 * This ensures that subsequent security checks (e.g., @PreAuthorize) can correctly identify the user and their roles.
 *
 * {@code @RequiredArgsConstructor} generates a constructor for final fields, enabling constructor injection.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService; // Injected to load UserDetails for validation

    /**
     * Performs the JWT authentication logic for each incoming HTTP request.
     *
     * 1. Extracts the JWT from the "Authorization" header.
     * 2. If no JWT or an invalid format, proceeds to the next filter.
     * 3. Extracts the username from the token.
     * 4. If a username is found and no authentication is already present in the SecurityContext:
     *    a. Loads user details from the database using {@link UserDetailsService}.
     *    b. Validates the token against the loaded user details.
     *    c. If valid, creates an {@link UsernamePasswordAuthenticationToken} and sets it in the {@link SecurityContextHolder}.
     * 5. Proceeds to the next filter in the chain.
     *
     * @param request The {@link HttpServletRequest} being processed.
     * @param response The {@link HttpServletResponse} being generated.
     * @param filterChain The {@link FilterChain} to continue the request processing.
     * @throws ServletException If a servlet-specific error occurs.
     * @throws IOException If an I/O error occurs.
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // 1. Check if Authorization header is present and starts with "Bearer "
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response); // No JWT, proceed to the next filter
            return;
        }

        // 2. Extract JWT token (skip "Bearer " prefix)
        jwt = authHeader.substring(7);
        try {
            username = jwtService.extractUsername(jwt);
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            logger.warn("JWT Token expired for request: {}", request.getRequestURI());
            // You might want to handle this more gracefully, e.g., send a custom error response
            // For now, let Spring Security handle unauthorized access later if no other authentication is present.
            filterChain.doFilter(request, response);
            return;
        } catch (io.jsonwebtoken.MalformedJwtException | io.jsonwebtoken.SignatureException e) {
            logger.warn("Invalid JWT Token for request: {}. Error: {}", request.getRequestURI(), e.getMessage());
            filterChain.doFilter(request, response);
            return;
        } catch (Exception e) {
            logger.error("Error extracting username from JWT token: {}", e.getMessage(), e);
            filterChain.doFilter(request, response);
            return;
        }

        // 3. If username is found and no user is currently authenticated in the SecurityContext
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Load user details from the database
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

            // 4. Validate the token against the loaded user details
            if (jwtService.isTokenValid(jwt, userDetails)) {
                // If token is valid, create an authentication object
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null, // Credentials are null as JWT is stateless
                        userDetails.getAuthorities() // User's roles/authorities
                );
                // Set additional details like client IP address and session ID
                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                // Set the authentication object in the SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authToken);
                logger.debug("Successfully authenticated user: {}", username);
            } else {
                logger.warn("JWT token validation failed for user: {}", username);
            }
        } else if (username == null) {
            logger.warn("Could not extract username from JWT. Token might be malformed or empty.");
        } else {
            logger.debug("User already authenticated: {}", SecurityContextHolder.getContext().getAuthentication().getName());
        }

        filterChain.doFilter(request, response); // Continue with the request chain
    }
}