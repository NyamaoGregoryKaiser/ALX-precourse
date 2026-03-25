```java
package com.alx.dataviz.service;

import com.alx.dataviz.dto.UserDto;
import com.alx.dataviz.exception.ResourceNotFoundException;
import com.alx.dataviz.exception.UnauthorizedException;
import com.alx.dataviz.model.Role;
import com.alx.dataviz.model.User;
import com.alx.dataviz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ModelMapper modelMapper;

    @Transactional
    public UserDto registerNewUser(UserDto userDto) {
        if (userRepository.existsByUsername(userDto.getUsername())) {
            throw new IllegalArgumentException("Username already taken: " + userDto.getUsername());
        }
        if (userRepository.existsByEmail(userDto.getEmail())) {
            throw new IllegalArgumentException("Email already in use: " + userDto.getEmail());
        }

        User user = modelMapper.map(userDto, User.class);
        user.setPassword(passwordEncoder.encode(userDto.getPassword()));
        // Default role for new users
        user.setRoles(Collections.singleton(Role.USER));

        User savedUser = userRepository.save(user);
        log.info("Registered new user: {}", savedUser.getUsername());
        return modelMapper.map(savedUser, UserDto.class);
    }

    @Cacheable(value = "users", key = "#id")
    public UserDto getUserById(Long id) {
        log.debug("Fetching user by ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return modelMapper.map(user, UserDto.class);
    }

    public Optional<User> findUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Page<UserDto> getAllUsers(Pageable pageable) {
        log.debug("Fetching all users, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        return userRepository.findAll(pageable)
                .map(user -> modelMapper.map(user, UserDto.class));
    }

    @Transactional
    @CacheEvict(value = "users", key = "#id")
    public UserDto updateUser(Long id, UserDto userDto) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // Check if the authenticated user is authorized to update this user
        if (!isAuthorized(existingUser.getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to update this user.");
        }

        if (!existingUser.getUsername().equals(userDto.getUsername()) && userRepository.existsByUsername(userDto.getUsername())) {
            throw new IllegalArgumentException("Username already taken: " + userDto.getUsername());
        }
        if (!existingUser.getEmail().equals(userDto.getEmail()) && userRepository.existsByEmail(userDto.getEmail())) {
            throw new IllegalArgumentException("Email already in use: " + userDto.getEmail());
        }

        existingUser.setUsername(userDto.getUsername());
        existingUser.setEmail(userDto.getEmail());
        if (userDto.getPassword() != null && !userDto.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(userDto.getPassword()));
        }
        if (userDto.getRoles() != null && !userDto.getRoles().isEmpty()) {
            // Only admins can change roles
            if (!isAuthorized(null, Role.ADMIN)) {
                throw new UnauthorizedException("Only administrators can modify user roles.");
            }
            existingUser.setRoles(userDto.getRoles());
        }

        User updatedUser = userRepository.save(existingUser);
        log.info("Updated user: {}", updatedUser.getUsername());
        return modelMapper.map(updatedUser, UserDto.class);
    }

    @Transactional
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (!isAuthorized(existingUser.getUsername(), Role.ADMIN)) {
            throw new UnauthorizedException("You are not authorized to delete this user.");
        }

        userRepository.delete(existingUser);
        log.info("Deleted user with ID: {}", id);
    }

    /**
     * Checks if the currently authenticated user is authorized to perform an action.
     * An action is authorized if:
     * 1. The authenticated user has the ADMIN role.
     * 2. The authenticated user is the owner of the resource (username matches).
     *
     * @param resourceOwnerUsername The username of the resource owner. Can be null if only ADMIN role is required.
     * @param requiredRole If provided, checks if the user has this role (e.g., ADMIN).
     * @return true if authorized, false otherwise.
     */
    private boolean isAuthorized(String resourceOwnerUsername, Role requiredRole) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (!(principal instanceof UserDetails)) {
            return false; // Not authenticated or anonymous user
        }

        UserDetails currentUser = (UserDetails) principal;
        Set<Role> currentRoles = currentUser.getAuthorities().stream()
                .map(grantedAuthority -> Role.valueOf(grantedAuthority.getAuthority().substring("ROLE_".length())))
                .collect(Collectors.toSet());

        // Check for ADMIN role
        if (currentRoles.contains(Role.ADMIN)) {
            return true;
        }

        // Check if the current user is the resource owner
        if (resourceOwnerUsername != null && currentUser.getUsername().equals(resourceOwnerUsername)) {
            return true;
        }

        // Check for specific required role if not admin or owner
        if (requiredRole != null && currentRoles.contains(requiredRole)) {
            return true;
        }

        return false;
    }

    // Overload for simpler calls where only owner check is needed
    private boolean isAuthorized(String resourceOwnerUsername) {
        return isAuthorized(resourceOwnerUsername, null);
    }
}
```