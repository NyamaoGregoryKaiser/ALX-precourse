```java
package com.alx.pm.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Request DTO for user login")
public class LoginRequest {
    @NotBlank(message = "Username cannot be empty")
    @Schema(description = "User's username", example = "user")
    private String username;

    @NotBlank(message = "Password cannot be empty")
    @Size(min = 6, message = "Password must be at least 6 characters long")
    @Schema(description = "User's password", example = "password")
    private String password;
}
```