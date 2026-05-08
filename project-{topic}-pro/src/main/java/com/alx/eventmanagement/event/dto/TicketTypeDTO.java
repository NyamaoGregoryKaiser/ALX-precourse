```java
package com.alx.eventmanagement.event.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class TicketTypeDTO {
    private UUID id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer totalQuantity;
    private Integer availableQuantity;
    private UUID eventId;
}
```