```java
package com.alx.pms.user.service;

import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.exception.ValidationException;
import com.alx.pms.model.User;
import com.alx.pms.user.dto.UserResponse;
import com.alx.pms.user.dto.UserUpdateRequest;
import com.alx.pms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#username") // Cache user details by username
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.debug("Attempting to load user by username: {}", username);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("User not found: {}", username);
                    return new UsernameNotFoundException("User not found: " + username);
                });
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#id") // Cache user by ID
    public UserResponse getUserById(Long id) {
        log.debug("Fetching user by ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("User not found with ID: {}", id);
                    return new ResourceNotFoundException("User not found with ID: " + id);
                });
        return convertToDto(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        log.debug("Fetching all users.");
        return userRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    @CachePut(value = "users", key = "#id") // Update cache after user update
    @CacheEvict(value = "users", key = "#result.username", condition = "#result.username != null") // Invalidate old username cache if username changed
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        log.info("Updating user with ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("User not found for update with ID: {}", id);
                    return new ResourceNotFoundException("User not found with ID: " + id);
                });

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new ValidationException("Username is already taken");
            }
            user.setUsername(request.getUsername());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new ValidationException("Email is already registered");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = userRepository.save(user);
        log.info("User with ID {} updated successfully.", id);
        return convertToDto(updatedUser);
    }

    @Transactional
    @CacheEvict(value = "users", key = "#id") // Evict user from cache on deletion
    public void deleteUser(Long id) {
        log.info("Attempting to delete user with ID: {}", id);
        if (!userRepository.existsById(id)) {
            log.warn("User not found for deletion with ID: {}", id);
            throw new ResourceNotFoundException("User not found with ID: " + id);
        }
        userRepository.deleteById(id);
        log.info("User with ID {} deleted successfully.", id);
    }

    public UserResponse convertToDto(User user) {
        UserResponse dto = new UserResponse();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRoles(user.getRoles());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        return dto;
    }

    // Helper method to retrieve User entity for other services without DTO conversion
    @Transactional(readOnly = true)
    public User findUserEntityById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
    }
}
```