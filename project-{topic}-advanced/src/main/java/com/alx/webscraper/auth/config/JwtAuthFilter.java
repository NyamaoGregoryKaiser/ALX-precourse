```java
package com.alx.webscraper.auth.config;

import com.alx.webscraper.auth.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Custom filter for JWT authentication.
 * Intercepts requests, extracts JWT token, validates it, and sets security context.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserService userService; // Our custom UserDetailsService

    @Autowired
    public JwtAuthFilter(JwtService jwtService, UserService userService) {
        this.jwtService = jwtService;
        this.userService = userService;
    }

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
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Extract JWT token
        jwt = authHeader.substring(7);
        try {
            username = jwtService.extractUsername(jwt);
        } catch (Exception e) {
            // Log the exception, but don't stop the filter chain.
            // Let the SecurityContext remain empty, leading to 403 Forbidden later if endpoint is protected.
            logger.debug("Failed to extract username from JWT: {}", e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }


        // 3. If username is extracted and no authentication is currently set in SecurityContext
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userService.loadUserByUsername(username);

            // 4. Validate token
            if (jwtService.isTokenValid(jwt, userDetails)) {
                // 5. Create authentication object and set in SecurityContext
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null, // Credentials are not stored in context for JWT
                        userDetails.getAuthorities()
                );
                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } else {
                logger.warn("Invalid JWT token for user: {}", username);
            }
        }

        // 6. Continue filter chain
        filterChain.doFilter(request, response);
    }
}
```