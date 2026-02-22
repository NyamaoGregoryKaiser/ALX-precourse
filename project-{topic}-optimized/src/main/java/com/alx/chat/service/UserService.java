```java
package com.alx.chat.service;

import com.alx.chat.dto.UserDTO;
import com.alx.chat.entity.User;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Cacheable(value = "users", key = "#id")
    @Transactional(readOnly = true)
    public UserDTO getUserById(Long id) {
        log.debug("Fetching user with ID: {} from DB", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        return UserDTO.fromEntity(user);
    }

    @Cacheable(value = "users", key = "#username")
    @Transactional(readOnly = true)
    public UserDTO getUserByUsername(String username) {
        log.debug("Fetching user with username: {} from DB", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return UserDTO.fromEntity(user);
    }

    @Cacheable(value = "users", key = "'allUsers'")
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        log.debug("Fetching all users from DB");
        return userRepository.findAll().stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @CacheEvict(value = "users", key = "#id")
    @Transactional
    public UserDTO updateUser(Long id, UserDTO userDTO) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        existingUser.setEmail(userDTO.getEmail());
        existingUser.setUsername(userDTO.getUsername());
        // Password update should be handled separately for security
        // Roles update should be restricted to ADMIN
        // existingUser.setRoles(userDTO.getRoles()); // Example: If admin can update roles

        User updatedUser = userRepository.save(existingUser);
        log.info("User with ID: {} updated successfully.", id);
        return UserDTO.fromEntity(updatedUser);
    }

    @CacheEvict(value = "users", allEntries = true) // Evict all user related cache entries
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with ID: " + id);
        }
        userRepository.deleteById(id);
        log.info("User with ID: {} deleted successfully.", id);
    }

    @Transactional
    public void updateLastLogin(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
    }
}
```