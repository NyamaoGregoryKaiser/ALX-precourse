package com.alx.taskmanager.security;

import com.alx.taskmanager.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("userSecurity") // Bean name for @PreAuthorize
@RequiredArgsConstructor
public class UserSecurity {

    private final UserService userService;

    public boolean isOwner(Long userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        UserDetailsImpl currentUser = (UserDetailsImpl) authentication.getPrincipal();
        return currentUser.getId().equals(userId);
    }
}