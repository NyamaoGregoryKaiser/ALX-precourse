```java
package com.alx.chat.repository;

import com.alx.chat.entity.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByName(String name);
    boolean existsByName(String name);

    // Find rooms that a user is a member of
    @Query("SELECT r FROM Room r JOIN r.members m WHERE m.id = :userId")
    Page<Room> findByMemberId(@Param("userId") Long userId, Pageable pageable);
}
```