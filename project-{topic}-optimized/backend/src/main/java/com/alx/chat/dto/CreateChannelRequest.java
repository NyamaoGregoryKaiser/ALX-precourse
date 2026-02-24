```java
package com.alx.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating a new channel.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateChannelRequest {
    @NotBlank(message = "Channel name cannot be blank")
    @Size(min = 3, max = 100, message = "Channel name must be between 3 and 100 characters")
    private String name;
}
```