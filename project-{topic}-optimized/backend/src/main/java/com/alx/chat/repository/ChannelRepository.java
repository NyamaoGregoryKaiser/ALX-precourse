```java
package com.alx.chat.repository;

import com.alx.chat.entity.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for managing {@link Channel} entities.
 */
@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {
    /**
     * Finds a channel by its name.
     * @param name The name of the channel.
     * @return An Optional containing the Channel if found.
     */
    Optional<Channel> findByName(String name);
}
```