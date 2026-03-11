```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service class for managing user profiles.
 * Provides business logic for retrieving user information.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Retrieves a user's profile by their email address.
     *
     * @param email The email address of the user.
     * @return The UserResponse for the found user.
     * @throws ResourceNotFoundException If no user with the given email is found.
     */
    @Transactional(readOnly = true)
    public UserResponse getUserProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return mapToResponse(user);
    }

    /**
     * Retrieves a user's profile by their ID.
     *
     * @param id The ID of the user.
     * @return The UserResponse for the found user.
     * @throws ResourceNotFoundException If no user with the given ID is found.
     */
    @Transactional(readOnly = true)
    public UserResponse getUserProfileById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        return mapToResponse(user);
    }

    /**
     * Retrieves a list of all registered users.
     *
     * @return A list of UserResponse for all users.
     */
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Helper method to map a User entity to a UserResponse DTO.
     *
     * @param user The User entity.
     * @return The corresponding UserResponse DTO.
     */
    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .roles(user.getRoles())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
```