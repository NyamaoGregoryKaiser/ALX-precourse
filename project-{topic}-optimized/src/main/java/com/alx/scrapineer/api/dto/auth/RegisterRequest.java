```java
package com.alx.scrapineer.api.dto.auth;

import com.alx.scrapineer.data.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "Username cannot be empty")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Password cannot be empty")
    @Size(min = 6, max = 100, message = "Password must be at least 6 characters long")
    private String password;

    private Set<Role> roles;
}
```