package com.authsystem.config;

import com.authsystem.auth.util.JwtAuthenticationFilter;
import com.authsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.servlet.util.matcher.MvcRequestMatcher;
import org.springframework.web.servlet.handler.HandlerMappingIntrospector;

import static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher;

/**
 * Global Spring Security configuration for the application.
 * This class defines security policies, authentication providers,
 * password encoders, and custom JWT authentication filters.
 *
 * {@code @EnableWebSecurity} enables Spring Security's web security support.
 * {@code @EnableMethodSecurity} enables method-level security (e.g., using @PreAuthorize).
 * {@code @RequiredArgsConstructor} generates a constructor for final fields,
 * allowing for constructor injection of dependencies.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Enables method-level security annotations like @PreAuthorize, @PostAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserRepository userRepository;
    private final RateLimitInterceptor rateLimitInterceptor;

    /**
     * Configures the security filter chain for HTTP requests.
     * This method defines which requests are public, which require authentication,
     * and how the authentication process works (e.g., stateless sessions, JWT filter).
     *
     * @param http The HttpSecurity object to configure.
     * @param introspector The HandlerMappingIntrospector to build MvcRequestMatcher.
     * @return The configured SecurityFilterChain.
     * @throws Exception If an error occurs during configuration.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, HandlerMappingIntrospector introspector) throws Exception {
        MvcRequestMatcher.Builder mvcMatcherBuilder = new MvcRequestMatcher.Builder(introspector);

        http
                .csrf(AbstractHttpConfigurer::disable) // Disable CSRF as JWT tokens handle stateless authentication
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints for authentication and swagger documentation
                        .requestMatchers(
                                mvcMatcherBuilder.pattern("/api/auth/**"),
                                mvcMatcherBuilder.pattern("/v2/api-docs"),
                                mvcMatcherBuilder.pattern("/v3/api-docs"),
                                mvcMatcherBuilder.pattern("/v3/api-docs/**"),
                                mvcMatcherBuilder.pattern("/swagger-resources"),
                                mvcMatcherBuilder.pattern("/swagger-resources/**"),
                                mvcMatcherBuilder.pattern("/configuration/ui"),
                                mvcMatcherBuilder.pattern("/configuration/security"),
                                mvcMatcherBuilder.pattern("/swagger-ui/**"),
                                mvcMatcherBuilder.pattern("/webjars/**"),
                                mvcMatcherBuilder.pattern("/swagger-ui.html"),
                                // Actuator endpoints for monitoring (consider securing these in production)
                                antMatcher("/actuator/**")
                        ).permitAll()
                        // Endpoints for role management are restricted to ADMIN role
                        .requestMatchers(mvcMatcherBuilder.pattern("/api/roles/**")).hasRole("ADMIN")
                        // User management endpoints can be accessed by ADMIN and the user themselves
                        // (further logic handled in controller methods with @PreAuthorize)
                        .requestMatchers(mvcMatcherBuilder.pattern("/api/users/**")).hasAnyRole("USER", "ADMIN")
                        // All other requests require authentication
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // Use stateless sessions for JWT
                )
                .authenticationProvider(authenticationProvider()) // Configure the custom authentication provider
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class) // Add JWT filter before Spring's default
                .addFilterBefore(rateLimitInterceptor, JwtAuthenticationFilter.class); // Add rate limit filter before JWT filter

        logger.info("Spring Security configuration loaded. JWT and Rate Limiting filters enabled.");
        return http.build();
    }

    /**
     * Configures the UserDetailsService, which is responsible for loading user-specific
     * data during the authentication process. It retrieves a UserDetails object
     * (our {@link com.authsystem.model.User} entity) from the UserRepository.
     *
     * @return A UserDetailsService implementation.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
    }

    /**
     * Provides the AuthenticationProvider, which authenticates authentication requests.
     * Here, it's a DaoAuthenticationProvider, which uses the UserDetailsService and
     * PasswordEncoder to authenticate against the database.
     *
     * @return An AuthenticationProvider instance.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        logger.info("DaoAuthenticationProvider configured with UserDetailsService and PasswordEncoder.");
        return authProvider;
    }

    /**
     * Provides the AuthenticationManager, which is the main entry point for
     * the Spring Security authentication framework. It delegates authentication
     * to the configured AuthenticationProviders.
     *
     * @param config The AuthenticationConfiguration to get the AuthenticationManager from.
     * @return The AuthenticationManager.
     * @throws Exception If an error occurs retrieving the manager.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Provides a BCryptPasswordEncoder bean for hashing and verifying passwords.
     * BCrypt is a strong, industry-standard password hashing algorithm.
     *
     * @return A BCryptPasswordEncoder instance.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        logger.info("BCryptPasswordEncoder bean initialized.");
        return new BCryptPasswordEncoder();
    }
}