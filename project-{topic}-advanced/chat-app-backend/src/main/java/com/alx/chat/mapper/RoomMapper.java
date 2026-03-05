```java
package com.alx.chat.mapper;

import com.alx.chat.dto.room.RoomDto;
import com.alx.chat.entity.Room;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.Set;

@Mapper(componentModel = "spring", uses = {UserMapper.class}, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RoomMapper {

    @Mapping(target = "creator", source = "creator")
    @Mapping(target = "members", source = "members")
    RoomDto toDto(Room room);

    Set<RoomDto> toDto(Set<Room> rooms);
}
```