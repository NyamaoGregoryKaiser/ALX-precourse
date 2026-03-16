package com.alx.taskmgr.config;

import com.alx.taskmgr.service.JwtService;
import com.alx.taskmgr.service.UserService;
import com.alx.taskmgr.util.UserContext; // Import UserContext
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Custom filter to handle JWT authentication for incoming requests.
 * Extends OncePerRequestFilter to ensure the filter runs only once per request.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserService userService; // Our custom UserDetailsService

    /**
     * Performs filtering logic for each request.
     * Extracts JWT token, validates it, sets authentication in SecurityContext,
     * and sets the current user's ID in UserContext ThreadLocal.
     * @param request The HttpServletRequest.
     * @param response The HttpServletResponse.
     * @param filterChain The FilterChain.
     * @throws ServletException if a servlet-specific error occurs.
     * @throws IOException if an I/O error occurs.
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

        // Try-finally block to ensure UserContext is always cleared
        try {
            // Check if Authorization header is present and starts with "Bearer "
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response); // Continue to next filter
                return;
            }

            // Extract JWT token (remove "Bearer " prefix)
            jwt = authHeader.substring(7);
            username = jwtService.extractUsername(jwt); // Extract username from JWT

            // If username is found and no authentication is currently set in SecurityContext
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userService.loadUserByUsername(username); // Load user details

                // Validate the token
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    // If token is valid, create an authentication object
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    // Set authentication details
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    // Set the authentication object in SecurityContext
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    // --- Custom logic to set current user ID in UserContext ---
                    // Fetch the full User entity to get the ID
                    com.alx.taskmgr.entity.User userEntity = userService.getUserByUsername(username);
                    UserContext.setCurrentUserId(userEntity.getId());
                    // -----------------------------------------------------------
                }
            }
            filterChain.doFilter(request, response); // Continue to next filter in the chain
        } finally {
            // Always clear the UserContext ThreadLocal after the request
            UserContext.clear();
        }
    }
}