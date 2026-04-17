package com.alx.ecommerce.dto.user;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO for returning user details.
 */
@Data
public class UserResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String username;
    private String email;
    private String address;
    private String phoneNumber;
    private Set<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}