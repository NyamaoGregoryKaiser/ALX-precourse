```java
package com.alx.eventmanagement.order.repository;

import com.alx.eventmanagement.order.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    // Custom query methods can be added here if needed
}
```