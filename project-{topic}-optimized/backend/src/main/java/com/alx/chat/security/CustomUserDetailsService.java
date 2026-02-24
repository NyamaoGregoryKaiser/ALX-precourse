```java
package com.alx.chat.security;

import com.alx.chat.entity.User;
import com.alx.chat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Custom implementation of Spring Security's UserDetailsService.
 * Loads user-specific data during authentication.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Locates the user based on the username. In the current implementation, it fetches the user
     * from the database. The result is cached for improved performance.
     * @param username The username identifying the user whose data is required.
     * @return A UserDetails object that Spring Security uses for authentication and authorization.
     * @throws UsernameNotFoundException if the user could not be found or has no granted authorities.
     */
    @Override
    @Cacheable(value = "userCache", key = "#username") // Cache user details for a given username
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        // The User entity itself implements UserDetails, so we can return it directly.
        return user;
    }
}
```