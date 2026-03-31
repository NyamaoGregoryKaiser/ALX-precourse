```java
package com.ml_utils_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO for transferring user information, excluding sensitive data like passwords.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private Set<String> roles; // Set of role names (e.g., "ROLE_USER", "ROLE_ADMIN")
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```