package com.alx.auth.system.config;

import com.alx.auth.system.data.repository.UserRepository;
import com.alx.auth.system.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Global application configuration class for defining core beans
 * that are shared across the application, particularly for security contexts.
 *
 * @RequiredArgsConstructor: Lombok annotation to generate a constructor with required arguments (final fields).
 */
@Configuration
@RequiredArgsConstructor
public class ApplicationConfig {

    private final UserRepository userRepository;

    /**
     * Defines the UserDetailsService bean. This service is responsible for loading user-specific data
     * during the authentication process.
     *
     * @return An implementation of UserDetailsService that loads user details from the UserRepository.
     * @throws UserNotFoundException if the user is not found in the database.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userRepository.findByEmail(username)
                .orElseThrow(() -> new UserNotFoundException("User with email " + username + " not found."));
    }

    /**
     * Defines the AuthenticationProvider bean. This provider is used by the AuthenticationManager
     * to authenticate users. It is configured with a UserDetailsService and a PasswordEncoder.
     *
     * @return A DaoAuthenticationProvider instance.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Defines the AuthenticationManager bean. This manager handles the authentication requests
     * and coordinates with the AuthenticationProvider.
     *
     * @param config The AuthenticationConfiguration injected by Spring.
     * @return The AuthenticationManager instance.
     * @throws Exception if there's an issue getting the AuthenticationManager.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Defines the PasswordEncoder bean. BCryptPasswordEncoder is recommended for strong password hashing.
     *
     * @return A BCryptPasswordEncoder instance.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}