```java
package com.alx.taskmgr.config;

import com.alx.taskmgr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Centralized application configuration for security-related beans.
 * This includes UserDetailsService, AuthenticationProvider, AuthenticationManager, and PasswordEncoder.
 */
@Configuration
@RequiredArgsConstructor
public class ApplicationConfig {

    private final UserRepository userRepository;

    /**
     * Defines a UserDetailsService bean that loads user details from the database.
     * This is crucial for Spring Security to retrieve user information for authentication.
     *
     * @return UserDetailsService implementation.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));
    }

    /**
     * Defines an AuthenticationProvider bean that uses DaoAuthenticationProvider.
     * It combines the UserDetailsService and PasswordEncoder to authenticate users.
     *
     * @return Configured AuthenticationProvider.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Defines an AuthenticationManager bean. This manager is responsible for authenticating
     * the incoming authentication requests.
     *
     * @param config The AuthenticationConfiguration.
     * @return The AuthenticationManager instance.
     * @throws Exception if there's an error getting the AuthenticationManager.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Defines a PasswordEncoder bean using BCrypt algorithm.
     * BCrypt is a strong hashing algorithm recommended for storing passwords securely.
     *
     * @return The BCryptPasswordEncoder instance.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```