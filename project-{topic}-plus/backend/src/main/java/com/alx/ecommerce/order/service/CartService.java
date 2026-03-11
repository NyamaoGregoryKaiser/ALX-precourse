package com.alx.ecommerce.order.service;

import com.alx.ecommerce.common.exceptions.ResourceNotFoundException;
import com.alx.ecommerce.order.dto.AddToCartRequest;
import com.alx.ecommerce.order.dto.CartDTO;
import com.alx.ecommerce.order.model.Cart;
import com.alx.ecommerce.order.model.CartItem;
import com.alx.ecommerce.order.repository.CartItemRepository;
import com.alx.ecommerce.order.repository.CartRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private static final Logger logger = LoggerFactory.getLogger(CartService.class);
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public CartDTO addToCart(Long userId, AddToCartRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", request.getProductId()));

        if (product.getStockQuantity() < request.getQuantity()) {
            throw new IllegalArgumentException("Not enough stock for product: " + product.getName() + ". Available: " + product.getStockQuantity());
        }

        Cart cart = cartRepository.findByUser(user).orElseGet(() -> {
            Cart newCart = Cart.builder().user(user).build();
            return cartRepository.save(newCart);
        });

        Optional<CartItem> existingCartItem = cartItemRepository.findByCartAndProduct(cart, product);

        if (existingCartItem.isPresent()) {
            CartItem item = existingCartItem.get();
            item.setQuantity(item.getQuantity() + request.getQuantity());
            // Update price in case product price changed since last addition
            item.setPriceAtTimeOfAddition(product.getPrice());
            cartItemRepository.save(item);
            logger.info("Updated quantity for product {} in cart {} for user {}", product.getName(), cart.getId(), userId);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .quantity(request.getQuantity())
                    .priceAtTimeOfAddition(product.getPrice())
                    .build();
            cart.getCartItems().add(newItem); // Add to the cart's item list
            cartItemRepository.save(newItem);
            logger.info("Added product {} to cart {} for user {}", product.getName(), cart.getId(), userId);
        }

        return getCartByUserId(userId);
    }

    public CartDTO getCartByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Cart cart = cartRepository.findByUser(user)
                .orElse(null); // Return null if cart doesn't exist yet for the user

        if (cart == null) {
            return CartDTO.builder()
                    .userId(userId)
                    .cartItems(List.of())
                    .totalAmount(BigDecimal.ZERO)
                    .build();
        }
        return convertToDto(cart);
    }

    @Transactional
    public CartDTO updateCartItemQuantity(Long userId, Long productId, Integer quantity) {
        if (quantity <= 0) {
            return removeCartItem(userId, productId);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", "user id", userId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        CartItem cartItem = cartItemRepository.findByCartAndProduct(cart, product)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", "product id", productId));

        if (product.getStockQuantity() < quantity) {
            throw new IllegalArgumentException("Not enough stock for product: " + product.getName() + ". Available: " + product.getStockQuantity());
        }

        cartItem.setQuantity(quantity);
        cartItemRepository.save(cartItem);
        logger.info("Updated quantity of product {} in cart {} to {}", product.getName(), cart.getId(), quantity);
        return convertToDto(cart);
    }

    @Transactional
    public CartDTO removeCartItem(Long userId, Long productId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", "user id", userId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        CartItem cartItem = cartItemRepository.findByCartAndProduct(cart, product)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", "product id", productId));

        cart.getCartItems().remove(cartItem); // Remove from collection to ensure orphanRemoval works
        cartItemRepository.delete(cartItem);
        logger.info("Removed product {} from cart {} for user {}", product.getName(), cart.getId(), userId);
        return convertToDto(cart);
    }

    @Transactional
    public void clearCart(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", "user id", userId));

        cartItemRepository.deleteAll(cart.getCartItems()); // Delete all items associated with this cart
        cart.getCartItems().clear(); // Clear the collection
        logger.info("Cleared cart {} for user {}", cart.getId(), userId);
    }

    private CartDTO convertToDto(Cart cart) {
        List<CartDTO.CartItemDTO> itemDTOs = cart.getCartItems().stream()
                .map(item -> CartDTO.CartItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productImageUrl(item.getProduct().getImageUrl())
                        .quantity(item.getQuantity())
                        .priceAtTimeOfAddition(item.getPriceAtTimeOfAddition())
                        .itemTotal(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        BigDecimal totalAmount = itemDTOs.stream()
                .map(CartDTO.CartItemDTO::getItemTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartDTO.builder()
                .id(cart.getId())
                .userId(cart.getUser().getId())
                .cartItems(itemDTOs)
                .totalAmount(totalAmount)
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .build();
    }
}