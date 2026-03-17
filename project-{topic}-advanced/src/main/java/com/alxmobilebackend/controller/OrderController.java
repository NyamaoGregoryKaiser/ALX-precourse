```java
package com.alxmobilebackend.controller;

import com.alxmobilebackend.dto.OrderDto;
import com.alxmobilebackend.service.OrderService;
import com.alxmobilebackend.util.Constants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(Constants.ORDERS_PATH)
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Order Management", description = "API for managing user orders")
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "Create a new order", description = "Requires USER or ADMIN role")
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<OrderDto.OrderResponse> createOrder(@Valid @RequestBody OrderDto.OrderCreateRequest request) {
        OrderDto.OrderResponse order = orderService.createOrder(request);
        return new ResponseEntity<>(order, HttpStatus.CREATED);
    }

    @Operation(summary = "Get order by ID", description = "Requires ADMIN or owner role")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @orderSecurityService.isOrderOwner(#id)")
    public ResponseEntity<OrderDto.OrderResponse> getOrderById(@PathVariable Long id) {
        OrderDto.OrderResponse order = orderService.getOrderById(id);
        return ResponseEntity.ok(order);
    }

    @Operation(summary = "Get all orders with pagination", description = "Requires ADMIN role")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<OrderDto.OrderResponse>> getAllOrders(Pageable pageable) {
        Page<OrderDto.OrderResponse> orders = orderService.getAllOrders(pageable);
        return ResponseEntity.ok(orders);
    }

    @Operation(summary = "Get all orders for a specific user with pagination", description = "Requires ADMIN or owner role")
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.isOwner(#userId)")
    public ResponseEntity<Page<OrderDto.OrderResponse>> getUserOrders(@PathVariable Long userId, Pageable pageable) {
        Page<OrderDto.OrderResponse> orders = orderService.getUserOrders(userId, pageable);
        return ResponseEntity.ok(orders);
    }

    @Operation(summary = "Update order status by ID", description = "Requires ADMIN role")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrderDto.OrderResponse> updateOrderStatus(@PathVariable Long id,
                                                                    @Valid @RequestBody OrderDto.OrderUpdateRequest request) {
        OrderDto.OrderResponse updatedOrder = orderService.updateOrderStatus(id, request);
        return ResponseEntity.ok(updatedOrder);
    }

    @Operation(summary = "Delete an order by ID", description = "Requires ADMIN or owner role (if order is pending)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @orderSecurityService.isOrderOwner(#id)")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
    }
}

// Custom Security Service for Order ownership check
@Service("orderSecurityService")
class OrderSecurityService {
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public OrderSecurityService(OrderRepository orderRepository, UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    public boolean isOrderOwner(Long orderId) {
        String authenticatedUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(authenticatedUserEmail)
                .flatMap(user -> orderRepository.findById(orderId)
                        .map(order -> order.getUser().getId().equals(user.getId())))
                .orElse(false);
    }
}
```

---

### 2. Database Layer (PostgreSQL with Flyway)

This section defines the database schema and provides migration/seed scripts.