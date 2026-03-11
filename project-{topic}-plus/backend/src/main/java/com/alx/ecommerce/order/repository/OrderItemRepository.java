package com.alx.ecommerce.order.repository;

import com.alx.ecommerce.order.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    // Additional query methods if needed
}