package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.user.UserCreateRequest;
import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for managing user operations.
 * Implements UserDetailsService for Spring Security integration.
 */
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // In a real application, roles would be managed by a separate RoleRepository
    // For simplicity, we'll hardcode them or manage them in the User Service itself during initialization.
    // This is a simplification; ideally, roles would be fetched from a dedicated 'Role' entity/repository.
    private final Set<Role> availableRoles = new HashSet<>();

    @PostConstruct
    public void initRoles() {
        // Initialize basic roles. In a real application, these might be pre-seeded in the DB.
        Role userRole = new Role();
        userRole.setId(1L); // Assuming ID 1 for USER
        userRole.setName("ROLE_USER");

        Role adminRole = new Role();
        adminRole.setId(2L); // Assuming ID 2 for ADMIN
        adminRole.setName("ROLE_ADMIN");

        availableRoles.add(userRole);
        availableRoles.add(adminRole);
    }

    /**
     * Loads a user by username for Spring Security.
     * @param username The username of the user to load.
     * @return UserDetails object.
     * @throws UsernameNotFoundException if the user is not found.
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found with username: " + username));

        // Convert custom User entity to Spring Security UserDetails
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.getRoles().stream()
                        .map(role -> new org.springframework.security.core.authority.SimpleGrantedAuthority(role.getName()))
                        .collect(Collectors.toList())
        );
    }

    /**
     * Registers a new user with default ROLE_USER.
     * @param request UserCreateRequest DTO.
     * @return UserResponse DTO of the created user.
     * @throws IllegalArgumentException if username or email already exists.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "users", allEntries = true),
            @CacheEvict(value = "userById", key = "#result.id")
    })
    public UserResponse registerUser(UserCreateRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username is already taken!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use!");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Assign default role: USER
        Optional<Role> userRole = availableRoles.stream()
                .filter(role -> role.getName().equals("ROLE_USER"))
                .findFirst();

        if (userRole.isEmpty()) {
            throw new IllegalStateException("Default USER role not found. System configuration error.");
        }
        user.getRoles().add(userRole.get());

        User savedUser = userRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    /**
     * Retrieves a user by ID.
     * @param id The ID of the user.
     * @return UserResponse DTO.
     * @throws ResourceNotFoundException if the user is not found.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "userById", key = "#id")
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToUserResponse(user);
    }

    /**
     * Retrieves a user by username.
     * @param username The username of the user.
     * @return User entity.
     * @throws ResourceNotFoundException if the user is not found.
     */
    @Transactional(readOnly = true)
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    /**
     * Retrieves all users.
     * @return List of UserResponse DTOs.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "users")
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Deletes a user by ID.
     * @param id The ID of the user to delete.
     * @throws ResourceNotFoundException if the user is not found.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "users", allEntries = true),
            @CacheEvict(value = "userById", key = "#id")
    })
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    /**
     * Maps a User entity to a UserResponse DTO.
     * @param user The User entity.
     * @return UserResponse DTO.
     */
    private UserResponse mapToUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }
}