```java
package com.alx.chat.util;

import com.alx.chat.dto.MessageDto;
import com.alx.chat.entity.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * MapStruct mapper for converting between Message entity and MessageDto.
 */
@Mapper(componentModel = "spring")
public interface MessageMapper {

    @Mapping(source = "channel.id", target = "channelId")
    @Mapping(source = "sender.username", target = "senderUsername")
    MessageDto toDto(Message message);

    // No need for toEntity for this use case, as messages are created from DTOs
    // and sender/channel are looked up separately in service layer.
}
```