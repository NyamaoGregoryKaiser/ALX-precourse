```java
package com.alxmobilebackend.service;

import com.alxmobilebackend.dto.OrderDto;
import com.alxmobilebackend.exception.ResourceNotFoundException;
import com.alxmobilebackend.exception.ValidationException;
import com.alxmobilebackend.model.Order;
import com.alxmobilebackend.model.OrderItem;
import com.alxmobilebackend.model.Product;
import com.alxmobilebackend.model.User;
import com.alxmobilebackend.repository.OrderRepository;
import com.alxmobilebackend.repository.ProductRepository;
import com.alxmobilebackend.repository.UserRepository;
import com.alxmobilebackend.util.Constants;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional
    public OrderDto.OrderResponse createOrder(OrderDto.OrderCreateRequest request) {
        // Get authenticated user
        String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new java.util.ArrayList<>();

        for (OrderDto.OrderItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemRequest.getProductId()));

            if (product.getStockQuantity() < itemRequest.getQuantity()) {
                throw new ValidationException("Insufficient stock for product: " + product.getName());
            }

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(product.getPrice()) // Capture price at the time of order
                    .build();
            orderItems.add(orderItem);

            totalAmount = totalAmount.add(product.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity())));

            // Reduce stock
            product.setStockQuantity(product.getStockQuantity() - itemRequest.getQuantity());
            productRepository.save(product); // Update product stock
        }

        Order order = Order.builder()
                .user(user)
                .totalAmount(totalAmount)
                .status(Order.OrderStatus.PENDING)
                .items(orderItems)
                .build();

        orderItems.forEach(item -> item.setOrder(order)); // Link items back to order

        Order savedOrder = orderRepository.save(order);
        return mapToOrderResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = Constants.CACHE_ORDERS, key = "#id", unless = "#result == null")
    public OrderDto.OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        // Authorization check: Only admin or the order owner can view the order
        String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User authenticatedUser = userRepository.findByEmail(userEmail).orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));
        boolean isAdmin = authenticatedUser.getRoles().stream().anyMatch(role -> role.equals(com.alxmobilebackend.model.Role.ROLE_ADMIN));

        if (!isAdmin && !Objects.equals(order.getUser().getId(), authenticatedUser.getId())) {
            throw new AccessDeniedException("You are not authorized to view this order.");
        }

        return mapToOrderResponse(order);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = Constants.CACHE_ORDERS, unless = "#result.empty")
    public Page<OrderDto.OrderResponse> getAllOrders(Pageable pageable) {
        // Only admin can view all orders
        String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User authenticatedUser = userRepository.findByEmail(userEmail).orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));
        boolean isAdmin = authenticatedUser.getRoles().stream().anyMatch(role -> role.equals(com.alxmobilebackend.model.Role.ROLE_ADMIN));

        if (!isAdmin) {
            throw new AccessDeniedException("You are not authorized to view all orders.");
        }

        return orderRepository.findAll(pageable)
                .map(this::mapToOrderResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderDto.OrderResponse> getUserOrders(Long userId, Pageable pageable) {
        // Authorization check: User can only view their own orders unless they are an admin
        String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User authenticatedUser = userRepository.findByEmail(userEmail).orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));
        boolean isAdmin = authenticatedUser.getRoles().stream().anyMatch(role -> role.equals(com.alxmobilebackend.model.Role.ROLE_ADMIN));

        if (!isAdmin && !Objects.equals(userId, authenticatedUser.getId())) {
            throw new AccessDeniedException("You are not authorized to view orders for this user.");
        }

        return orderRepository.findByUserId(userId, pageable)
                .map(this::mapToOrderResponse);
    }

    @Transactional
    @CachePut(value = Constants.CACHE_ORDERS, key = "#id")
    public OrderDto.OrderResponse updateOrderStatus(Long id, OrderDto.OrderUpdateRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        // Authorization check: Only admin can update order status
        String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User authenticatedUser = userRepository.findByEmail(userEmail).orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));
        boolean isAdmin = authenticatedUser.getRoles().stream().anyMatch(role -> role.equals(com.alxmobilebackend.model.Role.ROLE_ADMIN));

        if (!isAdmin) {
            throw new AccessDeniedException("You are not authorized to update order status.");
        }

        if (request.getStatus() != null) {
            order.setStatus(request.getStatus());
        }

        Order updatedOrder = orderRepository.save(order);
        return mapToOrderResponse(updatedOrder);
    }

    @Transactional
    @CacheEvict(value = Constants.CACHE_ORDERS, key = "#id")
    public void deleteOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        // Authorization check: Only admin or the order owner can delete the order (if pending)
        String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User authenticatedUser = userRepository.findByEmail(userEmail).orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));
        boolean isAdmin = authenticatedUser.getRoles().stream().anyMatch(role -> role.equals(com.alxmobilebackend.model.Role.ROLE_ADMIN));

        if (!isAdmin && !Objects.equals(order.getUser().getId(), authenticatedUser.getId())) {
            throw new AccessDeniedException("You are not authorized to delete this order.");
        }

        // Only allow deletion if order is pending to prevent issues with shipped/delivered orders
        if (order.getStatus() != Order.OrderStatus.PENDING && !isAdmin) {
            throw new ValidationException("Cannot delete order with status " + order.getStatus() + ". Only pending orders can be deleted by users.");
        }

        // Restore stock for items
        order.getItems().forEach(item -> {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            productRepository.save(product);
        });

        orderRepository.deleteById(id);
    }

    private OrderDto.OrderResponse mapToOrderResponse(Order order) {
        List<OrderDto.OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> OrderDto.OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .build())
                .collect(Collectors.toList());

        return OrderDto.OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .username(order.getUser().getUsername())
                .orderDate(order.getOrderDate())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .items(itemResponses)
                .build();
    }
}
```

#### Controllers (API Endpoints)