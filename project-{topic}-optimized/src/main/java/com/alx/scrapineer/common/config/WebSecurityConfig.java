```java
package com.alx.scrapineer.common.config;

import com.alx.scrapineer.common.security.JwtAuthenticationEntryPoint;
import com.alx.scrapineer.common.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.servlet.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.AndRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // Enable method-level security (e.g., @PreAuthorize)
@RequiredArgsConstructor
public class WebSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthenticationProvider authenticationProvider;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for stateless APIs
            .exceptionHandling(exception -> exception.authenticationEntryPoint(jwtAuthenticationEntryPoint)) // Handle unauthorized access
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // Use stateless sessions for JWT
            .authorizeHttpRequests(auth -> auth
                // Public endpoints for authentication and documentation
                .requestMatchers(
                    "/api/auth/**",
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/webjars/**",
                    "/error",
                    "/" // Basic home page
                ).permitAll()
                // All other API endpoints require authentication
                .requestMatchers("/api/**").authenticated()
                // Allow static resources
                .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**").permitAll()
                // Allow actuator endpoints for monitoring (secure in prod!)
                .requestMatchers("/actuator/**").permitAll() // Secure this in production with proper roles
                // Any other request - authenticated
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class); // Add JWT filter before UsernamePasswordAuthenticationFilter

        return http.build();
    }
}
```