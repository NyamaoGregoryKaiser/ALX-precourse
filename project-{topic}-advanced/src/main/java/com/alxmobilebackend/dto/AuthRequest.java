```java
package com.alxmobilebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import static com.alxmobilebackend.util.Constants.NOT_BLANK_MESSAGE;

@Data
public class AuthRequest {
    @NotBlank(message = NOT_BLANK_MESSAGE)
    private String usernameOrEmail;

    @NotBlank(message = NOT_BLANK_MESSAGE)
    private String password;
}
```