```java
package com.alx.pm.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response containing the JWT token after successful authentication")
public class JwtResponse {
    @Schema(description = "JWT token for authentication", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String token;

    @Schema(description = "Type of token", example = "Bearer")
    private String type = "Bearer";

    public JwtResponse(String token) {
        this.token = token;
    }
}
```