```java
package com.alx.chat.repository;

import com.alx.chat.entity.ChatRoom;
import com.alx.chat.entity.RoomMember;
import com.alx.chat.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, RoomMember.RoomMemberId> {
    Optional<RoomMember> findByUserAndChatRoom(User user, ChatRoom chatRoom);
    List<RoomMember> findByChatRoom(ChatRoom chatRoom);
    boolean existsByUserAndChatRoom(User user, ChatRoom chatRoom);
}
```