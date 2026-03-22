package com.alx.auth.system.config;

import com.alx.auth.system.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * Custom Spring Security filter for JWT authentication.
 * This filter intercepts incoming requests, extracts JWT tokens, validates them,
 * and sets up the Spring Security context if the token is valid.
 *
 * @RequiredArgsConstructor: Lombok annotation to generate a constructor with required arguments (final fields).
 * @Slf4j: Lombok annotation to generate an SLF4J logger field.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    /**
     * Performs the actual filtering logic.
     *
     * @param request The HTTP request.
     * @param response The HTTP response.
     * @param filterChain The filter chain to proceed.
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
        final String userEmail;

        // 1. Check for Authorization header and JWT format
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No JWT token found or invalid format in Authorization header.");
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Extract JWT token
        jwt = authHeader.substring(7);
        log.debug("Extracted JWT: {}", jwt);

        try {
            // 3. Extract user email from JWT
            userEmail = jwtService.extractUsername(jwt);

            // 4. Validate JWT and set up SecurityContext
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // User is not yet authenticated in the current security context
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    log.debug("JWT token is valid for user: {}", userEmail);
                    // Create an authentication token
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null, // Credentials are null as JWT is stateless
                            userDetails.getAuthorities()
                    );
                    // Set authentication details from the request
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Update the SecurityContextHolder with the authenticated user
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.info("User '{}' authenticated successfully via JWT.", userEmail);
                } else {
                    log.warn("Invalid JWT token for user: {}", userEmail);
                }
            }
        } catch (Exception e) {
            log.error("Error processing JWT token: {}", e.getMessage(), e);
            // Consider sending an appropriate error response or letting the exception handler deal with it
            // For now, we'll let it pass to the next filter or the global exception handler
        }

        // 5. Continue with the filter chain
        filterChain.doFilter(request, response);
    }
}