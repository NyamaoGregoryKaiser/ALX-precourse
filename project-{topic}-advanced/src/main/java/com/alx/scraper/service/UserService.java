package com.alx.scraper.service;

import com.alx.scraper.dto.UserDTO;
import com.alx.scraper.exception.ConflictException;
import com.alx.scraper.model.User;
import com.alx.scraper.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service layer for managing user-related operations, such as registration.
 *
 * ALX Focus: Encapsulating business logic for user management.
 * Demonstrates:
 * - Data validation (checking for existing usernames).
 * - Secure password handling (hashing).
 * - Assigning default roles.
 * - Transactional integrity (`@Transactional`).
 */
@Service
@Slf4j
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Registers a new user with the provided credentials.
     * Encodes the password and assigns a default "ROLE_USER".
     *
     * @param userDTO The {@link UserDTO} containing username and password.
     * @return The created {@link User} entity.
     * @throws ConflictException If a user with the same username already exists.
     */
    @Transactional
    public User registerNewUser(UserDTO userDTO) {
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            log.warn("Attempt to register with existing username: {}", userDTO.getUsername());
            throw new ConflictException("Username is already taken!");
        }

        User user = new User();
        user.setUsername(userDTO.getUsername());
        user.setPassword(passwordEncoder.encode(userDTO.getPassword())); // Hash the password
        user.addRole("ROLE_USER"); // Assign a default role

        User savedUser = userRepository.save(user);
        log.info("User registered successfully: {}", savedUser.getUsername());
        return savedUser;
    }
}