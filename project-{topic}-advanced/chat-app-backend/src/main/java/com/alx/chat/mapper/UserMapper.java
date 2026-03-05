```java
package com.alx.chat.mapper;

import com.alx.chat.dto.user.UserDto;
import com.alx.chat.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    @Mapping(target = "password", ignore = true) // Never map password to DTO
    UserDto toDto(User user);

    User toEntity(UserDto userDto);
}
```