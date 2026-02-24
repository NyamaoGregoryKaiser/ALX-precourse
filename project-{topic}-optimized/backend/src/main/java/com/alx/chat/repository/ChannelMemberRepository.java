```java
package com.alx.chat.repository;

import com.alx.chat.entity.ChannelMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

/**
 * Repository for managing {@link ChannelMember} entities.
 */
@Repository
public interface ChannelMemberRepository extends JpaRepository<ChannelMember, Long> {
    /**
     * Finds a channel membership by user ID and channel ID.
     * @param userId The ID of the user.
     * @param channelId The ID of the channel.
     * @return An Optional containing the ChannelMember if found.
     */
    Optional<ChannelMember> findByUserIdAndChannelId(Long userId, Long channelId);

    /**
     * Finds all members of a specific channel.
     * @param channelId The ID of the channel.
     * @return A Set of ChannelMember entities for the given channel.
     */
    Set<ChannelMember> findByChannelId(Long channelId);

    /**
     * Checks if a user is a member of a specific channel.
     * @param userId The ID of the user.
     * @param channelId The ID of the channel.
     * @return True if the user is a member, false otherwise.
     */
    boolean existsByUserIdAndChannelId(Long userId, Long channelId);
}
```