```java
package com.alx.vizflow.service;

import com.alx.vizflow.dto.UserRegistrationRequest;
import com.alx.vizflow.exception.ResourceNotFoundException;
import com.alx.vizflow.exception.UserAlreadyExistsException;
import com.alx.vizflow.model.Role;
import com.alx.vizflow.model.User;
import com.alx.vizflow.repository.RoleRepository;
import com.alx.vizflow.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @CacheEvict(value = "users", allEntries = true)
    public User registerNewUser(UserRegistrationRequest registrationRequest) {
        if (userRepository.existsByUsername(registrationRequest.getUsername())) {
            throw new UserAlreadyExistsException("Username " + registrationRequest.getUsername() + " already taken.");
        }
        if (userRepository.existsByEmail(registrationRequest.getEmail())) {
            throw new UserAlreadyExistsException("Email " + registrationRequest.getEmail() + " already registered.");
        }

        User user = new User();
        user.setUsername(registrationRequest.getUsername());
        user.setEmail(registrationRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registrationRequest.getPassword()));

        // Assign default role (e.g., ROLE_USER)
        Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER)
                                      .orElseThrow(() -> new ResourceNotFoundException("Default user role not found. Please contact administrator."));
        user.setRoles(new HashSet<>(Collections.singletonList(userRole)));

        return userRepository.save(user);
    }

    @Cacheable(value = "users", key = "#id")
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Cacheable(value = "users", key = "#username")
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @CacheEvict(value = "users", allEntries = true) // Invalidate cache on update
    public User updateUser(Long id, UserRegistrationRequest updateRequest) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (!existingUser.getUsername().equals(updateRequest.getUsername()) && userRepository.existsByUsername(updateRequest.getUsername())) {
            throw new UserAlreadyExistsException("Username " + updateRequest.getUsername() + " already taken.");
        }
        if (!existingUser.getEmail().equals(updateRequest.getEmail()) && userRepository.existsByEmail(updateRequest.getEmail())) {
            throw new UserAlreadyExistsException("Email " + updateRequest.getEmail() + " already registered.");
        }

        existingUser.setUsername(updateRequest.getUsername());
        existingUser.setEmail(updateRequest.getEmail());
        // Only update password if provided and different
        if (updateRequest.getPassword() != null && !updateRequest.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(updateRequest.getPassword()));
        }

        return userRepository.save(existingUser);
    }

    @CacheEvict(value = "users", allEntries = true)
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    @Cacheable(value = "users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
```