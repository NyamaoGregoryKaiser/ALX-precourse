package com.alxchat.service;

import com.alxchat.exception.ResourceNotFoundException;
import com.alxchat.exception.ValidationException;
import com.alxchat.model.User;
import com.alxchat.model.UserStatus;
import com.alxchat.repository.UserRepository;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
    }

    @Transactional
    public User registerNewUser(String username, String password) {
        if (userRepository.existsByUsername(username)) {
            throw new ValidationException("Username already exists: " + username);
        }

        User newUser = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .status(UserStatus.OFFLINE)
                .build();
        User savedUser = userRepository.save(newUser);
        log.info("Registered new user: {}", savedUser.getUsername());
        return savedUser;
    }

    @Cacheable(value = "users", key = "#userId")
    public User getUserById(Long userId) {
        log.info("Fetching user by ID: {} from DB", userId);
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
    }

    @Cacheable(value = "users", key = "#username")
    public User getUserByUsername(String username) {
        log.info("Fetching user by username: {} from DB", username);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    @Transactional
    @CachePut(value = "users", key = "#user.id") // Update cache after status change
    @CacheEvict(value = "users", key = "#user.username") // Invalidate username cache, re-fetched if needed
    public User updateUserStatus(Long userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
        user.setStatus(status);
        log.info("User {} status updated to {}", user.getUsername(), status);
        return userRepository.save(user);
    }
}