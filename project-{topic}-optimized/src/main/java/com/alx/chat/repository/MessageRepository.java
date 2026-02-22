```java
package com.alx.chat.repository;

import com.alx.chat.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByRoomIdOrderBySentAtAsc(Long roomId, Pageable pageable);
    Long countByRoomId(Long roomId);
}
```