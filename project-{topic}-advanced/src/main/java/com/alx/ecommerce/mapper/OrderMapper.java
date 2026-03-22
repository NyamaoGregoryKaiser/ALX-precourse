```java
package com.alx.ecommerce.mapper;

import com.alx.ecommerce.dto.OrderDTOs;
import com.alx.ecommerce.model.Order;
import com.alx.ecommerce.model.OrderItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(target = "orderItems", expression = "java(toOrderItemResponseList(order.getOrderItems()))")
    OrderDTOs.OrderResponse toOrderResponse(Order order);

    @Mapping(source = "product.id", target = "productId")
    @Mapping(source = "product.name", target = "productName")
    OrderDTOs.OrderItemResponse toOrderItemResponse(OrderItem orderItem);

    List<OrderDTOs.OrderItemResponse> toOrderItemResponseList(java.util.Set<OrderItem> orderItems);
}
```