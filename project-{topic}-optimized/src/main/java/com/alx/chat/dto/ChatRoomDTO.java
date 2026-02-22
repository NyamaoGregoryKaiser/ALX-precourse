```java
package com.alx.chat.dto;

import com.alx.chat.entity.ChatRoom;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomDTO {
    private Long id;

    @NotBlank(message = "Room name is required")
    @Size(min = 3, max = 100, message = "Room name must be between 3 and 100 characters")
    private String name;

    @NotNull(message = "Room type is required")
    private ChatRoom.ChatRoomType type;

    private UserDTO creator;
    private LocalDateTime createdAt;
    private Set<UserDTO> members;
    private Integer memberCount; // For quick display

    public static ChatRoomDTO fromEntity(ChatRoom chatRoom) {
        ChatRoomDTO dto = new ChatRoomDTO();
        dto.setId(chatRoom.getId());
        dto.setName(chatRoom.getName());
        dto.setType(chatRoom.getType());
        dto.setCreatedAt(chatRoom.getCreatedAt());
        if (chatRoom.getCreator() != null) {
            dto.setCreator(UserDTO.fromEntity(chatRoom.getCreator()));
        }
        if (chatRoom.getMembers() != null) {
            dto.setMembers(chatRoom.getMembers().stream()
                    .map(roomMember -> UserDTO.fromEntity(roomMember.getUser()))
                    .collect(Collectors.toSet()));
            dto.setMemberCount(chatRoom.getMembers().size());
        } else {
            dto.setMemberCount(0);
        }
        return dto;
    }
}
```