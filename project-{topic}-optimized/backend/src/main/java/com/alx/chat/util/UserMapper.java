```java
package com.alx.chat.util;

import com.alx.chat.dto.UserDto;
import com.alx.chat.entity.User;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper for converting between User entity and UserDto.
 */
@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
    User toEntity(UserDto userDto);
}
```