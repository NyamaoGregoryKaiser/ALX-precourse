```java
package com.alx.eventmanagement.order.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OrderDTO {
    private UUID id;
    private UUID userId;
    private LocalDateTime orderDate;
    private BigDecimal totalAmount;
    private String status;
    private List<OrderItemDTO> items;
}
```