package com.alx.taskmgr.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Utility class to access current authenticated user information from the SecurityContext.
 * This utilizes a ThreadLocal to store the current user's ID, which should be set by
 * the JwtAuthFilter after successful authentication. This prevents N+1 database calls
 * in service layers to fetch the user ID from the username.
 */
public class UserContext {

    // ThreadLocal to store the current authenticated user's ID for the duration of a request.
    private static final ThreadLocal<Long> currentUserId = new ThreadLocal<>();

    /**
     * Sets the ID of the current authenticated user in the ThreadLocal.
     * This method should be called by the authentication filter (e.g., JwtAuthFilter)
     * at the beginning of a secured request.
     * @param userId The ID of the authenticated user.
     */
    public static void setCurrentUserId(Long userId) {
        currentUserId.set(userId);
    }

    /**
     * Retrieves the username of the currently authenticated user from Spring Security's context.
     * @return The username, or null if no user is authenticated.
     */
    public static String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        } else {
            return principal.toString(); // For non-UserDetails principals (less common with JWT)
        }
    }

    /**
     * Retrieves the ID of the currently authenticated user from the ThreadLocal.
     * This is the preferred way to get the user ID in service methods as it avoids
     * repetitive database lookups.
     * @return The ID of the authenticated user.
     * @throws IllegalStateException if no user ID is found in the context (i.e., not authenticated or context not set).
     */
    public static Long getCurrentUserId() {
        Long userId = currentUserId.get();
        if (userId == null) {
            // This should not happen if JwtAuthFilter is correctly setting the ID for authenticated requests.
            throw new IllegalStateException("User ID not found in UserContext. Ensure the request is authenticated and context is properly set.");
        }
        return userId;
    }

    /**
     * Clears the user ID from the ThreadLocal.
     * This method should be called by the authentication filter after the request
     * has been processed to prevent memory leaks and ensure isolation between requests.
     */
    public static void clear() {
        currentUserId.remove();
    }
}