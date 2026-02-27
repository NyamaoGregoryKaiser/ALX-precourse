```java
package com.alx.webscraper.auth.config;

import com.alx.webscraper.auth.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Spring Security configuration for the WebScraperX application.
 * Defines security filters, authentication provider, password encoder, and authorization rules.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Enables method-level security (e.g., @PreAuthorize)
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserService userService; // Our custom UserDetailsService

    @Autowired
    public SecurityConfig(JwtAuthFilter jwtAuthFilter, UserService userService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userService = userService;
    }

    /**
     * Configures the security filter chain.
     * This method defines which requests are authenticated, how sessions are managed, and integrates JWT filter.
     * @param http HttpSecurity object to configure.
     * @return The built SecurityFilterChain.
     * @throws Exception if configuration fails.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF for stateless APIs that use token-based authentication
                .csrf(AbstractHttpConfigurer::disable)
                // Configure authorization rules for HTTP requests
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints: authentication and registration, static assets, Swagger UI, Actuator health
                        .requestMatchers("/api/v1/auth/**",
                                         "/swagger-ui/**",
                                         "/v3/api-docs/**",
                                         "/actuator/health",
                                         "/actuator/info",
                                         "/", "/css/**", "/js/**", "/img/**").permitAll() // Allow static content and index.html
                        // Admin-specific endpoints (example, not fully implemented in controllers)
                        .requestMatchers("/api/v1/admin/**").hasAuthority("ADMIN")
                        // All other API requests require authentication
                        .requestMatchers("/api/v1/**").authenticated()
                        // Any other request (e.g., to root context)
                        .anyRequest().permitAll() // Allow other requests (e.g., favicon)
                )
                // Configure session management to be stateless (essential for JWT)
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Set the custom authentication provider
                .authenticationProvider(authenticationProvider())
                // Add the JWT authentication filter before Spring's default UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                // Add CORS filter to allow cross-origin requests
                .addFilterBefore(corsFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Defines the authentication provider (DaoAuthenticationProvider).
     * It uses our custom UserService (UserDetailsService) and BCryptPasswordEncoder.
     * @return The configured AuthenticationProvider.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Defines the BCryptPasswordEncoder bean for hashing passwords.
     * @return The BCryptPasswordEncoder instance.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Provides the AuthenticationManager for processing authentication requests.
     * @param config AuthenticationConfiguration from Spring.
     * @return The AuthenticationManager.
     * @throws Exception if an error occurs.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Configures Cross-Origin Resource Sharing (CORS) for the application.
     * Allows requests from all origins, methods, and headers for demonstration purposes.
     * In production, configure specific origins and methods.
     * @return The configured CorsFilter.
     */
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("*"); // Allow all origins for simplicity in development
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
```