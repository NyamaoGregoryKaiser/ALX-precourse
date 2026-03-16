package com.alx.taskmgr.dto.user;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO for returning user details, excluding sensitive information like password.
 */
@Data
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}