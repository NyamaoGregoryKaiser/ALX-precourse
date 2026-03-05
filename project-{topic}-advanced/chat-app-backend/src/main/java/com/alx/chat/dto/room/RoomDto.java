```java
package com.alx.chat.dto.room;

import com.alx.chat.dto.user.UserDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoomDto {
    private Long id;
    private String name;
    private String description;
    private UserDto creator;
    private LocalDateTime createdAt;
    private Set<UserDto> members;
}
```