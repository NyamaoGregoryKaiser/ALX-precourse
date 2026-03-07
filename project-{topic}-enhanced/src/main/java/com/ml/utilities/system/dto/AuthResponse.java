```java
package com.ml.utilities.system.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Response object for authentication, containing JWT token and message")
public class AuthResponse {
    @Schema(description = "JWT authentication token", example = "eyJhbGciOiJIUzUxMiJ9...")
    private String token;
    @Schema(description = "Message indicating success or failure", example = "Authentication successful")
    private String message;
}
```