```java
package com.ml_utils_system.service;

import com.ml_utils_system.model.User;
import com.ml_utils_system.repository.UserRepository;
import com.ml_utils_system.util.CustomLogger;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Custom implementation of Spring Security's {@link UserDetailsService}.
 * Loads user-specific data during authentication.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger logger = CustomLogger.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    /**
     * Locates the user based on the username.
     *
     * @param username The username identifying the user whose data is required.
     * @return A fully populated user record (a {@link UserDetails} instance).
     * @throws UsernameNotFoundException If the user could not be found or has no granted authorities.
     */
    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        logger.debug("Attempting to load user by username: {}", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    logger.warn("User not found with username: {}", username);
                    return new UsernameNotFoundException("User Not Found with username: " + username);
                });
        logger.debug("User {} loaded successfully.", username);
        return user; // Our User model implements UserDetails directly
    }
}
```