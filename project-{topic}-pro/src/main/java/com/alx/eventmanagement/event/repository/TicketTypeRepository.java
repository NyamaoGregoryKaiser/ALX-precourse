```java
package com.alx.eventmanagement.event.repository;

import com.alx.eventmanagement.event.model.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketTypeRepository extends JpaRepository<TicketType, UUID> {
    List<TicketType> findByEventId(UUID eventId);
    Optional<TicketType> findByIdAndEventId(UUID ticketTypeId, UUID eventId);
}
```