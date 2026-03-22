```java
package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.UserDTOs;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.mapper.UserMapper;
import com.alx.ecommerce.model.User;
import com.alx.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Cacheable(value = "users", key = "#id")
    public UserDTOs.UserResponse getUserById(UUID id) {
        log.debug("Fetching user by ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return userMapper.toUserResponse(user);
    }

    @Cacheable(value = "users", key = "#username")
    public UserDTOs.UserResponse getUserByUsername(String username) {
        log.debug("Fetching user by username: {}", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        return userMapper.toUserResponse(user);
    }

    @Cacheable(value = "allUsers")
    @PreAuthorize("hasAuthority('ADMIN')")
    public List<UserDTOs.UserResponse> getAllUsers() {
        log.debug("Fetching all users.");
        return userRepository.findAll().stream()
                .map(userMapper::toUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = {"users", "allUsers"}, allEntries = true) // Evict specific user and allUsers cache
    public UserDTOs.UserResponse updateUser(UUID id, UserDTOs.UpdateUserRequest request) {
        log.info("Updating user with ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        // Use MapStruct for partial updates, handling nulls gracefully
        userMapper.updateUserFromDto(request, user);

        // Explicitly handle role update if present and authorized (example logic, actual role update might be more restricted)
        if (request.getRole() != null && user.getRole() != request.getRole()) {
            // Further checks could be added here, e.g., only ADMIN can change roles
            user.setRole(request.getRole());
            log.info("Role updated for user {}: {}", user.getUsername(), request.getRole());
        }

        // Check for unique constraints if username/email are changed
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername()) && userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username '" + request.getUsername() + "' is already taken.");
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email '" + request.getEmail() + "' is already taken.");
        }

        User updatedUser = userRepository.save(user);
        log.info("User {} updated successfully.", updatedUser.getUsername());
        return userMapper.toUserResponse(updatedUser);
    }

    @Transactional
    @CacheEvict(value = {"users", "allUsers"}, allEntries = true)
    @PreAuthorize("hasAuthority('ADMIN')")
    public void deleteUser(UUID id) {
        log.info("Deleting user with ID: {}", id);
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        userRepository.deleteById(id);
        log.info("User with ID {} deleted successfully.", id);
    }
}
```