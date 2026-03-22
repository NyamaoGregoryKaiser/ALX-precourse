```java
package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.OrderDTOs;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.mapper.OrderMapper;
import com.alx.ecommerce.model.Order;
import com.alx.ecommerce.model.OrderItem;
import com.alx.ecommerce.model.Product;
import com.alx.ecommerce.model.User;
import com.alx.ecommerce.repository.OrderRepository;
import com.alx.ecommerce.repository.ProductRepository;
import com.alx.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductService productService; // To update stock
    private final OrderMapper orderMapper;

    @Transactional
    @CacheEvict(value = {"orders", "userOrders"}, allEntries = true)
    public OrderDTOs.OrderResponse createOrder(UUID userId, OrderDTOs.CreateOrderRequest request) {
        log.info("Creating order for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Order order = Order.builder()
                .user(user)
                .orderDate(LocalDateTime.now())
                .status(Order.OrderStatus.PENDING)
                .shippingAddress(request.getShippingAddress())
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (OrderDTOs.CreateOrderItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", itemRequest.getProductId()));

            if (product.getStockQuantity() < itemRequest.getQuantity()) {
                throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
            }

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .priceAtPurchase(product.getPrice()) // Capture price at the time of purchase
                    .build();
            order.addOrderItem(orderItem);

            totalAmount = totalAmount.add(product.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity())));

            // Decrease product stock
            productService.updateProductStock(product.getId(), -itemRequest.getQuantity());
        }

        order.setTotalAmount(totalAmount);
        Order savedOrder = orderRepository.save(order);
        log.info("Order created successfully with ID: {}", savedOrder.getId());
        return orderMapper.toOrderResponse(savedOrder);
    }

    @Cacheable(value = "orders", key = "#orderId")
    @PreAuthorize("hasAuthority('ADMIN') or @orderService.isOrderOwner(#orderId, authentication.principal.id)")
    public OrderDTOs.OrderResponse getOrderById(UUID orderId) {
        log.debug("Fetching order by ID: {}", orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        return orderMapper.toOrderResponse(order);
    }

    @Cacheable(value = "userOrders", key = "#userId")
    @PreAuthorize("hasAuthority('ADMIN') or #userId == authentication.principal.id")
    public List<OrderDTOs.OrderResponse> getOrdersByUserId(UUID userId) {
        log.debug("Fetching orders for user ID: {}", userId);
        List<Order> orders = orderRepository.findByUserId(userId);
        return orders.stream()
                .map(orderMapper::toOrderResponse)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "ordersByStatus", key = "#status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public List<OrderDTOs.OrderResponse> getOrdersByStatus(Order.OrderStatus status) {
        log.debug("Fetching orders by status: {}", status);
        List<Order> orders = orderRepository.findByStatus(status);
        return orders.stream()
                .map(orderMapper::toOrderResponse)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "allOrders")
    @PreAuthorize("hasAuthority('ADMIN')")
    public List<OrderDTOs.OrderResponse> getAllOrders() {
        log.debug("Fetching all orders.");
        return orderRepository.findAll().stream()
                .map(orderMapper::toOrderResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = {"orders", "userOrders", "ordersByStatus", "allOrders"}, allEntries = true)
    @PreAuthorize("hasAuthority('ADMIN')") // Only admin can update order status
    public OrderDTOs.OrderResponse updateOrderStatus(UUID orderId, OrderDTOs.UpdateOrderStatusRequest request) {
        log.info("Updating status for order ID: {} to {}", orderId, request.getStatus());
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (order.getStatus().equals(request.getStatus())) {
            log.warn("Order {} already has status {}. No update performed.", orderId, request.getStatus());
            return orderMapper.toOrderResponse(order);
        }

        // Logic for handling status transitions (e.g., cannot go from DELIVERED to PENDING)
        // For simplicity, direct update is done here.
        Order.OrderStatus oldStatus = order.getStatus();
        order.setStatus(request.getStatus());

        // Handle inventory adjustments if order is cancelled
        if (request.getStatus() == Order.OrderStatus.CANCELLED && oldStatus != Order.OrderStatus.CANCELLED) {
            log.info("Order {} cancelled. Re-stocking items.", orderId);
            order.getOrderItems().forEach(item ->
                productService.updateProductStock(item.getProduct().getId(), item.getQuantity())
            );
        }

        Order updatedOrder = orderRepository.save(order);
        log.info("Order {} status updated from {} to {}.", orderId, oldStatus, updatedOrder.getStatus());
        return orderMapper.toOrderResponse(updatedOrder);
    }

    @Transactional
    @CacheEvict(value = {"orders", "userOrders", "ordersByStatus", "allOrders"}, allEntries = true)
    @PreAuthorize("hasAuthority('ADMIN') or @orderService.isOrderOwner(#orderId, authentication.principal.id)") // Allow owner to delete their own pending orders (e.g. within a short window)
    public void deleteOrder(UUID orderId) {
        log.info("Deleting order with ID: {}", orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Add logic to prevent deleting orders that are already processed/shipped
        if (order.getStatus() != Order.OrderStatus.PENDING && order.getStatus() != Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot delete order with status " + order.getStatus() + ". Only PENDING or CANCELLED orders can be deleted.");
        }

        // If a pending order is deleted, put items back in stock
        if (order.getStatus() == Order.OrderStatus.PENDING) {
            log.info("Pending order {} deleted. Re-stocking items.", orderId);
            order.getOrderItems().forEach(item ->
                    productService.updateProductStock(item.getProduct().getId(), item.getQuantity())
            );
        }

        orderRepository.delete(order);
        log.info("Order with ID {} deleted successfully.", orderId);
    }

    /**
     * Helper method for @PreAuthorize to check if the authenticated user is the owner of the order.
     * Needs to be public for Spring Security expression language to access it.
     */
    public boolean isOrderOwner(UUID orderId, UUID userId) {
        return orderRepository.findById(orderId)
                .map(order -> order.getUser().getId().equals(userId))
                .orElse(false);
    }
}
```