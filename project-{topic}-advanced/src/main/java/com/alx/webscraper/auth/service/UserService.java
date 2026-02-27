```java
package com.alx.webscraper.auth.service;

import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Service to load user-specific data during authentication.
 * Implements Spring Security's UserDetailsService.
 */
@Service
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Locates the user based on the username. In the actual implementation, the search
     * may be case-sensitive, or case-insensitive depending on how the
     * implementation instance is configured. In this case, it is sensitive.
     *
     * @param username the username identifying the user whose data is required.
     * @return a fully populated user record (Spring Security's UserDetails).
     * @throws UsernameNotFoundException if the user could not be found or has no granted authorities.
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
    }
}
```