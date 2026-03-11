package com.alx.ecommerce.order.dto;

import com.alx.ecommerce.user.dto.UserDTO;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {
    private Long id;
    private Long userId;
    private String username;
    private List<OrderItemDTO> orderItems;
    private BigDecimal totalAmount;

    @NotBlank(message = "Shipping address is required")
    @Size(max = 255, message = "Shipping address too long")
    private String shippingAddress;

    private String orderStatus;
    private LocalDateTime orderDate;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemDTO {
        private Long id;
        private Long productId;
        private String productName;
        private String productImageUrl;
        private Integer quantity;
        private BigDecimal priceAtPurchase;
        private BigDecimal itemTotal;
    }
}