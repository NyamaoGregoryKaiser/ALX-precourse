```java
package com.alx.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * JPA Entity representing a membership in a chat channel.
 * This acts as a join table for the many-to-many relationship between User and Channel.
 */
@Entity
@Table(name = "channel_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "channel_id"}) // Ensures a user can only be a member once per channel
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }
}
```