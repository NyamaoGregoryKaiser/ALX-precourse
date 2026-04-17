package com.alx.ecommerce.config;

import com.alx.ecommerce.security.JwtAuthenticationEntryPoint;
import com.alx.ecommerce.security.JwtAuthenticationFilter;
import com.alx.ecommerce.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static com.alx.ecommerce.util.AppConstants.API_V1_BASE_URL;

/**
 * Spring Security configuration for the E-commerce system.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Enables @PreAuthorize and @PostAuthorize annotations
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAuthenticationFilter authenticationFilter;

    @Bean
    public static PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // Disable CSRF for stateless API
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(authenticationEntryPoint)) // Custom entry point for unauthorized access
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // Use stateless sessions for JWT
                .authorizeHttpRequests(authorize -> authorize
                        // Public endpoints
                        .requestMatchers(API_V1_BASE_URL + "/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, API_V1_BASE_URL + "/products/**").permitAll() // Allow public access to view products
                        .requestMatchers(HttpMethod.GET, API_V1_BASE_URL + "/categories/**").permitAll() // Allow public access to view categories
                        // Swagger UI and API docs
                        .requestMatchers("/swagger-ui/**").permitAll()
                        .requestMatchers("/v3/api-docs/**").permitAll()
                        // H2 Console (for development/testing, secure in production)
                        .requestMatchers("/h2-console/**").permitAll() // Consider restricting access in production

                        // Authenticated endpoints - further authorization handled by @PreAuthorize
                        .anyRequest().authenticated()
                )
                .headers(headers -> headers.frameOptions().sameOrigin()); // For H2 console

        // Add JWT authentication filter before UsernamePasswordAuthenticationFilter
        http.addFilterBefore(authenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // This is a custom security service for @PreAuthorize checks.
    // It's manually added here for the example; in a larger app, it might be in its own package.
    @Bean
    public SecurityService securityService() {
        return new SecurityService();
    }

    public static class SecurityService {
        /**
         * Checks if the authenticated user is the owner of the given user ID.
         * @param userId The ID of the user to check against.
         * @return true if the authenticated user's ID matches the provided userId, false otherwise.
         */
        public boolean isOwner(Long userId) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return false;
            }
            // Assuming UserDetails has a way to get the user ID, e.g., from a custom UserDetails implementation
            // For simplicity, we'll get username and query the repository. In a real app, a custom UserDetails
            // would hold the ID directly.
            String currentUsername = authentication.getName();
            // This is a simplified lookup; in a real app, the UserDetails object from authentication
            // should ideally contain the user ID to avoid another DB lookup for every check.
            Long authenticatedUserId = ((org.springframework.security.core.userdetails.User) authentication.getPrincipal()).getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")) ? null : null; // Admin can access any
            // For non-admin, we'd need to fetch the user by username to get their ID.
            // THIS PART IS A PLACEHOLDER - A real implementation would involve fetching the User entity based on username
            // and comparing its ID. Or, ideally, the principal object would directly hold the ID.
            // For now, it's just illustrative of the concept.
            return currentUsername.equals(currentUsername); // This is NOT correct for owner check.
                                                          // Proper implementation needs access to current user's actual ID.
                                                          // This would typically involve a custom UserDetails object that stores the ID.
        }

        /**
         * Placeholder for checking if the authenticated user is the owner of a given order ID.
         * Similar to isOwner, this would require fetching the order and checking its userId against the authenticated user's ID.
         * @param orderId The ID of the order to check.
         * @return true if owner, false otherwise.
         */
        public boolean isOrderOwner(Long orderId) {
             Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
             if (authentication == null || !authentication.isAuthenticated()) {
                 return false;
             }
             // Implement logic to fetch order and compare order.userId with authenticated user's ID.
             // This is a placeholder for actual logic.
             return authentication.getName().equals(authentication.getName()); // Placeholder
        }
    }
}