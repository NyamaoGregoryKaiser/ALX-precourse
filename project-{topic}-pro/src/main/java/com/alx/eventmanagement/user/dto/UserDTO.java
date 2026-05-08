```java
package com.alx.eventmanagement.user.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
public class UserDTO {
    private UUID id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private Set<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```