package com.alx.taskmgr.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for user login requests.
 */
@Data
public class LoginRequest {
    @NotBlank(message = "Username cannot be empty")
    private String username;

    @NotBlank(message = "Password cannot be empty")
    private String password;
}