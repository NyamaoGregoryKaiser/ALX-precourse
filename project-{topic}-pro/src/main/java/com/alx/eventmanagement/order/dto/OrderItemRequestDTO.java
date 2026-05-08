```java
package com.alx.eventmanagement.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class OrderItemRequestDTO {
    @NotNull(message = "Ticket Type ID cannot be null")
    private UUID ticketTypeId;

    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;
}
```