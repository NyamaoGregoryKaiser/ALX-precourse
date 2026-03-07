```java
package com.ml.utilities.system.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Request object for user authentication")
public class AuthRequest {
    @NotBlank(message = "Username cannot be empty")
    @Schema(description = "User's username", example = "testuser")
    private String username;

    @NotBlank(message = "Password cannot be empty")
    @Schema(description = "User's password", example = "password")
    private String password;
}
```