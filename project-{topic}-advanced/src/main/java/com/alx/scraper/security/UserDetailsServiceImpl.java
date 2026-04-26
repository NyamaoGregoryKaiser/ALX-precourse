package com.alx.scraper.security;

import com.alx.scraper.model.User;
import com.alx.scraper.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.stream.Collectors;

/**
 * Custom implementation of Spring Security's {@link UserDetailsService}.
 * This service is responsible for loading user-specific data from the database
 * during the authentication process.
 *
 * ALX Focus: Essential component for integrating custom user storage with Spring Security.
 * Demonstrates converting application-specific user roles into Spring Security's
 * `GrantedAuthority` objects.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Loads a user by their username. This method is called by Spring Security
     * during authentication to retrieve user details.
     *
     * @param username The username of the user to load.
     * @return A {@link UserDetails} object containing the user's username, password, and authorities.
     * @throws UsernameNotFoundException If a user with the specified username is not found.
     */
    @Override
    @Transactional // Ensures the user entity and its roles are loaded within a transaction
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found with username: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(), // Hashed password
                mapRolesToAuthorities(user.getRoles()));
    }

    /**
     * Converts a collection of role strings into a collection of Spring Security's
     * {@link GrantedAuthority} objects.
     *
     * @param roles The collection of role strings (e.g., "ROLE_USER").
     * @return A collection of {@link GrantedAuthority}.
     */
    private Collection<? extends GrantedAuthority> mapRolesToAuthorities(Collection<String> roles) {
        return roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }
}