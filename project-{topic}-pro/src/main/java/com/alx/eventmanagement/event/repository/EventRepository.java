```java
package com.alx.eventmanagement.event.repository;

import com.alx.eventmanagement.event.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findByOrganizerId(UUID organizerId);

    @Query("SELECT e FROM Event e WHERE " +
            "(:categoryId IS NULL OR e.category.id = :categoryId) AND " +
            "(:location IS NULL OR LOWER(e.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
            "(e.startTime >= :currentTime) " +
            "ORDER BY e.startTime ASC")
    List<Event> findUpcomingEvents(Long categoryId, String location, LocalDateTime currentTime);

    // Custom query to find events with available tickets
    List<Event> findByAvailableTicketsGreaterThan(Integer minAvailableTickets);
}
```