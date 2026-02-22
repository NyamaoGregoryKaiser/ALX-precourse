```java
package com.alx.chat.dto;

import com.alx.chat.entity.Message;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageDTO {
    private Long id;
    private Long roomId;
    private UserDTO sender;

    @NotBlank(message = "Message content cannot be empty")
    @Size(max = 1000, message = "Message content cannot exceed 1000 characters")
    private String content;

    private LocalDateTime sentAt;

    public static MessageDTO fromEntity(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setRoomId(message.getRoom().getId());
        dto.setSender(UserDTO.fromEntity(message.getSender()));
        dto.setContent(message.getContent());
        dto.setSentAt(message.getSentAt());
        return dto;
    }
}
```