```java
package com.alx.eventmanagement.order.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class OrderItemDTO {
    private UUID id;
    private UUID ticketTypeId;
    private String ticketTypeName;
    private Integer quantity;
    private BigDecimal unitPrice;
}
```