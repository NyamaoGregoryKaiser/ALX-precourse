package com.alx.ecommerce.order.service;

import com.alx.ecommerce.common.exceptions.ResourceNotFoundException;
import com.alx.ecommerce.order.dto.OrderDTO;
import com.alx.ecommerce.order.model.Cart;
import com.alx.ecommerce.order.model.CartItem;
import com.alx.ecommerce.order.model.Order;
import com.alx.ecommerce.order.model.OrderItem;
import com.alx.ecommerce.order.repository.CartRepository;
import com.alx.ecommerce.order.repository.OrderRepository;
import com.alx.ecommerce.product.model.Product;
import com.alx.ecommerce.product.repository.ProductRepository;
import com.alx.ecommerce.user.model.User;
import com.alx.ecommerce.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final CartService cartService; // To clear cart after order

    @Transactional
    public OrderDTO placeOrder(Long userId, String shippingAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", "user id", userId));

        if (cart.getCartItems().isEmpty()) {
            throw new IllegalArgumentException("Cannot place order with an empty cart.");
        }

        // Validate stock and prepare order items
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CartItem cartItem : cart.getCartItems()) {
            Product product = cartItem.getProduct();
            if (product.getStockQuantity() < cartItem.getQuantity()) {
                throw new IllegalArgumentException("Not enough stock for product: " + product.getName() + ". Available: " + product.getStockQuantity());
            }

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(cartItem.getQuantity())
                    .priceAtPurchase(cartItem.getPriceAtTimeOfAddition()) // Capture price at time of purchase
                    .build();
            orderItems.add(orderItem);
            totalAmount = totalAmount.add(orderItem.getTotalPrice());

            // Reduce product stock
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            productRepository.save(product); // Save updated product stock
        }

        Order order = Order.builder()
                .user(user)
                .totalAmount(totalAmount)
                .shippingAddress(shippingAddress)
                .orderStatus("PENDING") // Initial status
                .build();

        orderItems.forEach(item -> item.setOrder(order)); // Link order items to the new order
        order.setOrderItems(orderItems);

        Order savedOrder = orderRepository.save(order);

        // Clear the user's cart after placing the order
        cartService.clearCart(userId);
        logger.info("Order placed successfully for user {}. Order ID: {}", userId, savedOrder.getId());

        return convertToDto(savedOrder);
    }

    public List<OrderDTO> getUserOrders(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<Order> orders = orderRepository.findByUserOrderByOrderDateDesc(user);
        return orders.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public OrderDTO getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        return convertToDto(order);
    }

    @Transactional
    public OrderDTO updateOrderStatus(Long orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Basic validation for status (can be enhanced with enum or state machine)
        if (!isValidStatus(newStatus)) {
            throw new IllegalArgumentException("Invalid order status: " + newStatus);
        }

        order.setOrderStatus(newStatus);
        Order updatedOrder = orderRepository.save(order);
        logger.info("Order {} status updated to {}", orderId, newStatus);
        return convertToDto(updatedOrder);
    }

    private boolean isValidStatus(String status) {
        return List.of("PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED").contains(status.toUpperCase());
    }

    private OrderDTO convertToDto(Order order) {
        List<OrderDTO.OrderItemDTO> itemDTOs = order.getOrderItems().stream()
                .map(item -> OrderDTO.OrderItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productImageUrl(item.getProduct().getImageUrl())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .itemTotal(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return OrderDTO.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .username(order.getUser().getUsername())
                .orderItems(itemDTOs)
                .totalAmount(order.getTotalAmount())
                .shippingAddress(order.getShippingAddress())
                .orderStatus(order.getOrderStatus())
                .orderDate(order.getOrderDate())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}