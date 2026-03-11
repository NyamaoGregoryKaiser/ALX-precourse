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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;
    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CartService cartService;

    private User user;
    private Product product1;
    private Product product2;
    private Cart cart;
    private CartItem cartItem1;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).username("testuser").email("test@example.com").password("pass").build();
        product1 = Product.builder().id(101L).name("Laptop").sku("LAP001").price(new BigDecimal("1200.00")).stockQuantity(10).build();
        product2 = Product.builder().id(102L).name("Mouse").sku("MOU001").price(new BigDecimal("25.00")).stockQuantity(20).build();

        cart = Cart.builder().id(1L).user(user).cartItems(new ArrayList<>()).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        cartItem1 = CartItem.builder().id(1L).cart(cart).product(product1).quantity(2).priceAtTimeOfAddition(product1.getPrice()).build();
        cart.getCartItems().add(cartItem1);
    }

    @Test
    @DisplayName("Should add a new item to an empty cart")
    void addToCart_NewCartAndItem_Success() {
        AddToCartRequest request = new AddToCartRequest(product2.getId(), 1);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product2.getId())).thenReturn(Optional.of(product2));
        when(cartRepository.findByUser(user)).thenReturn(Optional.empty()); // No cart exists
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> {
            Cart newCart = invocation.getArgument(0);
            newCart.setId(2L);
            return newCart;
        });
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> {
            CartItem savedItem = invocation.getArgument(0);
            savedItem.setId(2L);
            return savedItem;
        });

        CartDTO result = cartService.addToCart(user.getId(), request);

        assertNotNull(result);
        assertEquals(1, result.getCartItems().size());
        assertEquals(product2.getId(), result.getCartItems().get(0).getProductId());
        assertEquals(1, result.getCartItems().get(0).getQuantity());
        verify(cartRepository, times(1)).save(any(Cart.class)); // A new cart was created
        verify(cartItemRepository, times(1)).save(any(CartItem.class));
    }

    @Test
    @DisplayName("Should increase quantity of an existing item in cart")
    void addToCart_ExistingItem_IncreaseQuantity() {
        AddToCartRequest request = new AddToCartRequest(product1.getId(), 1);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product1.getId())).thenReturn(Optional.of(product1));
        when(cartRepository.findByUser(user)).thenReturn(Optional.of(cart)); // Cart already exists
        when(cartItemRepository.findByCartAndProduct(cart, product1)).thenReturn(Optional.of(cartItem1));
        when(cartItemRepository.save(any(CartItem.class))).thenReturn(cartItem1);

        CartDTO result = cartService.addToCart(user.getId(), request);

        assertNotNull(result);
        assertEquals(1, result.getCartItems().size()); // Still 1 unique item
        assertEquals(3, result.getCartItems().get(0).getQuantity()); // Quantity increased from 2 to 3
        verify(cartRepository, never()).save(any(Cart.class)); // No new cart created
        verify(cartItemRepository, times(1)).save(any(CartItem.class));
    }

    @Test
    @DisplayName("Should add a new item to an existing cart")
    void addToCart_ExistingCartNewItem_Success() {
        AddToCartRequest request = new AddToCartRequest(product2.getId(), 1);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product2.getId())).thenReturn(Optional.of(product2));
        when(cartRepository.findByUser(user)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartAndProduct(cart, product2)).thenReturn(Optional.empty()); // New item
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> {
            CartItem newItem = invocation.getArgument(0);
            newItem.setId(2L);
            cart.getCartItems().add(newItem); // Simulate adding to cart's items
            return newItem;
        });

        CartDTO result = cartService.addToCart(user.getId(), request);

        assertNotNull(result);
        assertEquals(2, result.getCartItems().size()); // Now 2 items
        assertTrue(result.getCartItems().stream().anyMatch(item -> item.getProductId().equals(product2.getId())));
        verify(cartRepository, never()).save(any(Cart.class));
        verify(cartItemRepository, times(1)).save(any(CartItem.class));
    }

    @Test
    @DisplayName("Should throw exception if not enough stock")
    void addToCart_NotEnoughStock_ThrowsException() {
        AddToCartRequest request = new AddToCartRequest(product1.getId(), 15); // Request more than available
        product1.setStockQuantity(10); // Ensure stock is set
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product1.getId())).thenReturn(Optional.of(product1));

        assertThrows(IllegalArgumentException.class, () -> cartService.addToCart(user.getId(), request));
        verify(cartRepository, never()).save(any(Cart.class));
        verify(cartItemRepository, never()).save(any(CartItem.class));
    }

    @Test
    @DisplayName("Should retrieve cart for existing user")
    void getCartByUserId_ExistingCart_Success() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(cartRepository.findByUser(user)).thenReturn(Optional.of(cart));

        CartDTO result = cartService.getCartByUserId(user.getId());

        assertNotNull(result);
        assertEquals(user.getId(), result.getUserId());
        assertEquals(1, result.getCartItems().size());
        assertEquals(cartItem1.getTotalPrice(), result.getTotalAmount());
    }

    @Test
    @DisplayName("Should return empty cart DTO for user without a cart")
    void getCartByUserId_NoCartForUser_ReturnsEmptyCartDTO() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(cartRepository.findByUser(user)).thenReturn(Optional.empty());

        CartDTO result = cartService.getCartByUserId(user.getId());

        assertNotNull(result);
        assertEquals(user.getId(), result.getUserId());
        assertTrue(result.getCartItems().isEmpty());
        assertEquals(BigDecimal.ZERO, result.getTotalAmount());
    }

    @Test
    @DisplayName("Should update quantity of existing cart item")
    void updateCartItemQuantity_Success() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(cartRepository.findByUser(user)).thenReturn(Optional.of(cart));
        when(productRepository.findById(product1.getId())).thenReturn(Optional.of(product1));
        when(cartItemRepository.findByCartAndProduct(cart, product1)).thenReturn(Optional.of(cartItem1));
        when(cartItemRepository.save(any(CartItem.class))).thenReturn(cartItem1); // return the modified item

        CartDTO result = cartService.updateCartItemQuantity(user.getId(), product1.getId(), 5);

        assertNotNull(result);
        assertEquals(5, result.getCartItems().get(0).getQuantity());
        verify(cartItemRepository, times(1)).save(cartItem1);
    }

    @Test
    @DisplayName("Should remove cart item if quantity is 0 or less")
    void updateCartItemQuantity_ZeroQuantity_RemovesItem() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(cartRepository.findByUser(user)).thenReturn(Optional.of(cart));
        when(productRepository.findById(product1.getId())).thenReturn(Optional.of(product1));
        when(cartItemRepository.findByCartAndProduct(cart, product1)).thenReturn(Optional.of(cartItem1));
        doNothing().when(cartItemRepository).delete(cartItem1);

        CartDTO result = cartService.updateCartItemQuantity(user.getId(), product1.getId(), 0);

        assertNotNull(result);
        assertTrue(result.getCartItems().isEmpty());
        verify(cartItemRepository, times(1)).delete(cartItem1);
    }

    @Test
    @DisplayName("Should remove an item from cart")
    void removeCartItem_Success() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(cartRepository.findByUser(user)).thenReturn(Optional.of(cart));
        when(productRepository.findById(product1.getId())).thenReturn(Optional.of(product1));
        when(cartItemRepository.findByCartAndProduct(cart, product1)).thenReturn(Optional.of(cartItem1));
        doNothing().when(cartItemRepository).delete(cartItem1);

        CartDTO result = cartService.removeCartItem(user.getId(), product1.getId());

        assertNotNull(result);
        assertTrue(result.getCartItems().isEmpty());
        verify(cartItemRepository, times(1)).delete(cartItem1);
        assertFalse(cart.getCartItems().contains(cartItem1)); // Verify item removed from cart's list
    }

    @Test
    @DisplayName("Should clear all items from the cart")
    void clearCart_Success() {
        CartItem cartItem2 = CartItem.builder().id(2L).cart(cart).product(product2).quantity(1).priceAtTimeOfAddition(product2.getPrice()).build();
        cart.getCartItems().add(cartItem2);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(cartRepository.findByUser(user)).thenReturn(Optional.of(cart));
        doNothing().when(cartItemRepository).deleteAll(anyList());

        cartService.clearCart(user.getId());

        assertTrue(cart.getCartItems().isEmpty()); // Verify cart's item list is empty
        verify(cartItemRepository, times(1)).deleteAll(anyList());
    }
}