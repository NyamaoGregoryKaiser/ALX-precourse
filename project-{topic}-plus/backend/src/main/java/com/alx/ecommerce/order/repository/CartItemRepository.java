package com.alx.ecommerce.order.repository;

import com.alx.ecommerce.order.model.Cart;
import com.alx.ecommerce.order.model.CartItem;
import com.alx.ecommerce.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    Optional<CartItem> findByCartAndProduct(Cart cart, Product product);
    void deleteByCartAndProduct(Cart cart, Product product);
}