```java
package com.alx.chat.mapper;

import com.alx.chat.dto.chat.ChatMessage;
import com.alx.chat.entity.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", uses = {UserMapper.class}, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface MessageMapper {

    @Mapping(target = "sender", source = "sender")
    @Mapping(target = "roomId", source = "room.id")
    ChatMessage toDto(Message message);

    Message toEntity(ChatMessage chatMessage);
}
```