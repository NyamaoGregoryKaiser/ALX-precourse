package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.user.UserResponse;
import com.alx.ecommerce.dto.user.UserUpdateRequest;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.model.User;
import com.alx.ecommerce.repository.UserRepository;
import com.alx.ecommerce.util.AppConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for managing user information.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Retrieves all users with pagination and sorting.
     *
     * @param pageNo   Page number.
     * @param pageSize Page size.
     * @param sortBy   Field to sort by.
     * @param sortDir  Sort direction (asc/desc).
     * @return A page of user response DTOs.
     */
    @Cacheable(AppConstants.USERS_CACHE) // Cache all users
    public Page<UserResponse> getAllUsers(int pageNo, int pageSize, String sortBy, String sortDir) {
        log.debug("Fetching all users with pageNo: {}, pageSize: {}, sortBy: {}, sortDir: {}", pageNo, pageSize, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(pageNo, pageSize, sort);
        Page<User> users = userRepository.findAll(pageable);
        return users.map(this::mapToUserResponse);
    }

    /**
     * Retrieves a user by their ID.
     *
     * @param id The ID of the user.
     * @return The found user response DTO.
     * @throws ResourceNotFoundException if the user is not found.
     */
    @Cacheable(value = AppConstants.USER_BY_ID_CACHE, key = "#id") // Cache individual user by ID
    public UserResponse getUserById(Long id) {
        log.debug("Fetching user by ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("User not found with ID: {}", id);
                    return new ResourceNotFoundException("User", "id", id);
                });
        return mapToUserResponse(user);
    }

    /**
     * Updates an existing user's information.
     *
     * @param id          The ID of the user to update.
     * @param updateRequest The updated user details DTO.
     * @return The updated user response DTO.
     * @throws ResourceNotFoundException if the user is not found.
     * @throws IllegalArgumentException  if updated username or email already exists for another user.
     */
    @Transactional
    @CachePut(value = AppConstants.USER_BY_ID_CACHE, key = "#id") // Update cache for specific user
    @CacheEvict(value = AppConstants.USERS_CACHE, allEntries = true) // Clear all users cache as list might change
    public UserResponse updateUser(Long id, UserUpdateRequest updateRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("User update failed: User not found with ID: {}", id);
                    return new ResourceNotFoundException("User", "id", id);
                });

        if (updateRequest.getUsername() != null && !updateRequest.getUsername().equals(user.getUsername()) && userRepository.existsByUsername(updateRequest.getUsername())) {
            log.warn("User update failed: Username '{}' already exists for ID: {}.", updateRequest.getUsername(), id);
            throw new IllegalArgumentException("Username '" + updateRequest.getUsername() + "' is already taken.");
        }
        if (updateRequest.getEmail() != null && !updateRequest.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(updateRequest.getEmail())) {
            log.warn("User update failed: Email '{}' already exists for ID: {}.", updateRequest.getEmail(), id);
            throw new IllegalArgumentException("Email '" + updateRequest.getEmail() + "' is already taken.");
        }

        if (updateRequest.getFirstName() != null) user.setFirstName(updateRequest.getFirstName());
        if (updateRequest.getLastName() != null) user.setLastName(updateRequest.getLastName());
        if (updateRequest.getUsername() != null) user.setUsername(updateRequest.getUsername());
        if (updateRequest.getEmail() != null) user.setEmail(updateRequest.getEmail());
        if (updateRequest.getAddress() != null) user.setAddress(updateRequest.getAddress());
        if (updateRequest.getPhoneNumber() != null) user.setPhoneNumber(updateRequest.getPhoneNumber());
        if (updateRequest.getPassword() != null) user.setPassword(passwordEncoder.encode(updateRequest.getPassword()));

        log.info("Updating user with ID: {}", id);
        User updatedUser = userRepository.save(user);
        return mapToUserResponse(updatedUser);
    }

    /**
     * Deletes a user by their ID.
     *
     * @param id The ID of the user to delete.
     * @throws ResourceNotFoundException if the user is not found.
     */
    @Transactional
    @CacheEvict(value = {AppConstants.USERS_CACHE, AppConstants.USER_BY_ID_CACHE}, key = "#id") // Clear user from caches
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("User deletion failed: User not found with ID: {}", id);
                    return new ResourceNotFoundException("User", "id", id);
                });
        log.info("Deleting user with ID: {}", id);
        userRepository.delete(user);
    }

    /**
     * Maps a User entity to a UserResponse DTO.
     *
     * @param user The User entity.
     * @return The corresponding UserResponse DTO.
     */
    private UserResponse mapToUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setAddress(user.getAddress());
        response.setPhoneNumber(user.getPhoneNumber());
        Set<String> roles = user.getRoles().stream().map(role -> role.getName()).collect(Collectors.toSet());
        response.setRoles(roles);
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }
}