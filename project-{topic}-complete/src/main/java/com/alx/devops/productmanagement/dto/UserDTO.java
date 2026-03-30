```java
package com.alx.devops.productmanagement.dto;

import com.alx.devops.productmanagement.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UserDTO {
    private Long id;
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters long")
    private String password; // This should be handled carefully in a real app, typically not returned
    private Role role; // Role is usually assigned by admin, not chosen by user in registration DTO
}
```