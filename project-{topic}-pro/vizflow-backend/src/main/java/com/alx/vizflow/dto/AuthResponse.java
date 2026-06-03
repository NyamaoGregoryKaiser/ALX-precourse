```java
package com.alx.vizflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String jwt;
    private String username;
    private String role; // Example role, can be a list
}
```