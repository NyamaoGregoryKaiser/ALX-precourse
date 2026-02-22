```java
package com.alx.chat.repository;

import com.alx.chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    Optional<ChatRoom> findByName(String name);
    boolean existsByName(String name);

    @Query("SELECT cr FROM ChatRoom cr JOIN cr.members rm WHERE rm.user.id = :userId")
    List<ChatRoom> findByUserId(Long userId);
}
```