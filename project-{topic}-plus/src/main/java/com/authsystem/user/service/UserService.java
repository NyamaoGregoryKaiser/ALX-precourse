package com.authsystem.user.service;

import com.authsystem.common.exception.ResourceNotFoundException;
import com.authsystem.common.exception.ValidationException;
import com.authsystem.model.Role;
import com.authsystem.model.User;
import com.authsystem.repository.RoleRepository;
import com.authsystem.repository.UserRepository;
import com.authsystem.user.dto.CreateUserRequest;
import com.authsystem.user.dto.UpdateUserRequest;
import com.authsystem.user.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import static com.authsystem.config.CachingConfig.USERS_CACHE;

/**
 * Service class for managing user-related business logic.
 * This includes CRUD operations for users, role assignment, and data validation.
 * It interacts with {@link UserRepository} and {@link RoleRepository}.
 *
 * {@code @RequiredArgsConstructor} generates a constructor for final fields,
 * allowing for constructor injection of dependencies.
 *
 * Caching annotations ({@code @Cacheable}, {@code @CachePut}, {@code @CacheEvict})
 * are used to improve performance for frequently accessed user data.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Retrieves a user by their ID.
     * The result of this method is cached to reduce database hits for repeated lookups.
     *
     * @param id The ID of the user to retrieve.
     * @return The {@link UserDto} representing the found user.
     * @throws ResourceNotFoundException If no user is found with the given ID.
     */
    @Cacheable(value = USERS_CACHE, key = "#id")
    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        logger.debug("Fetching user with ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        logger.info("Found user with ID: {}", id);
        return UserDto.fromEntity(user);
    }

    /**
     * Retrieves all users with pagination.
     *
     * @param pageable The {@link Pageable} object for pagination information.
     * @return A {@link Page} of {@link UserDto} objects.
     */
    @Transactional(readOnly = true)
    public Page<UserDto> getAllUsers(Pageable pageable) {
        logger.debug("Fetching all users with page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<User> usersPage = userRepository.findAll(pageable);
        logger.info("Fetched {} users from page {}", usersPage.getNumberOfElements(), pageable.getPageNumber());
        return usersPage.map(UserDto::fromEntity);
    }

    /**
     * Creates a new user in the system.
     * This method is typically used by administrators to add new users with specified roles.
     *
     * 1. Validates for duplicate username or email.
     * 2. Encodes the provided password.
     * 3. Assigns roles based on the provided role names.
     * 4. Saves the new user.
     *
     * @param request The {@link CreateUserRequest} containing details for the new user.
     * @return The {@link UserDto} of the newly created user.
     * @throws ValidationException If username/email already exists or roles are invalid.
     * @throws ResourceNotFoundException If a specified role name does not exist.
     */
    @Transactional
    @CacheEvict(value = USERS_CACHE, allEntries = true) // Clear cache when new user is created
    public UserDto createUser(CreateUserRequest request) {
        logger.info("Creating new user with username: {}", request.getUsername());

        // Validate uniqueness
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ValidationException("Username '" + request.getUsername() + "' is already taken.", "username_taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ValidationException("Email '" + request.getEmail() + "' is already registered.", "email_taken");
        }

        // Find and assign roles
        Set<Role> roles = new HashSet<>();
        if (request.getRoleNames() != null && !request.getRoleNames().isEmpty()) {
            roles = request.getRoleNames().stream()
                    .map(roleName -> roleRepository.findByName(roleName)
                            .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName, "role_not_found")))
                    .collect(Collectors.toSet());
        } else {
            // Assign default role if none provided for admin user creation? Or disallow?
            // For now, if no roles, user might be created without roles, can be updated later.
            // Consider enforcing at least ROLE_USER for admin creation context.
            logger.warn("No roles provided for new user {}. User will be created without roles.", request.getUsername());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .enabled(request.isEnabled())
                .accountNonExpired(request.isAccountNonExpired())
                .accountNonLocked(request.isAccountNonLocked())
                .credentialsNonExpired(request.isCredentialsNonExpired())
                .roles(roles)
                .build();

        User savedUser = userRepository.save(user);
        logger.info("User '{}' created successfully with ID: {}", savedUser.getUsername(), savedUser.getId());
        return UserDto.fromEntity(savedUser);
    }

    /**
     * Updates an existing user's details.
     * This method supports partial updates (only fields present in the request are updated).
     *
     * @param id The ID of the user to update.
     * @param request The {@link UpdateUserRequest} containing updated user details.
     * @return The {@link UserDto} of the updated user.
     * @throws ResourceNotFoundException If no user is found with the given ID or if a role name is invalid.
     * @throws ValidationException If the updated username/email already exists.
     */
    @Transactional
    @CachePut(value = USERS_CACHE, key = "#id") // Update cache entry after modification
    public UserDto updateUser(Long id, UpdateUserRequest request) {
        logger.info("Updating user with ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        // Update fields if provided in the request
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new ValidationException("Username '" + request.getUsername() + "' is already taken.", "username_taken");
            }
            user.setUsername(request.getUsername());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new ValidationException("Email '" + request.getEmail() + "' is already registered.", "email_taken");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            logger.debug("User {} password updated.", user.getUsername());
        }

        // Update account status flags
        if (request.getEnabled() != null) user.setEnabled(request.getEnabled());
        if (request.getAccountNonExpired() != null) user.setAccountNonExpired(request.getAccountNonExpired());
        if (request.getAccountNonLocked() != null) user.setAccountNonLocked(request.getAccountNonLocked());
        if (request.getCredentialsNonExpired() != null) user.setCredentialsNonExpired(request.getCredentialsNonExpired());

        // Update roles if provided
        if (request.getRoleNames() != null) {
            Set<Role> newRoles = request.getRoleNames().stream()
                    .map(roleName -> roleRepository.findByName(roleName)
                            .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName, "role_not_found")))
                    .collect(Collectors.toSet());
            user.setRoles(newRoles);
            logger.debug("User {} roles updated to: {}", user.getUsername(), request.getRoleNames());
        }

        User updatedUser = userRepository.save(user);
        logger.info("User with ID: {} updated successfully.", id);
        return UserDto.fromEntity(updatedUser);
    }

    /**
     * Deletes a user by their ID.
     * The cache entry for the deleted user is evicted.
     *
     * @param id The ID of the user to delete.
     * @throws ResourceNotFoundException If no user is found with the given ID.
     */
    @Transactional
    @CacheEvict(value = USERS_CACHE, key = "#id") // Evict cache entry when user is deleted
    public void deleteUser(Long id) {
        logger.info("Deleting user with ID: {}", id);
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with ID: " + id);
        }
        userRepository.deleteById(id);
        logger.info("User with ID: {} deleted successfully.", id);
    }
}