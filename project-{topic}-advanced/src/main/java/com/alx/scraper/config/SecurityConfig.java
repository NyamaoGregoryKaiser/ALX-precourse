package com.alx.scraper.config;

import com.alx.scraper.security.JwtRequestFilter;
import com.alx.scraper.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
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
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

/**
 * Spring Security configuration for the AlxScraper application.
 * This class defines how security is handled, including authentication,
 * authorization rules, password encoding, and JWT integration.
 *
 * ALX Focus: Comprehensive security setup for an enterprise application.
 * Demonstrates:
 * - Stateless session management (JWT).
 * - Custom UserDetailsService and password encoder.
 * - Authorization rules for different endpoints.
 * - Integration of custom JWT filter.
 * - CSRF disablement for API-only applications (important consideration).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true, prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    /**
     * Configures the password encoder bean. BCrypt is recommended for strong password hashing.
     *
     * @return A {@link BCryptPasswordEncoder} instance.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configures the DAO authentication provider.
     * Uses the custom UserDetailsService and BCryptPasswordEncoder.
     *
     * @return A {@link DaoAuthenticationProvider} instance.
     */
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Retrieves the AuthenticationManager bean from Spring's AuthenticationConfiguration.
     * This is used for performing authentication (e.g., in the AuthController).
     *
     * @param authConfig The Spring {@link AuthenticationConfiguration}.
     * @return The {@link AuthenticationManager} instance.
     * @throws Exception If an error occurs during manager retrieval.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * Configures the security filter chain for HTTP requests.
     * Defines authorization rules, session management, and adds the JWT filter.
     *
     * @param http The {@link HttpSecurity} object to configure.
     * @return A {@link SecurityFilterChain} instance.
     * @throws Exception If an error occurs during configuration.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF for stateless API applications (JWT handles session)
                .csrf(AbstractHttpConfigurer::disable)
                // Configure authorization for HTTP requests
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(
                                AntPathRequestMatcher.antMatcher("/api/auth/**"),
                                AntPathRequestMatcher.antMatcher("/swagger-ui/**"),
                                AntPathRequestMatcher.antMatcher("/v3/api-docs/**"),
                                AntPathRequestMatcher.antMatcher("/error"),
                                AntPathRequestMatcher.antMatcher("/actuator/**"), // For monitoring
                                AntPathRequestMatcher.antMatcher("/"), // Frontend root
                                AntPathRequestMatcher.antMatcher("/login"),
                                AntPathRequestMatcher.antMatcher("/register"),
                                AntPathRequestMatcher.antMatcher("/css/**"),
                                AntPathRequestMatcher.antMatcher("/js/**")
                        ).permitAll() // Allow all public endpoints
                        // Other endpoints require authentication
                        .anyRequest().authenticated()
                )
                // Configure session management to be stateless (critical for JWT)
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Add the JWT authentication provider
                .authenticationProvider(authenticationProvider())
                // Add the custom JWT request filter before Spring's UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}