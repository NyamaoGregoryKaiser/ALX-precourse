```java
package com.alx.chat.dto.chat;

import com.alx.chat.dto.user.UserDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {
    private Long id;
    private UserDto sender;
    private Long roomId;
    private String content;
    private LocalDateTime timestamp;
}
```