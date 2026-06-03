```java
package com.alx.vizflow.util;

import com.alx.vizflow.exception.SecurityException;
import com.alx.vizflow.model.User;
import com.alx.vizflow.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Utility class to access current authenticated user details.
 * This component needs to be injected or retrieved from application context
 * if used outside of Spring-managed beans where @AuthenticationPrincipal isn't available.
 */
@Component
public class SecurityUtil {

    private static UserRepository userRepository;

    public SecurityUtil(UserRepository userRepository) {
        SecurityUtil.userRepository = userRepository;
    }

    public static User getCurrentAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String username;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new SecurityException("Authenticated user not found in database: " + username));
    }
}
```