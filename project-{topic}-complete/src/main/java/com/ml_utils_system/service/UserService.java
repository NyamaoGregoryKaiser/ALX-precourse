```java
package com.ml_utils_system.service;

import com.ml_utils_system.dto.UserDto;
import com.ml_utils_system.exception.ResourceNotFoundException;
import com.ml_utils_system.model.User;
import com.ml_utils_system.repository.UserRepository;
import com.ml_utils_system.util.CustomLogger;
import org.slf4j.Logger;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

/**
 * Service class for managing user information.
 * Provides administrative functionalities for user management (e.g., getting user details).
 */
@Service
public class UserService {

    private static final Logger logger = CustomLogger.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    /**
     * Retrieves a user by their ID. The result is cached.
     *
     * @param id The ID of the user.
     * @return The UserDto.
     * @throws ResourceNotFoundException If the user is not found.
     */
    @Cacheable(value = "users", key = "#id")
    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        logger.debug("Fetching user with ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("User not found with ID: {}", id);
                    return new ResourceNotFoundException("User not found with ID: " + id);
                });
        logger.debug("User with ID {} retrieved successfully.", id);
        return convertToDto(user);
    }

    /**
     * Retrieves all users, with pagination support. The results are cached.
     *
     * @param pageable Pagination information.
     * @return A Page of UserDto.
     */
    @Cacheable(value = "users", key = "'allUsers-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort")
    @Transactional(readOnly = true)
    public Page<UserDto> getAllUsers(Pageable pageable) {
        logger.debug("Fetching all users for page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<User> users = userRepository.findAll(pageable);
        return users.map(this::convertToDto);
    }

    /**
     * Updates an existing user's details (excluding password and roles directly).
     * The cache for this user is updated.
     *
     * @param id The ID of the user to update.
     * @param userDto The DTO containing updated user information (username, email).
     * @return The updated UserDto.
     * @throws ResourceNotFoundException If the user is not found.
     */
    @CachePut(value = "users", key = "#id")
    @Transactional
    public UserDto updateUser(Long id, UserDto userDto) {
        logger.info("Attempting to update user with ID: {}", id);
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("User update failed: User not found with ID: {}", id);
                    return new ResourceNotFoundException("User not found with ID: " + id);
                });

        // Update fields that are allowed to be updated through this method
        existingUser.setUsername(userDto.getUsername());
        existingUser.setEmail(userDto.getEmail());
        // Password and roles are managed via separate methods for security

        User updatedUser = userRepository.save(existingUser);
        logger.info("User with ID {} updated successfully.", id);
        return convertToDto(updatedUser);
    }

    /**
     * Deletes a user by their ID and evicts them from the cache.
     *
     * @param id The ID of the user to delete.
     * @throws ResourceNotFoundException If the user is not found.
     */
    @CacheEvict(value = "users", key = "#id")
    @Transactional
    public void deleteUser(Long id) {
        logger.info("Attempting to delete user with ID: {}", id);
        if (!userRepository.existsById(id)) {
            logger.warn("User deletion failed: User not found with ID: {}", id);
            throw new ResourceNotFoundException("User not found with ID: " + id);
        }
        userRepository.deleteById(id);
        logger.info("User with ID {} deleted successfully.", id);
    }

    /**
     * Converts a {@link User} entity to a {@link UserDto}.
     *
     * @param user The User entity.
     * @return The corresponding UserDto.
     */
    private UserDto convertToDto(User user) {
        UserDto dto = new UserDto();
        BeanUtils.copyProperties(user, dto, "password", "roles"); // Exclude password from DTO
        dto.setRoles(user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet()));
        return dto;
    }
}
```