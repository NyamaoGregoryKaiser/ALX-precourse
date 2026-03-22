package com.alx.auth.system.service;

import com.alx.auth.system.data.dto.UpdateUserRequest;
import com.alx.auth.system.data.dto.UserResponse;
import com.alx.auth.system.data.entity.User;
import com.alx.auth.system.data.repository.UserRepository;
import com.alx.auth.system.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service class for managing user-related business logic, such as retrieving, updating, and deleting users.
 * This class handles the interactions with the UserRepository and performs necessary data transformations.
 *
 * @RequiredArgsConstructor: Lombok annotation to generate a constructor with required arguments (final fields).
 * @Slf4j: Lombok annotation to generate an SLF4J logger field.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Retrieves a user by their email address and maps it to a UserResponse DTO.
     *
     * @param email The email address of the user.
     * @return The UserResponse DTO.
     * @throws UserNotFoundException if no user is found with the given email.
     */
    public UserResponse findUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("User with email {} not found.", email);
                    return new UserNotFoundException("User with email " + email + " not found.");
                });
        return mapToUserResponse(user);
    }

    /**
     * Retrieves a user by their ID and maps it to a UserResponse DTO.
     * (Accessible by ADMINs only in UserController)
     *
     * @param id The ID of the user.
     * @return The UserResponse DTO.
     * @throws UserNotFoundException if no user is found with the given ID.
     */
    public UserResponse findUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("User with ID {} not found.", id);
                    return new UserNotFoundException("User with ID " + id + " not found.");
                });
        return mapToUserResponse(user);
    }

    /**
     * Retrieves all users and maps them to a list of UserResponse DTOs.
     * (Accessible by ADMINs only in UserController)
     *
     * @return A list of UserResponse DTOs.
     */
    public List<UserResponse> findAllUsers() {
        log.debug("Fetching all users.");
        return userRepository.findAll()
                .stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing user's information.
     *
     * @param email The email of the user to update.
     * @param request The UpdateUserRequest containing the fields to update.
     * @return The updated UserResponse DTO.
     * @throws UserNotFoundException if no user is found with the given email.
     */
    @Transactional
    public UserResponse updateUser(String email, UpdateUserRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Attempted to update non-existent user with email: {}", email);
                    return new UserNotFoundException("User with email " + email + " not found.");
                });

        boolean changed = false;
        if (request.getFirstname() != null && !request.getFirstname().isBlank()) {
            if (!request.getFirstname().equals(user.getFirstname())) {
                user.setFirstname(request.getFirstname());
                changed = true;
            }
        }
        if (request.getLastname() != null && !request.getLastname().isBlank()) {
            if (!request.getLastname().equals(user.getLastname())) {
                user.setLastname(request.getLastname());
                changed = true;
            }
        }
        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            // Only update if the new password is different after encoding, or if it's the first password
            if (!passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
                user.setPassword(passwordEncoder.encode(request.getNewPassword()));
                changed = true;
            }
        }

        if (changed) {
            User updatedUser = userRepository.save(user);
            log.info("User {} profile updated successfully.", email);
            return mapToUserResponse(updatedUser);
        } else {
            log.info("No changes detected for user {} profile update.", email);
            return mapToUserResponse(user); // Return existing user if no changes were made
        }
    }

    /**
     * Deletes a user by their ID.
     * (Accessible by ADMINs only in UserController)
     *
     * @param id The ID of the user to delete.
     * @throws UserNotFoundException if no user is found with the given ID.
     */
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            log.warn("Attempted to delete non-existent user with ID: {}", id);
            throw new UserNotFoundException("User with ID " + id + " not found.");
        }
        userRepository.deleteById(id);
        log.info("User with ID {} deleted successfully.", id);
    }

    /**
     * Helper method to map a User entity to a UserResponse DTO.
     *
     * @param user The User entity.
     * @return The corresponding UserResponse DTO.
     */
    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstname(user.getFirstname())
                .lastname(user.getLastname())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}