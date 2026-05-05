package com.alxchat.dto;

import com.alxchat.model.ChatRoom;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomDTO {
    private Long id;
    private String name;
    private UserDTO creator;
    private LocalDateTime createdAt;
    private List<UserDTO> participants;
    private int participantCount;

    public static ChatRoomDTO fromEntity(ChatRoom room) {
        return ChatRoomDTO.builder()
                .id(room.getId())
                .name(room.getName())
                .creator(UserDTO.fromEntity(room.getCreator()))
                .createdAt(room.getCreatedAt())
                .participantCount(room.getParticipants() != null ? room.getParticipants().size() : 0)
                .build();
    }

    public static ChatRoomDTO fromEntityWithParticipants(ChatRoom room) {
        return ChatRoomDTO.builder()
                .id(room.getId())
                .name(room.getName())
                .creator(UserDTO.fromEntity(room.getCreator()))
                .createdAt(room.getCreatedAt())
                .participants(room.getParticipants().stream()
                        .map(rp -> UserDTO.fromEntity(rp.getUser()))
                        .collect(Collectors.toList()))
                .participantCount(room.getParticipants().size())
                .build();
    }
}