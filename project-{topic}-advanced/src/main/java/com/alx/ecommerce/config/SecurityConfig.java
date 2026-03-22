```java
package com.alx.ecommerce.config;

import com.alx.ecommerce.model.User;
import com.alx.ecommerce.repository.UserRepository;
import com.alx.ecommerce.util.RateLimitFilter;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.handler.HandlerMappingIntrospector;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // Enable @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RateLimitFilter rateLimitFilter;
    private final UserRepository userRepository;

    // Define public endpoints, swagger, and actuator paths
    private static final String[] WHITE_LIST_URLS = {
            "/api/v1/auth/**",
            "/api/v1/products", // Allow viewing products without auth
            "/api/v1/products/**", // Allow viewing specific product without auth
            "/api/v1/categories", // Allow viewing categories without auth
            "/swagger-ui/**",
            "/v3/api-docs/**",
            "/actuator/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, HandlerMappingIntrospector introspector) throws Exception {
        MvcRequestMatcher.Builder mvcMatcherBuilder = new MvcRequestMatcher.Builder(introspector);

        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                // Allow specific paths without authentication
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/auth/**")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/products")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/products/**")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/categories")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/categories/**")).permitAll() // Allow viewing categories
                .requestMatchers(mvcMatcherBuilder.pattern("/swagger-ui/**")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/v3/api-docs/**")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/actuator/**")).permitAll()

                // Admin-only endpoints
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/admin/**")).hasAuthority(User.Role.ADMIN.name())
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/users/**")).hasAuthority(User.Role.ADMIN.name())
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/categories")).hasAuthority(User.Role.ADMIN.name()) // Only admin can create categories
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/categories/**")).hasAuthority(User.Role.ADMIN.name()) // Only admin can modify categories
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/products")).hasAuthority(User.Role.ADMIN.name()) // Only admin can create products
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/products/**")).hasAuthority(User.Role.ADMIN.name()) // Only admin can modify products
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/orders")).hasAnyAuthority(User.Role.ADMIN.name(), User.Role.CUSTOMER.name())
                .requestMatchers(mvcMatcherBuilder.pattern("/api/v1/orders/**")).hasAnyAuthority(User.Role.ADMIN.name(), User.Role.CUSTOMER.name())


                // All other requests require authentication
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class) // Apply rate limiting
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username) // Allow login with email too
                        .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + username)));
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```