```java
package com.alx.chat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "room_members")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(RoomMember.RoomMemberId.class)
public class RoomMember {
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom chatRoom;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "is_admin", nullable = false)
    private boolean isAdmin;

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
    }

    // Composite primary key class
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomMemberId implements Serializable {
        private Long user;
        private Long chatRoom;
    }
}
```