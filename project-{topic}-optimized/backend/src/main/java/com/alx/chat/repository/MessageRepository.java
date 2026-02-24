```java
package com.alx.chat.repository;

import com.alx.chat.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for managing {@link Message} entities.
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    /**
     * Finds all messages within a specific channel, ordered by timestamp.
     * @param channelId The ID of the channel.
     * @return A list of Message entities.
     */
    List<Message> findByChannelIdOrderByTimestampAsc(Long channelId);
}
```