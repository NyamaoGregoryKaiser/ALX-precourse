```java
package com.alx.chat.util;

import com.alx.chat.dto.ChannelDto;
import com.alx.chat.entity.Channel;
import com.alx.chat.entity.ChannelMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * MapStruct mapper for converting between Channel entity and ChannelDto.
 */
@Mapper(componentModel = "spring", uses = {UserMapper.class}) // uses UserMapper for nested User conversion
public interface ChannelMapper {

    @Mapping(source = "creator.username", target = "creatorUsername")
    @Mapping(source = "members", target = "members", qualifiedByName = "mapMembersToUsernames")
    ChannelDto toDto(Channel channel);

    @Named("mapMembersToUsernames")
    default Set<String> mapMembersToUsernames(Set<ChannelMember> members) {
        if (members == null) {
            return null;
        }
        return members.stream()
                .map(channelMember -> channelMember.getUser().getUsername())
                .collect(Collectors.toSet());
    }
}
```