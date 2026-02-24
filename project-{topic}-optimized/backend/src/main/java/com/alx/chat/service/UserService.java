```java
package com.alx.chat.service;

import com.alx.chat.dto.UserDto;
import com.alx.chat.entity.User;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.repository.UserRepository;
import com.alx.chat.util.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing user profiles.
 * Handles retrieving user details.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /**
     * Retrieves a user's profile by their username.
     * @param username The username of the user.
     * @return UserDto containing the user's details.
     * @throws ResourceNotFoundException if the user is not found.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "userProfile", key = "#username") // Cache user profile details
    public UserDto getUserByUsername(String username) {
        log.debug("Fetching user profile for username: {}", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return userMapper.toDto(user);
    }
}
```